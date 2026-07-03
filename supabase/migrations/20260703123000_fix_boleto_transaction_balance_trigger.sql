-- ========================================================
-- MIGRATION: Fix account balance updates for boleto payments
-- ========================================================
-- Pix/dinheiro sales usually create an already-paid transaction, so an
-- INSERT-only balance trigger appears to work. Boleto installments are
-- created as pending transactions and later settled/reverted via UPDATE.
-- This migration guarantees the account balance trigger handles INSERT,
-- UPDATE and DELETE, runs as SECURITY DEFINER, and recalculates existing
-- balances from the transaction/transfer ledger.
-- ========================================================

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
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.is_paid, false)
       AND OLD.account_id IS NOT NULL
       AND COALESCE(OLD.type, '') NOT IN ('Transferencia', U&'Transfer\00EAncia') THEN
      IF OLD.type = 'Entrada' THEN
        v_old_delta := -OLD.amount;
      ELSIF OLD.type = 'Saida' THEN
        v_old_delta := OLD.amount;
      END IF;

      UPDATE public.accounts
      SET current_balance = COALESCE(current_balance, 0) + v_old_delta
      WHERE id = OLD.account_id;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_paid, false)
       AND NEW.account_id IS NOT NULL
       AND COALESCE(NEW.type, '') NOT IN ('Transferencia', U&'Transfer\00EAncia') THEN
      IF NEW.type = 'Entrada' THEN
        v_new_delta := NEW.amount;
      ELSIF NEW.type = 'Saida' THEN
        v_new_delta := -NEW.amount;
      END IF;

      UPDATE public.accounts
      SET current_balance = COALESCE(current_balance, 0) + v_new_delta
      WHERE id = NEW.account_id;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_paid, false)
       AND OLD.account_id IS NOT NULL
       AND COALESCE(OLD.type, '') NOT IN ('Transferencia', U&'Transfer\00EAncia') THEN
      IF OLD.type = 'Entrada' THEN
        v_old_delta := -OLD.amount;
      ELSIF OLD.type = 'Saida' THEN
        v_old_delta := OLD.amount;
      END IF;

      UPDATE public.accounts
      SET current_balance = COALESCE(current_balance, 0) + v_old_delta
      WHERE id = OLD.account_id;
    END IF;

    IF COALESCE(NEW.is_paid, false)
       AND NEW.account_id IS NOT NULL
       AND COALESCE(NEW.type, '') NOT IN ('Transferencia', U&'Transfer\00EAncia') THEN
      IF NEW.type = 'Entrada' THEN
        v_new_delta := NEW.amount;
      ELSIF NEW.type = 'Saida' THEN
        v_new_delta := -NEW.amount;
      END IF;

      UPDATE public.accounts
      SET current_balance = COALESCE(current_balance, 0) + v_new_delta
      WHERE id = NEW.account_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;

CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'ensure_single_main_account_trigger'
      AND tgrelid = 'public.accounts'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.accounts DISABLE TRIGGER ensure_single_main_account_trigger';
  END IF;
END;
$$;

UPDATE public.accounts a
SET current_balance = COALESCE(a.initial_balance, 0)
  + COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.account_id = a.id
        AND t.type = 'Entrada'
        AND t.is_paid = true
    ), 0)
  - COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.account_id = a.id
        AND t.type = 'Saida'
        AND t.is_paid = true
    ), 0)
  + COALESCE((
      SELECT SUM(tr.amount)
      FROM public.transfers tr
      WHERE tr.to_account_id = a.id
    ), 0)
  - COALESCE((
      SELECT SUM(tr.amount)
      FROM public.transfers tr
      WHERE tr.from_account_id = a.id
    ), 0);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'ensure_single_main_account_trigger'
      AND tgrelid = 'public.accounts'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.accounts ENABLE TRIGGER ensure_single_main_account_trigger';
  END IF;
END;
$$;
