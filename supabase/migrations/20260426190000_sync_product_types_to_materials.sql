CREATE OR REPLACE FUNCTION public.sync_product_type_material()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trigger_sync_product_type_material ON public.product_types;

CREATE TRIGGER trigger_sync_product_type_material
AFTER INSERT OR UPDATE ON public.product_types
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_type_material();

WITH product_type_backfill AS (
  SELECT
    pt.id,
    pt.company_id,
    trim(
      concat_ws(
        ' ',
        nullif(trim(coalesce(pt.brand, '')), ''),
        nullif(trim(coalesce(pt.name, '')), '')
      )
    ) ||
      CASE
        WHEN nullif(trim(coalesce(pt.model, '')), '') IS NOT NULL
          THEN ' - ' || trim(pt.model)
        ELSE ''
      END AS material_name,
    pt.category,
    pt.brand,
    coalesce(pt.cost_per_meter, 0) AS cost_per_meter,
    coalesce(pt.is_active, true) AS is_active
  FROM public.product_types pt
)
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
SELECT
  backfill.material_name,
  backfill.category,
  backfill.brand,
  'Metros',
  0,
  0,
  backfill.cost_per_meter,
  backfill.company_id,
  backfill.id,
  backfill.is_active,
  false
FROM product_type_backfill backfill
LEFT JOIN public.materials material
  ON material.product_type_id = backfill.id
 AND material.company_id = backfill.company_id
 AND coalesce(material.is_open_roll, false) = false
WHERE material.id IS NULL;
