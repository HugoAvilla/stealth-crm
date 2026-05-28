-- Criação da tabela stock_reuse_items para aproveitamento de estoque (antigo bobinas abertas)

CREATE TABLE public.stock_reuse_items (
  id              BIGSERIAL PRIMARY KEY,
  material_id     BIGINT NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  company_id      BIGINT NOT NULL REFERENCES public.companies(id),
  
  length_meters   NUMERIC NOT NULL CHECK (length_meters > 0),
  width_meters    NUMERIC,
  
  status          TEXT NOT NULL DEFAULT 'disponivel'
                  CHECK (status IN ('disponivel', 'encerrado')),
  reason          TEXT,
  notes           TEXT,
  
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_reuse_items_material 
  ON public.stock_reuse_items(material_id, status);
  
CREATE INDEX idx_stock_reuse_items_company 
  ON public.stock_reuse_items(company_id);

-- Trigger para updated_at
CREATE TRIGGER update_stock_reuse_items_updated_at 
  BEFORE UPDATE ON public.stock_reuse_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.stock_reuse_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock_reuse_items from their company"
  ON public.stock_reuse_items FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin and Producao can insert stock_reuse_items"
  ON public.stock_reuse_items FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

CREATE POLICY "Admin and Producao can update stock_reuse_items"
  ON public.stock_reuse_items FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

CREATE POLICY "Admin can delete stock_reuse_items"
  ON public.stock_reuse_items FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );
