-- Preço por entrada de estoque + custo médio ponderado
-- ============================================
-- Objetivo:
--   1) Registrar o custo unitário informado em cada ENTRADA (histórico de preços / gráfico).
--   2) Valorar o estoque pelo CUSTO MÉDIO PONDERADO: o valor total é a soma do que foi
--      realmente pago por lote. Ex.: 10m a R$100 (R$1.000) + 10m a R$200 (R$2.000) =>
--      20m avaliados em R$3.000, ou seja custo médio de R$150/m.
--      A cada entrada com preço:
--        average_cost = (estoque_antigo * custo_antigo + qtd_entrada * preço_entrada) / estoque_novo

-- 1. Coluna de custo unitário na movimentação de estoque
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS unit_cost numeric;

COMMENT ON COLUMN public.stock_movements.unit_cost IS
  'Custo por unidade (R$/metro, R$/un, etc.) informado no momento da entrada. NULL quando não informado.';

-- 2. add_material_roll (entradas em Metros / bobinas): registra o custo unitário e
--    recalcula o custo médio ponderado do material.
DROP FUNCTION IF EXISTS public.add_material_roll(bigint, numeric, text, text, uuid, bigint);

CREATE OR REPLACE FUNCTION public.add_material_roll(
  p_material_id BIGINT,
  p_length NUMERIC,
  p_status TEXT,
  p_notes TEXT,
  p_user_id UUID,
  p_company_id BIGINT,
  p_unit_cost NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_roll_id BIGINT;
  v_opened_at TIMESTAMPTZ;
  v_roll JSONB;
  v_old_stock NUMERIC;
  v_old_avg NUMERIC;
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

  -- 2. Capturar o estado atual do material ANTES de somar a entrada
  SELECT COALESCE(current_stock, 0), COALESCE(average_cost, 0)
    INTO v_old_stock, v_old_avg
    FROM public.materials
    WHERE id = p_material_id;

  -- 3. Inserir bobina
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

  -- 4. Registrar movimento de estoque (com o custo unitário da entrada).
  --    O movimento tem material_roll_id, então o trigger update_stock_on_movement NÃO
  --    altera current_stock (evita duplicidade) — a atualização é feita aqui.
  INSERT INTO public.stock_movements (
    material_id,
    material_roll_id,
    movement_type,
    quantity,
    reason,
    user_id,
    company_id,
    stock_source,
    unit_cost
  ) VALUES (
    p_material_id,
    v_roll_id,
    'Entrada',
    p_length,
    COALESCE(p_notes, 'Entrada de nova bobina'),
    p_user_id,
    p_company_id,
    'entrada',
    p_unit_cost
  );

  -- 5. Atualizar estoque total e custo médio ponderado do material
  UPDATE public.materials
  SET current_stock = v_old_stock + p_length,
      average_cost = CASE
        WHEN p_unit_cost IS NOT NULL AND p_unit_cost > 0 AND (v_old_stock + p_length) > 0
          THEN (v_old_stock * v_old_avg + p_length * p_unit_cost) / (v_old_stock + p_length)
        ELSE average_cost
      END
  WHERE id = p_material_id;

  -- 6. Construir retorno
  SELECT row_to_json(r)::jsonb INTO v_roll
  FROM public.material_rolls r
  WHERE id = v_roll_id;

  RETURN v_roll;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger inteligente (entradas em outras unidades: Unidades, Litros, ...).
--    Mantém o comportamento original de current_stock e passa a recalcular o
--    custo médio ponderado quando a entrada tiver preço informado (unit_cost).
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza o estoque em materials se não for um movimento associado a uma bobina física
    IF NEW.material_roll_id IS NULL THEN
        IF NEW.movement_type = 'Entrada' THEN
            IF NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
                -- Entrada com preço: soma ao estoque e recalcula o custo médio ponderado.
                -- Na cláusula SET, as referências a current_stock/average_cost usam os
                -- valores ANTIGOS da linha, então o cálculo do custo médio usa o estoque
                -- anterior mesmo somando o novo estoque na mesma instrução.
                UPDATE public.materials
                SET average_cost = CASE
                        WHEN COALESCE(current_stock, 0) + NEW.quantity > 0
                        THEN (COALESCE(current_stock, 0) * COALESCE(average_cost, 0) + NEW.quantity * NEW.unit_cost)
                             / (COALESCE(current_stock, 0) + NEW.quantity)
                        ELSE NEW.unit_cost
                    END,
                    current_stock = COALESCE(current_stock, 0) + NEW.quantity
                WHERE id = NEW.material_id;
            ELSE
                UPDATE public.materials
                SET current_stock = COALESCE(current_stock, 0) + NEW.quantity
                WHERE id = NEW.material_id;
            END IF;
        ELSIF NEW.movement_type = 'Saida' THEN
            UPDATE public.materials
            SET current_stock = COALESCE(current_stock, 0) - NEW.quantity
            WHERE id = NEW.material_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
