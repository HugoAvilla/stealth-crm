-- 1. Recriar a função inteligente para atualizar o estoque ao movimentar
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza o estoque em materials se não for um movimento associado a uma bobina física (para evitar duplicidade de contagem)
    IF NEW.material_roll_id IS NULL THEN
        IF NEW.movement_type = 'Entrada' THEN
            UPDATE public.materials 
            SET current_stock = COALESCE(current_stock, 0) + NEW.quantity 
            WHERE id = NEW.material_id;
        ELSIF NEW.movement_type = 'Saida' THEN
            UPDATE public.materials 
            SET current_stock = COALESCE(current_stock, 0) - NEW.quantity 
            WHERE id = NEW.material_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar o trigger na tabela stock_movements
DROP TRIGGER IF EXISTS update_stock_on_movement_trigger ON public.stock_movements;
CREATE TRIGGER update_stock_on_movement_trigger
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_movement();

-- 3. Reconciliar/Recalcular estoque atual de materiais existentes para garantir consistência
DO $$
DECLARE
    r_material RECORD;
    v_total_stock NUMERIC;
BEGIN
    FOR r_material IN SELECT id, unit FROM public.materials WHERE is_active = true LOOP
        IF r_material.unit = 'Metros' THEN
            -- Se for metros, recalcula baseado nas bobinas físicas não esgotadas
            SELECT COALESCE(SUM(remaining_length_meters), 0)
            INTO v_total_stock
            FROM public.material_rolls
            WHERE material_id = r_material.id AND status != 'esgotada';
            
            -- Se não houver nenhuma bobina física cadastrada, mas tiver estoque atual, mantém o estoque atual 
            -- (caso o usuário não esteja utilizando o controle detalhado de bobinas para este material)
            IF NOT EXISTS (SELECT 1 FROM public.material_rolls WHERE material_id = r_material.id) THEN
                SELECT COALESCE(current_stock, 0) INTO v_total_stock FROM public.materials WHERE id = r_material.id;
            END IF;
            
            -- Atualiza o material
            UPDATE public.materials 
            SET current_stock = v_total_stock 
            WHERE id = r_material.id;
        ELSE
            -- Se for outra unidade (ex: Litros, Unidades), recalcula a partir de todos os movimentos históricos
            SELECT 
                COALESCE(SUM(CASE WHEN movement_type = 'Entrada' THEN quantity ELSE -quantity END), 0)
            INTO v_total_stock
            FROM public.stock_movements
            WHERE material_id = r_material.id;

            -- Atualiza o material
            UPDATE public.materials 
            SET current_stock = v_total_stock 
            WHERE id = r_material.id;
        END IF;
    END LOOP;
END $$;
