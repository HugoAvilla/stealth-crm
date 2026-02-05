-- Criar tabela de servicos associados a garantias
CREATE TABLE public.warranty_services (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warranty_template_id INTEGER REFERENCES public.warranty_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.warranty_services ENABLE ROW LEVEL SECURITY;

-- Politica para empresas verem seus proprios servicos
CREATE POLICY "Users can view their company warranty services"
  ON public.warranty_services FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para inserir
CREATE POLICY "Users can insert warranty services for their company"
  ON public.warranty_services FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para atualizar
CREATE POLICY "Users can update their company warranty services"
  ON public.warranty_services FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para deletar
CREATE POLICY "Users can delete their company warranty services"
  ON public.warranty_services FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_warranty_services_updated_at
  BEFORE UPDATE ON public.warranty_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();