-- ================================================================
-- EXECUTAR NO SUPABASE DASHBOARD → SQL EDITOR
-- Corrige: vendas não aparecem no calendário porque a coluna
-- deleted_at não existe, causando erro 42703 na query
-- ================================================================

-- 1. Adicionar colunas de soft delete na tabela sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT DEFAULT NULL;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON public.sales (deleted_at);

-- 3. RPC: soft_delete_sale (Enviar para lixeira)
CREATE OR REPLACE FUNCTION public.soft_delete_sale(p_sale_id INTEGER, p_reason TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sales
  SET deleted_at = NOW(), deleted_by = auth.uid(), deleted_reason = p_reason
  WHERE id = p_sale_id AND deleted_at IS NULL;
END;
$$;

-- 4. RPC: restore_sale (Restaurar da lixeira)
CREATE OR REPLACE FUNCTION public.restore_sale(p_sale_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sales
  SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL
  WHERE id = p_sale_id AND deleted_at IS NOT NULL;
END;
$$;

-- 5. RPC: permanently_delete_sale (Exclusão definitiva)
CREATE OR REPLACE FUNCTION public.permanently_delete_sale(p_sale_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.service_items_detailed WHERE sale_id = p_sale_id;
  DELETE FROM public.sale_items WHERE sale_id = p_sale_id;
  DELETE FROM public.sale_commissions WHERE sale_id = p_sale_id;
  DELETE FROM public.sale_payments WHERE sale_id = p_sale_id;
  DELETE FROM public.boleto_installments 
    WHERE boleto_id IN (SELECT id FROM public.boletos WHERE sale_id = p_sale_id);
  DELETE FROM public.boletos WHERE sale_id = p_sale_id;
  UPDATE public.spaces SET sale_id = NULL WHERE sale_id = p_sale_id;
  DELETE FROM public.transactions WHERE sale_id = p_sale_id;
  DELETE FROM public.sales WHERE id = p_sale_id;
END;
$$;
