-- Adicionar a coluna ppf_material_type que existe no frontend mas pode estar faltando no banco
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS ppf_material_type text;

-- Fazer a trigger de sincronização executar como SECURITY DEFINER
-- Isso garante que a trigger consiga inserir na tabela materials independentemente 
-- da RLS da tabela materials, uma vez que a validação de acesso já foi feita em product_types
CREATE OR REPLACE FUNCTION public.sync_product_type_material()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_material_id bigint;
  v_material_name text;
BEGIN
  v_material_name := trim(
    concat_ws(
      ' ',
      nullif(trim(coalesce(NEW.brand, '')), ''),
      nullif(trim(coalesce(NEW.name, '')), '')
    )
  );

  IF nullif(trim(coalesce(NEW.model, '')), '') IS NOT NULL THEN
    v_material_name := v_material_name || ' - ' || trim(NEW.model);
  END IF;

  SELECT id
    INTO v_material_id
  FROM public.materials
  WHERE product_type_id = NEW.id
    AND company_id = NEW.company_id
    AND coalesce(is_open_roll, false) = false
  ORDER BY id
  LIMIT 1;

  IF v_material_id IS NULL THEN
    INSERT INTO public.materials (
      name,
      type,
      brand,
      unit,
      current_stock,
      minimum_stock,
      average_cost,
      company_id,
      product_type_id,
      is_active,
      is_open_roll
    )
    VALUES (
      v_material_name,
      NEW.category,
      NEW.brand,
      'Metros',
      0,
      0,
      coalesce(NEW.cost_per_meter, 0),
      NEW.company_id,
      NEW.id,
      coalesce(NEW.is_active, true),
      false
    );
  ELSE
    UPDATE public.materials
       SET name = v_material_name,
           type = NEW.category,
           brand = NEW.brand,
           average_cost = coalesce(NEW.cost_per_meter, 0),
           is_active = coalesce(NEW.is_active, true),
           product_type_id = NEW.id
     WHERE id = v_material_id;
  END IF;

  RETURN NEW;
END;
$$;
