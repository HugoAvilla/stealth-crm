-- Política para ADMIN e VENDEDOR poderem criar categorias na sua empresa
CREATE POLICY "Users can create categories in their company"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
  );