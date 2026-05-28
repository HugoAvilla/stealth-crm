-- Adiciona controle de bobinas na tabela de movimentação de estoque

-- 1. Adicionar colunas
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS material_roll_id BIGINT REFERENCES public.material_rolls(id),
  ADD COLUMN IF NOT EXISTS stock_source TEXT DEFAULT 'legado'
    CHECK (stock_source IN ('legado', 'venda', 'espaco', 'saida_manual', 'entrada', 'estorno', 'ajuste', 'migracao'));

-- 2. Atualizar constraint de movement_type para incluir 'Estorno'
-- O constraint original do banco é 'stock_movements_movement_type_check'
ALTER TABLE public.stock_movements 
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
  
ALTER TABLE public.stock_movements 
  ADD CONSTRAINT stock_movements_movement_type_check 
  CHECK (movement_type IN ('Entrada', 'Saida', 'open_roll_use', 'Estorno'));

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_roll 
  ON public.stock_movements(material_roll_id) WHERE material_roll_id IS NOT NULL;
