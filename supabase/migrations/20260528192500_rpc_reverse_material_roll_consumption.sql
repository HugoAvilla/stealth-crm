-- Função RPC para estornar consumo de bobinas

CREATE OR REPLACE FUNCTION public.reverse_material_roll_consumption(
  p_material_id BIGINT,
  p_meters NUMERIC,
  p_source TEXT,
  p_reason TEXT,
  p_user_id UUID,
  p_company_id BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_remaining_to_return NUMERIC := p_meters;
  v_roll RECORD;
  v_return_this_roll NUMERIC;
  v_new_remaining NUMERIC;
  v_reversed_list JSONB := '[]'::JSONB;
  v_new_roll_id BIGINT;
BEGIN
  IF p_meters <= 0 THEN
    RAISE EXCEPTION 'Meters to reverse must be > 0';
  END IF;

  -- 1. Devolver metros priorizando esgotadas mais recentes, depois abertas
  FOR v_roll IN (
    SELECT * FROM public.material_rolls
    WHERE material_id = p_material_id 
      AND company_id = p_company_id
      AND status IN ('esgotada', 'aberta')
    ORDER BY 
      CASE status WHEN 'esgotada' THEN 0 WHEN 'aberta' THEN 1 ELSE 2 END,
      exhausted_at DESC NULLS LAST,
      opened_at DESC NULLS LAST,
      created_at DESC
    FOR UPDATE
  ) LOOP
    IF v_remaining_to_return <= 0 THEN
      EXIT;
    END IF;

    -- Podemos devolver no máximo o quanto falta para encher a bobina até o seu initial_length_meters
    v_return_this_roll := LEAST(v_remaining_to_return, v_roll.initial_length_meters - v_roll.remaining_length_meters);
    
    IF v_return_this_roll > 0 THEN
      v_new_remaining := v_roll.remaining_length_meters + v_return_this_roll;
      
      UPDATE public.material_rolls
      SET 
        remaining_length_meters = v_new_remaining,
        status = 'aberta', -- Transição: esgotada/aberta -> aberta. Nunca para fechada.
        exhausted_at = NULL,
        updated_at = NOW()
      WHERE id = v_roll.id;

      INSERT INTO public.stock_movements (
        material_id, material_roll_id, movement_type, quantity, reason, user_id, company_id, stock_source
      ) VALUES (
        p_material_id, v_roll.id, 'Estorno', v_return_this_roll, p_reason, p_user_id, p_company_id, p_source
      );

      v_reversed_list := v_reversed_list || jsonb_build_object(
        'roll_id', v_roll.id,
        'meters_returned', v_return_this_roll,
        'new_remaining', v_new_remaining,
        'new_status', 'aberta'
      );

      v_remaining_to_return := v_remaining_to_return - v_return_this_roll;
    END IF;
  END LOOP;

  -- 2. Se a bobina original não existir mais (ou se não houver capacidade suficiente nas bobinas atuais)
  -- Cria ajuste documentado injetando uma nova bobina aberta com o restante
  IF v_remaining_to_return > 0 THEN
    INSERT INTO public.material_rolls (
      material_id, company_id, initial_length_meters, remaining_length_meters, status, source, opened_at, notes
    ) VALUES (
      p_material_id, p_company_id, v_remaining_to_return, v_remaining_to_return, 'aberta', 'manual', NOW(), 'Bobina gerada por estorno (Ajuste)'
    ) RETURNING id INTO v_new_roll_id;

    INSERT INTO public.stock_movements (
      material_id, material_roll_id, movement_type, quantity, reason, user_id, company_id, stock_source
    ) VALUES (
      p_material_id, v_new_roll_id, 'Estorno', v_remaining_to_return, p_reason || ' (Ajuste documental)', p_user_id, p_company_id, 'ajuste'
    );

    v_reversed_list := v_reversed_list || jsonb_build_object(
      'roll_id', v_new_roll_id,
      'meters_returned', v_remaining_to_return,
      'new_remaining', v_remaining_to_return,
      'new_status', 'aberta'
    );
  END IF;

  -- 3. Atualizar estoque total do material
  UPDATE public.materials
  SET current_stock = COALESCE(current_stock, 0) + p_meters
  WHERE id = p_material_id;

  RETURN jsonb_build_object('reversed', v_reversed_list);
END;
$$ LANGUAGE plpgsql;
