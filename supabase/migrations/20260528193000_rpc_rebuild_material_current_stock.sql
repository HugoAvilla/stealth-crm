-- Funções RPC para reconciliar o estoque total do material com as bobinas físicas

CREATE OR REPLACE FUNCTION public.rebuild_material_current_stock(p_material_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.materials m
  SET current_stock = (
    SELECT COALESCE(SUM(remaining_length_meters), 0)
    FROM public.material_rolls
    WHERE material_id = p_material_id AND status != 'esgotada'
  )
  WHERE id = p_material_id;
END;
$$ LANGUAGE plpgsql;

-- Variante sem parâmetros que reconstrói todos os materiais da empresa do caller
CREATE OR REPLACE FUNCTION public.rebuild_material_current_stock()
RETURNS VOID AS $$
DECLARE
  v_company_id BIGINT;
BEGIN
  -- Identificar a company do caller
  v_company_id := public.get_user_company_id(auth.uid());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any company';
  END IF;

  UPDATE public.materials m
  SET current_stock = (
    SELECT COALESCE(SUM(remaining_length_meters), 0)
    FROM public.material_rolls
    WHERE material_id = m.id AND status != 'esgotada'
  )
  WHERE m.company_id = v_company_id;
END;
$$ LANGUAGE plpgsql;
