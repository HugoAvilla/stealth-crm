-- ============================================
-- CRIAR BUCKET PARA LOGOS DE EMPRESAS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para visualização pública
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Policy para upload (usuários autenticados podem fazer upload para sua empresa)
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);

-- Policy para update (usuários autenticados podem atualizar)
CREATE POLICY "Authenticated users can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);

-- Policy para delete (usuários autenticados podem deletar)
CREATE POLICY "Authenticated users can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);