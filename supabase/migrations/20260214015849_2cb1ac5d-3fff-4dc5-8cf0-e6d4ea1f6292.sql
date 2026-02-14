
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

CREATE POLICY "Users can upload PDFs to their company folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Users can read PDFs from their company folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs');

CREATE POLICY "Users can delete their PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdfs');
