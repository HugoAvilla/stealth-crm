-- 1. Modificar restrição de 'Entrada' / 'Saida' para abranger 'open_roll_use'
ALTER TABLE public.stock_movements 
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE public.stock_movements 
  ADD CONSTRAINT stock_movements_movement_type_check 
  CHECK (movement_type IN ('Entrada', 'Saida', 'open_roll_use'));

-- 2. Colunas p/ materials e stock_movements
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS is_open_roll BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS open_roll_accumulated NUMERIC DEFAULT 0;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS is_open_roll_closure BOOLEAN DEFAULT FALSE;

-- 3. Função RPC consume_open_roll
CREATE OR REPLACE FUNCTION public.consume_open_roll(
  p_material_id integer,
  p_meters      numeric,
  p_reason      text,
  p_user_id     uuid,
  p_company_id  integer
) RETURNS VOID AS $$
BEGIN
  UPDATE public.materials
    SET open_roll_accumulated = COALESCE(open_roll_accumulated, 0) + p_meters
    WHERE id = p_material_id;

  INSERT INTO public.stock_movements 
    (material_id, movement_type, quantity, reason, user_id, company_id)
  VALUES 
    (p_material_id, 'open_roll_use', p_meters, p_reason, p_user_id, p_company_id);
END;
$$ LANGUAGE plpgsql;

-- 4. Função RPC close_open_roll
CREATE OR REPLACE FUNCTION public.close_open_roll(
  p_material_id integer,
  p_reason      text,
  p_user_id     uuid,
  p_company_id  integer
) RETURNS numeric AS $$
DECLARE 
  total numeric;
BEGIN
  SELECT open_roll_accumulated INTO total FROM public.materials WHERE id = p_material_id;
  
  INSERT INTO public.stock_movements 
    (material_id, movement_type, quantity, reason, user_id, company_id, is_open_roll_closure)
  VALUES 
    (p_material_id, 'open_roll_use', COALESCE(total, 0), p_reason, p_user_id, p_company_id, TRUE);

  UPDATE public.materials SET is_active = FALSE WHERE id = p_material_id;

  RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;
