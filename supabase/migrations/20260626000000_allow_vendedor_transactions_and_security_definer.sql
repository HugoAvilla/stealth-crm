-- ==============================================
-- Correção de Segurança e RLS no Fluxo Financeiro
-- ==============================================

-- 1. Alterar a função do trigger para SECURITY DEFINER.
-- Isso garante que, independentemente da RLS de accounts, o trigger disparado
-- pela inserção/deleção de transações consiga atualizar o saldo da conta
-- usando os privilégios do criador da função (postgres admin).
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_delta NUMERIC(10,2) := 0;
  v_new_delta NUMERIC(10,2) := 0;
BEGIN
  -- === DELETE ===
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_paid = TRUE AND OLD.account_id IS NOT NULL AND OLD.type != 'Transferencia' THEN
      IF OLD.type = 'Entrada' THEN
        v_old_delta := -OLD.amount;
      ELSIF OLD.type = 'Saida' THEN
        v_old_delta := OLD.amount;
      END IF;
      UPDATE public.accounts
        SET current_balance = current_balance + v_old_delta
        WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  -- === INSERT ===
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_paid = TRUE AND NEW.account_id IS NOT NULL AND NEW.type != 'Transferencia' THEN
      IF NEW.type = 'Entrada' THEN
        v_new_delta := NEW.amount;
      ELSIF NEW.type = 'Saida' THEN
        v_new_delta := -NEW.amount;
      END IF;
      UPDATE public.accounts
        SET current_balance = current_balance + v_new_delta
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  -- === UPDATE ===
  IF TG_OP = 'UPDATE' THEN
    -- Revert old paid balance
    IF OLD.is_paid = TRUE AND OLD.account_id IS NOT NULL AND OLD.type != 'Transferencia' THEN
      IF OLD.type = 'Entrada' THEN
        v_old_delta := -OLD.amount;
      ELSIF OLD.type = 'Saida' THEN
        v_old_delta := OLD.amount;
      END IF;
      UPDATE public.accounts
        SET current_balance = current_balance + v_old_delta
        WHERE id = OLD.account_id;
    END IF;

    -- Apply new paid balance
    IF NEW.is_paid = TRUE AND NEW.account_id IS NOT NULL AND NEW.type != 'Transferencia' THEN
      IF NEW.type = 'Entrada' THEN
        v_new_delta := NEW.amount;
      ELSIF NEW.type = 'Saida' THEN
        v_new_delta := -NEW.amount;
      END IF;
      UPDATE public.accounts
        SET current_balance = current_balance + v_new_delta
        WHERE id = NEW.account_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 2. Permitir que vendedores criem lançamentos de transação da empresa deles
-- (Por exemplo, transações automáticas decorrentes de vendas fechadas)
DROP POLICY IF EXISTS "Vendedor can insert transactions in their company" ON public.transactions;

CREATE POLICY "Vendedor can insert transactions in their company" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  (company_id = get_user_company_id(auth.uid()))
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
);
