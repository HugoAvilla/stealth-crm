-- Recriar a função trigger sync_product_type_material para atualizar também as bobinas abertas
CREATE OR REPLACE FUNCTION public.sync_product_type_material()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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

  -- 1. Atualizar materiais existentes associados a este tipo de produto (bobinas abertas e fechadas)
  UPDATE public.materials
     SET name = CASE WHEN is_open_roll = true THEN v_material_name || ' (Aberta)' ELSE v_material_name END,
         type = NEW.category,
         brand = NEW.brand,
         average_cost = coalesce(NEW.cost_per_meter, 0),
         is_active = coalesce(NEW.is_active, true)
   WHERE product_type_id = NEW.id
     AND company_id = NEW.company_id;

  -- 2. Se não houver bobina fechada (padrão) correspondente cadastrada, insere uma
  IF NOT EXISTS (
    SELECT 1 FROM public.materials 
    WHERE product_type_id = NEW.id 
      AND company_id = NEW.company_id 
      AND coalesce(is_open_roll, false) = false
  ) THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- Sincronizar o average_cost das bobinas abertas já existentes no banco com base no product_type correspondente
UPDATE public.materials m
   SET average_cost = coalesce(pt.cost_per_meter, 0)
  FROM public.product_types pt
 WHERE m.product_type_id = pt.id
   AND m.company_id = pt.company_id
   AND m.is_open_roll = true;
