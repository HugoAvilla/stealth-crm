-- ==============================================
-- Batch 0: Correção das Integrações Financeiras
-- ==============================================
-- 1. Adicionar colunas de rastreabilidade em transactions
-- 2. Adicionar transaction_id em boleto_installments
-- 3. Corrigir trigger de saldo para INSERT/UPDATE/DELETE
-- ==============================================

-- 1. Colunas de rastreabilidade em transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS origin_type TEXT,
  ADD COLUMN IF NOT EXISTS origin_id BIGINT,
  ADD COLUMN IF NOT EXISTS sale_payment_id BIGINT REFERENCES public.sale_payments(id);

-- Índice para buscas por origem (idempotência e estornos)
CREATE INDEX IF NOT EXISTS idx_transactions_origin
  ON public.transactions(origin_type, origin_id);

CREATE INDEX IF NOT EXISTS idx_transactions_sale_payment
  ON public.transactions(sale_payment_id);

-- 2. Coluna de vínculo em boleto_installments
ALTER TABLE public.boleto_installments
  ADD COLUMN IF NOT EXISTS transaction_id BIGINT REFERENCES public.transactions(id);

CREATE INDEX IF NOT EXISTS idx_boleto_installments_transaction
  ON public.boleto_installments(transaction_id);

-- ==============================================
-- 3. Trigger de saldo robusto (INSERT/UPDATE/DELETE)
-- ==============================================
-- Lógica:
-- INSERT: se is_paid=true, aplica o delta no saldo
-- UPDATE: reverte o antigo (se era pago) e aplica o novo (se é pago)
-- DELETE: reverte o antigo (se era pago)
-- Transferências (type='Transferencia') são ignoradas pois
-- já são gerenciadas pelo trigger de transfers.
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
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

-- Drop o trigger antigo (era só AFTER INSERT)
DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;

-- Criar novo trigger para INSERT, UPDATE e DELETE
CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();
