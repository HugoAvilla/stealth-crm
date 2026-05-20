CREATE OR REPLACE FUNCTION handle_material_loss_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock numeric;
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'active' THEN
      SELECT current_stock INTO v_current_stock FROM materials WHERE id = NEW.material_id;
      IF v_current_stock < NEW.lost_meters THEN
        RAISE EXCEPTION 'Estoque insuficiente para registrar perda. Disponível: %, Solicitado: %', v_current_stock, NEW.lost_meters;
      END IF;
      UPDATE materials SET current_stock = current_stock - NEW.lost_meters WHERE id = NEW.material_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- Caso 1: Cancelamento
    IF OLD.status = 'active' AND NEW.status = 'cancelled' THEN
      UPDATE materials SET current_stock = current_stock + OLD.lost_meters WHERE id = OLD.material_id;
      RETURN NEW;
    END IF;

    -- Caso 2: Reativação
    IF OLD.status = 'cancelled' AND NEW.status = 'active' THEN
      SELECT current_stock INTO v_current_stock FROM materials WHERE id = NEW.material_id;
      IF v_current_stock < NEW.lost_meters THEN
        RAISE EXCEPTION 'Estoque insuficiente para reativar perda. Disponível: %, Solicitado: %', v_current_stock, NEW.lost_meters;
      END IF;
      UPDATE materials SET current_stock = current_stock - NEW.lost_meters WHERE id = NEW.material_id;
      RETURN NEW;
    END IF;

    -- Caso 3: Continua ativo, mas material_id ou lost_meters mudou
    IF OLD.status = 'active' AND NEW.status = 'active' THEN
      IF OLD.material_id != NEW.material_id THEN
        -- Devolve para o material antigo
        UPDATE materials SET current_stock = current_stock + OLD.lost_meters WHERE id = OLD.material_id;
        
        -- Deduz do material novo
        SELECT current_stock INTO v_current_stock FROM materials WHERE id = NEW.material_id;
        IF v_current_stock < NEW.lost_meters THEN
          RAISE EXCEPTION 'Estoque insuficiente para novo material. Disponível: %, Solicitado: %', v_current_stock, NEW.lost_meters;
        END IF;
        UPDATE materials SET current_stock = current_stock - NEW.lost_meters WHERE id = NEW.material_id;
      ELSIF OLD.lost_meters != NEW.lost_meters THEN
        -- Mesmo material, mudou a quantidade
        SELECT current_stock INTO v_current_stock FROM materials WHERE id = NEW.material_id;
        IF NEW.lost_meters > OLD.lost_meters THEN
          IF v_current_stock < (NEW.lost_meters - OLD.lost_meters) THEN
            RAISE EXCEPTION 'Estoque insuficiente para alterar perda. Disponível: %, Adicional Solicitado: %', v_current_stock, (NEW.lost_meters - OLD.lost_meters);
          END IF;
        END IF;
        UPDATE materials SET current_stock = current_stock + OLD.lost_meters - NEW.lost_meters WHERE id = NEW.material_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_handle_material_loss_stock
BEFORE INSERT OR UPDATE ON material_losses
FOR EACH ROW EXECUTE FUNCTION handle_material_loss_stock();
