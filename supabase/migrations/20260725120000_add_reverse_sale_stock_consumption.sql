-- ================================================================
-- Estorna o consumo de estoque de uma venda.
-- Usado ao EDITAR uma venda: reverte o consumo anterior (bobinas
-- fechadas, rolo aberto e materiais simples) antes de reconsumir com
-- os novos itens, evitando baixa em dobro no estoque.
--
-- Espelha a mesma reversão já usada em soft_delete_sale (exclusão),
-- e MARCA os movimentos de consumo já revertidos com o prefixo
-- 'ESTORNADO: ' para que não sejam estornados novamente em edições
-- ou exclusões futuras da mesma venda.
-- ================================================================
CREATE OR REPLACE FUNCTION public.reverse_sale_stock_consumption(
  p_sale_id INTEGER,
  p_reason_note TEXT DEFAULT 'Estorno de Edição'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id BIGINT;
  v_movement RECORD;
  v_reason_like TEXT;
BEGIN
  SELECT company_id INTO v_company_id FROM public.sales WHERE id = p_sale_id;
  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  v_reason_like := 'Consumo automático - Venda #' || p_sale_id || '%';

  -- Reverter apenas os consumos "vivos" (ainda não estornados) desta venda
  FOR v_movement IN (
    SELECT material_id, SUM(quantity) AS total_qty, movement_type
    FROM public.stock_movements
    WHERE company_id = v_company_id
      AND reason LIKE v_reason_like
      AND movement_type IN ('Saida', 'open_roll_use')
      AND quantity > 0
    GROUP BY material_id, movement_type
  ) LOOP
    IF v_movement.movement_type = 'open_roll_use' THEN
      -- Reverter rolo aberto (bobina aberta)
      UPDATE public.materials
      SET open_roll_accumulated = GREATEST(0, COALESCE(open_roll_accumulated, 0) - v_movement.total_qty)
      WHERE id = v_movement.material_id;

      INSERT INTO public.stock_movements
        (material_id, movement_type, quantity, reason, user_id, company_id)
      VALUES
        (v_movement.material_id, 'Estorno', v_movement.total_qty,
         p_reason_note || ' - Venda #' || p_sale_id, auth.uid(), v_company_id);

    ELSIF v_movement.movement_type = 'Saida' THEN
      -- Reverter bobinas físicas / materiais simples via RPC existente
      PERFORM public.reverse_material_roll_consumption(
        v_movement.material_id,
        v_movement.total_qty,
        'venda',
        p_reason_note || ' - Venda #' || p_sale_id,
        auth.uid(),
        v_company_id
      );
    END IF;
  END LOOP;

  -- Marcar os movimentos de consumo já revertidos para não estornar 2x
  UPDATE public.stock_movements
  SET reason = 'ESTORNADO: ' || reason
  WHERE company_id = v_company_id
    AND reason LIKE v_reason_like
    AND movement_type IN ('Saida', 'open_roll_use')
    AND quantity > 0;
END;
$$;
