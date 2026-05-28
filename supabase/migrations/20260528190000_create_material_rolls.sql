-- Criação da tabela material_rolls para controle físico das bobinas

CREATE TABLE public.material_rolls (
  id              BIGSERIAL PRIMARY KEY,
  material_id     BIGINT NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  company_id      BIGINT NOT NULL REFERENCES public.companies(id),
  
  initial_length_meters   NUMERIC NOT NULL CHECK (initial_length_meters > 0),
  remaining_length_meters NUMERIC NOT NULL CHECK (remaining_length_meters >= 0),
  width_meters            NUMERIC,
  
  status          TEXT NOT NULL DEFAULT 'fechada' 
                  CHECK (status IN ('fechada', 'aberta', 'esgotada')),
  source          TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'migracao', 'entrada')),
  
  opened_at       TIMESTAMPTZ,
  exhausted_at    TIMESTAMPTZ,
  
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_material_rolls_material_status 
  ON public.material_rolls(material_id, status) WHERE status != 'esgotada';
  
CREATE INDEX idx_material_rolls_company 
  ON public.material_rolls(company_id);
  
CREATE INDEX idx_material_rolls_consumption_priority 
  ON public.material_rolls(material_id, status, created_at ASC) 
  WHERE status IN ('aberta', 'fechada');

-- Trigger para updated_at
CREATE TRIGGER update_material_rolls_updated_at 
  BEFORE UPDATE ON public.material_rolls 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.material_rolls ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS baseadas no get_user_company_id (padrão atual do projeto)
CREATE POLICY "Users can view material_rolls from their company"
  ON public.material_rolls FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin and Producao can insert material_rolls"
  ON public.material_rolls FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

CREATE POLICY "Admin and Producao can update material_rolls"
  ON public.material_rolls FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
  );

CREATE POLICY "Admin can delete material_rolls"
  ON public.material_rolls FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'ADMIN'::app_role)
  );
