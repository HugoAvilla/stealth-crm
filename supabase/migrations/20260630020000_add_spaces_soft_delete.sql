-- ================================================================
-- EXECUTAR NO SUPABASE DASHBOARD → SQL EDITOR OU VIA CLI
-- Adiciona suporte a soft delete na tabela spaces (Lixeira do Espaço)
-- ================================================================

-- 1. Adicionar colunas de soft delete na tabela spaces
ALTER TABLE public.spaces 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT DEFAULT NULL;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_spaces_deleted_at ON public.spaces (deleted_at);

-- 3. RPC: soft_delete_space (Enviar para lixeira)
CREATE OR REPLACE FUNCTION public.soft_delete_space(p_space_id INTEGER, p_reason TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.spaces
  SET deleted_at = NOW(), deleted_by = auth.uid(), deleted_reason = p_reason
  WHERE id = p_space_id AND deleted_at IS NULL;
END;
$$;

-- 4. RPC: restore_space (Restaurar da lixeira)
CREATE OR REPLACE FUNCTION public.restore_space(p_space_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.spaces
  SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL
  WHERE id = p_space_id AND deleted_at IS NOT NULL;
END;
$$;

-- 5. RPC: permanently_delete_space (Exclusão definitiva)
CREATE OR REPLACE FUNCTION public.permanently_delete_space(p_space_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleta perdas de material vinculadas a essa vaga
  DELETE FROM public.material_losses WHERE space_id = p_space_id;
  
  -- Exclui a vaga fisicamente
  DELETE FROM public.spaces WHERE id = p_space_id;
END;
$$;
