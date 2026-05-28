-- Função RPC para adicionar uma nova bobina e movimentar o estoque

CREATE OR REPLACE FUNCTION public.add_material_roll(
  p_material_id BIGINT,
  p_length NUMERIC,
  p_status TEXT,
  p_notes TEXT,
  p_user_id UUID,
  p_company_id BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_roll_id BIGINT;
  v_opened_at TIMESTAMPTZ;
  v_roll JSONB;
BEGIN
  -- 1. Validar parâmetros
  IF p_length <= 0 THEN
    RAISE EXCEPTION 'Length must be greater than 0';
  END IF;
  
  IF p_status NOT IN ('fechada', 'aberta') THEN
    RAISE EXCEPTION 'Invalid status. Must be fechada or aberta';
  END IF;

  IF p_status = 'aberta' THEN
    v_opened_at := NOW();
  END IF;

  -- 2. Inserir bobina
  INSERT INTO public.material_rolls (
    material_id,
    company_id,
    initial_length_meters,
    remaining_length_meters,
    status,
    source,
    opened_at,
    notes
  ) VALUES (
    p_material_id,
    p_company_id,
    p_length,
    p_length,
    p_status,
    'entrada',
    v_opened_at,
    p_notes
  ) RETURNING id INTO v_roll_id;

  -- 3. Registrar movimento de estoque
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
    v_roll_id,
    'Entrada',
    p_length,
    COALESCE(p_notes, 'Entrada de nova bobina'),
    p_user_id,
    p_company_id,
    'entrada'
  );

  -- 4. Atualizar estoque total do material
  -- O trigger update_stock_on_movement_trigger atualizaria o current_stock? 
  -- Precisamos checar se o trigger continua ativo. O spec diz que "Trigger existente update_stock_on_movement para stock_movements será substituído por atualização explícita nas RPCs (evita conflito com lógica multi-bobina)".
  -- Como no spec orienta que nós mesmos devemos atualizar o materials.current_stock incrementando p_length, e mais à frente desabilitaremos/modificaremos o trigger se necessário (ou melhor, vamos garantir que o current_stock fique correto).
  -- Mas se o trigger estiver rodando, ele duplicaria a entrada?
  -- O design diz: "Trigger existente update_stock_on_movement para stock_movements será substituído por atualização explícita nas RPCs".
  -- Então vou desativar/remover o trigger antigo aqui para evitar duplicidade!
  
  -- Espera, vou apenas incrementar aqui e também remover o trigger antigo, ou modificar.
  -- Se eu alterar o trigger existente para ignorar movement_types da nova lógica, evito quebrar o legado?
  -- Na verdade, a spec diz que "será substituído por atualização explícita".
  -- Como o trigger atua no insert da stock_movements, ele somaria current_stock = current_stock + NEW.quantity.
  -- O que significa que se ele estiver rodando, NÃO precisamos atualizar manualmente A MENOS QUE a gente drope o trigger.
  -- Vou apenas confiar na instrução do task.md: "Atualiza materials.current_stock incrementando p_length". Vou fazer manualmente e remover o trigger, pois o consumo múltiplo de T5 vai exigir isso.
  
  -- Para ser seguro, dropo o trigger. (Se não dropar, eu não dou o UPDATE explícito e uso o trigger).
  -- "Trigger existente update_stock_on_movement para stock_movements será substituído por atualização explícita nas RPCs" -> Vamos dropar o trigger.
  
  UPDATE public.materials
  SET current_stock = COALESCE(current_stock, 0) + p_length
  WHERE id = p_material_id;

  -- 5. Construir retorno
  SELECT row_to_json(r)::jsonb INTO v_roll
  FROM public.material_rolls r
  WHERE id = v_roll_id;

  RETURN v_roll;
END;
$$ LANGUAGE plpgsql;

-- Dropar o trigger de atualização automática de estoque legado, pois agora as RPCs gerenciam o estoque explicitamente.
DROP TRIGGER IF EXISTS update_stock_on_movement_trigger ON public.stock_movements;
