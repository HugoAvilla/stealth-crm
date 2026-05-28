-- Funções RPC para consumo sequencial de bobinas

CREATE OR REPLACE FUNCTION public.consume_material_rolls(
  p_material_id BIGINT,
  p_meters NUMERIC,
  p_source TEXT,
  p_reason TEXT,
  p_user_id UUID,
  p_company_id BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_available NUMERIC;
  v_remaining_to_consume NUMERIC := p_meters;
  v_roll RECORD;
  v_consume_this_roll NUMERIC;
  v_new_remaining NUMERIC;
  v_new_status TEXT;
  v_consumed_list JSONB := '[]'::JSONB;
BEGIN
  IF p_meters <= 0 THEN
    RAISE EXCEPTION 'Meters to consume must be > 0';
  END IF;

  -- 1. Verificar disponibilidade total
  SELECT COALESCE(SUM(remaining_length_meters), 0)
  INTO v_available
  FROM public.material_rolls
  WHERE material_id = p_material_id 
    AND status IN ('aberta', 'fechada') 
    AND company_id = p_company_id;

  IF v_available < p_meters THEN
    RETURN jsonb_build_object(
      'warning', true,
      'required_meters', p_meters,
      'available_meters', v_available,
      'missing_meters', p_meters - v_available
    );
  END IF;

  -- 2. Consumir sequencialmente
  FOR v_roll IN (
    SELECT *
    FROM public.material_rolls
    WHERE material_id = p_material_id 
      AND status IN ('aberta', 'fechada')
      AND company_id = p_company_id
    ORDER BY CASE status WHEN 'aberta' THEN 0 ELSE 1 END, created_at ASC
    FOR UPDATE
  ) LOOP
    IF v_remaining_to_consume <= 0 THEN
      EXIT;
    END IF;

    IF v_roll.remaining_length_meters <= v_remaining_to_consume THEN
      v_consume_this_roll := v_roll.remaining_length_meters;
      v_new_remaining := 0;
      v_new_status := 'esgotada';
    ELSE
      v_consume_this_roll := v_remaining_to_consume;
      v_new_remaining := v_roll.remaining_length_meters - v_consume_this_roll;
      v_new_status := 'aberta';
    END IF;

    -- Atualizar bobina
    UPDATE public.material_rolls
    SET 
      remaining_length_meters = v_new_remaining,
      status = v_new_status,
      opened_at = CASE WHEN v_new_status = 'aberta' AND status = 'fechada' THEN NOW() ELSE opened_at END,
      exhausted_at = CASE WHEN v_new_status = 'esgotada' THEN NOW() ELSE exhausted_at END,
      updated_at = NOW()
    WHERE id = v_roll.id;

    -- Registrar movimento
    INSERT INTO public.stock_movements (
      material_id,
      material_roll_id,
      movement_type,
      quantity,
      reason,
      user_id,
      company_id,
      stock_source
    ) VALUES (
      p_material_id,
      v_roll.id,
      'Saida',
      v_consume_this_roll,
      p_reason,
      p_user_id,
      p_company_id,
      p_source
    );

    -- Adicionar à lista de consumidos
    v_consumed_list := v_consumed_list || jsonb_build_object(
      'roll_id', v_roll.id,
      'meters', v_consume_this_roll,
      'new_remaining', v_new_remaining,
      'new_status', v_new_status
    );

    v_remaining_to_consume := v_remaining_to_consume - v_consume_this_roll;
  END LOOP;

  -- 3. Atualizar estoque total do material
  UPDATE public.materials
  SET current_stock = COALESCE(current_stock, 0) - p_meters
  WHERE id = p_material_id;

  RETURN jsonb_build_object(
    'warning', false,
    'total_consumed', p_meters,
    'consumed', v_consumed_list
  );
END;
$$ LANGUAGE plpgsql;

-- Wrapper para saída manual via frontend
CREATE OR REPLACE FUNCTION public.manual_exit_material_rolls(
  p_material_id BIGINT,
  p_meters NUMERIC,
  p_reason TEXT,
  p_user_id UUID,
  p_company_id BIGINT
) RETURNS JSONB AS $$
BEGIN
  RETURN public.consume_material_rolls(
    p_material_id,
    p_meters,
    'saida_manual',
    p_reason,
    p_user_id,
    p_company_id
  );
END;
$$ LANGUAGE plpgsql;
