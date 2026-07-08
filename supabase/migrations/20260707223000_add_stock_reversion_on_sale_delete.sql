-- ================================================================
-- Reverte estoque associado a uma venda ao excluí-la ou ao
-- excluir a vaga de espaço vinculada a ela.
-- ================================================================

-- 1. Modificar soft_delete_sale para reverter estoque antes de deletar
CREATE OR REPLACE FUNCTION public.soft_delete_sale(p_sale_id INTEGER, p_reason TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id BIGINT;
  v_movement RECORD;
  v_reason_like TEXT;
  v_sale RECORD;
BEGIN
  -- Verificar se já foi removida
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND OR v_sale.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  v_company_id := v_sale.company_id;
  v_reason_like := 'Consumo automático - Venda #' || p_sale_id || '%';

  -- Procurar movimentos de estoque ligados a essa venda e reverter
  FOR v_movement IN (
    SELECT material_id, SUM(quantity) as total_qty, movement_type
    FROM public.stock_movements
    WHERE company_id = v_company_id 
      AND (reason LIKE v_reason_like)
      AND movement_type IN ('Saida', 'open_roll_use')
      AND quantity > 0
    GROUP BY material_id, movement_type
  ) LOOP
    IF v_movement.movement_type = 'open_roll_use' THEN
      -- Reverter open roll (bobina aberta)
      UPDATE public.materials
      SET open_roll_accumulated = GREATEST(0, COALESCE(open_roll_accumulated, 0) - v_movement.total_qty)
      WHERE id = v_movement.material_id;

      -- Inserir log de estorno
      INSERT INTO public.stock_movements 
        (material_id, movement_type, quantity, reason, user_id, company_id)
      VALUES 
        (v_movement.material_id, 'Estorno', v_movement.total_qty, 'Estorno de Exclusão - Venda #' || p_sale_id, auth.uid(), v_company_id);

    ELSIF v_movement.movement_type = 'Saida' THEN
      -- Reverter closed/physical rolls através da RPC existente
      PERFORM public.reverse_material_roll_consumption(
        v_movement.material_id, 
        v_movement.total_qty, 
        'venda', 
        'Estorno de Exclusão - Venda #' || p_sale_id, 
        auth.uid(), 
        v_company_id
      );
    END IF;
  END LOOP;

  -- Finalmente, mandar pra lixeira
  UPDATE public.sales
  SET deleted_at = NOW(), deleted_by = auth.uid(), deleted_reason = p_reason
  WHERE id = p_sale_id;
END;
$$;

-- 2. Modificar soft_delete_space para excluir junto a venda
CREATE OR REPLACE FUNCTION public.soft_delete_space(p_space_id INTEGER, p_reason TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id INTEGER;
BEGIN
  SELECT sale_id INTO v_sale_id FROM public.spaces WHERE id = p_space_id AND deleted_at IS NULL;
  
  -- Se tiver venda associada, chama a exclusão da venda (isso garante a devolução de estoque)
  IF v_sale_id IS NOT NULL THEN
    PERFORM public.soft_delete_sale(v_sale_id, p_reason || ' (Vaga de Espaço Excluída)');
  END IF;

  UPDATE public.spaces
  SET deleted_at = NOW(), deleted_by = auth.uid(), deleted_reason = p_reason
  WHERE id = p_space_id AND deleted_at IS NULL;
END;
$$;

-- 3. Modificar permanently_delete_sale para garantir devolução do estoque se não tiver sido devolvido
CREATE OR REPLACE FUNCTION public.permanently_delete_sale(p_sale_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN 
    RETURN; 
  END IF;

  -- Se ela não foi enviada para lixeira antes, forçar devolução do estoque
  IF v_sale.deleted_at IS NULL THEN
    PERFORM public.soft_delete_sale(p_sale_id, 'Exclusão definitiva direta');
  END IF;

  -- Limpar vínculos associados
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

-- 4. Modificar permanently_delete_space para apagar junto a venda associada
CREATE OR REPLACE FUNCTION public.permanently_delete_space(p_space_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id INTEGER;
BEGIN
  SELECT sale_id INTO v_sale_id FROM public.spaces WHERE id = p_space_id;
  
  -- Se tiver venda associada, apagar as 2 juntas
  IF v_sale_id IS NOT NULL THEN
    PERFORM public.permanently_delete_sale(v_sale_id);
  END IF;

  -- Deleta perdas de material vinculadas a essa vaga
  DELETE FROM public.material_losses WHERE space_id = p_space_id;
  
  -- Exclui a vaga fisicamente
  DELETE FROM public.spaces WHERE id = p_space_id;
END;
$$;
