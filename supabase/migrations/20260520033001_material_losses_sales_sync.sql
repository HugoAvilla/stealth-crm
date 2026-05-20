CREATE OR REPLACE FUNCTION sync_material_losses_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.space_id IS NOT NULL THEN
    UPDATE material_losses 
    SET sale_id = NEW.id 
    WHERE space_id = NEW.space_id AND status = 'active' AND sale_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_material_losses_on_sale
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION sync_material_losses_on_sale();
