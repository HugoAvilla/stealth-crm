-- 1. Remover o trigger incorreto que causava erro no cadastro de vendas (pois a tabela sales não possui a coluna space_id)
DROP TRIGGER IF EXISTS trg_sync_material_losses_on_sale ON public.sales;
DROP FUNCTION IF EXISTS public.sync_material_losses_on_sale();

-- 2. Criar a nova função de sincronização de perdas de material vinculada ao espaço (spaces)
CREATE OR REPLACE FUNCTION public.sync_material_losses_on_space_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o sale_id foi atualizado na tabela spaces e não é nulo, atualiza as perdas de materiais
  IF (OLD.sale_id IS DISTINCT FROM NEW.sale_id) AND NEW.sale_id IS NOT NULL THEN
    UPDATE public.material_losses 
    SET sale_id = NEW.sale_id 
    WHERE space_id = NEW.id AND status = 'active' AND sale_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar o trigger na tabela spaces para atualizar as perdas quando a venda for vinculada
DROP TRIGGER IF EXISTS trg_sync_material_losses_on_space_sale ON public.spaces;
CREATE TRIGGER trg_sync_material_losses_on_space_sale
AFTER UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.sync_material_losses_on_space_sale();
