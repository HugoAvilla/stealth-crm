-- ========================================================
-- MIGRATION: Allow Vendedor to update and delete transactions/sale_payments
-- AND fix trigger security definer & recalculate balances
-- ========================================================

-- 1. Permitir que vendedores atualizem transações da empresa deles (necessário para liquidar boletos e maquininhas)
DROP POLICY IF EXISTS "Vendedor can update transactions in their company" ON public.transactions;
CREATE POLICY "Vendedor can update transactions in their company" ON public.transactions
FOR UPDATE TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
)
WITH CHECK (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
);

-- 2. Permitir que vendedores deletem transações da empresa deles (necessário para estornar/reverter pagamentos)
DROP POLICY IF EXISTS "Vendedor can delete transactions in their company" ON public.transactions;
CREATE POLICY "Vendedor can delete transactions in their company" ON public.transactions
FOR DELETE TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
);

-- 3. Habilitar RLS e criar políticas para sale_payments
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage sale_payments in their company" ON public.sale_payments;
CREATE POLICY "Admin can manage sale_payments in their company" ON public.sale_payments
FOR ALL TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

DROP POLICY IF EXISTS "Vendedor can manage sale_payments in their company" ON public.sale_payments;
CREATE POLICY "Vendedor can manage sale_payments in their company" ON public.sale_payments
FOR ALL TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
);

-- 4. Habilitar RLS e criar políticas para boletos
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage boletos in their company" ON public.boletos;
CREATE POLICY "Admin can manage boletos in their company" ON public.boletos
FOR ALL TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

DROP POLICY IF EXISTS "Vendedor can manage boletos in their company" ON public.boletos;
CREATE POLICY "Vendedor can manage boletos in their company" ON public.boletos
FOR ALL TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
);

-- 5. Habilitar RLS e criar políticas para boleto_installments
ALTER TABLE public.boleto_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage boleto_installments in their company" ON public.boleto_installments;
CREATE POLICY "Admin can manage boleto_installments in their company" ON public.boleto_installments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.boletos b
    WHERE b.id = boleto_installments.boleto_id
    AND b.company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  )
);

DROP POLICY IF EXISTS "Vendedor can manage boleto_installments in their company" ON public.boleto_installments;
CREATE POLICY "Vendedor can manage boleto_installments in their company" ON public.boleto_installments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.boletos b
    WHERE b.id = boleto_installments.boleto_id
    AND b.company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'VENDEDOR'::app_role)
  )
);

-- 6. Garantir que a função process_transfer execute como SECURITY DEFINER
-- permitindo atualização de saldos independente de permissão direta da RLS de accounts
CREATE OR REPLACE FUNCTION public.process_transfer()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
    UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
    RETURN NEW;
END;
$$;

-- 7. Corrigir a função ensure_single_main_account para evitar atualização recursiva e erros de concorrência
-- (só roda o UPDATE se is_main tiver mudado de falso para verdadeiro)
CREATE OR REPLACE FUNCTION public.ensure_single_main_account()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_main = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_main, false) = false) THEN
        UPDATE public.accounts SET is_main = false WHERE id != NEW.id AND is_main = true;
    END IF;
    RETURN NEW;
END;
$$;

-- 8. Recalcular e corrigir o saldo atual (current_balance) de todas as contas com base no histórico de transações/transferências reais
-- Desabilitamos o gatilho temporariamente durante a atualização em lote para evitar concorrências indesejadas
ALTER TABLE public.accounts DISABLE TRIGGER ensure_single_main_account_trigger;

UPDATE public.accounts a
SET current_balance = COALESCE(a.initial_balance, 0)
  -- Somar Entradas pagas
  + COALESCE((
      SELECT SUM(t.amount) 
      FROM public.transactions t 
      WHERE t.account_id = a.id 
      AND t.type = 'Entrada' 
      AND t.is_paid = true
    ), 0)
  -- Subtrair Saídas pagas
  - COALESCE((
      SELECT SUM(t.amount) 
      FROM public.transactions t 
      WHERE t.account_id = a.id 
      AND t.type = 'Saida' 
      AND t.is_paid = true
    ), 0)
  -- Somar transferências recebidas
  + COALESCE((
      SELECT SUM(tr.amount) 
      FROM public.transfers tr 
      WHERE tr.to_account_id = a.id
    ), 0)
  -- Subtrair transferências enviadas
  - COALESCE((
      SELECT SUM(tr.amount) 
      FROM public.transfers tr 
      WHERE tr.from_account_id = a.id
    ), 0);

ALTER TABLE public.accounts ENABLE TRIGGER ensure_single_main_account_trigger;
