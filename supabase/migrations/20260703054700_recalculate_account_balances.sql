-- ========================================================
-- MIGRATION: Recalculate account balances after boleto revert fix
-- Fix: handleRevertPayment was not restoring the original account_id
-- from the boleto when reverting a paid installment, causing stale
-- account_ids on pending transactions. This recalculates all balances
-- from the source of truth (transactions + transfers).
-- ========================================================

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
