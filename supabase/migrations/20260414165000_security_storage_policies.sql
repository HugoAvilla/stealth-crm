-- ============================================================
-- Security Storage Policies — Multi-tenant isolation
-- Covers: SEC-03, SEC-17, SEC-36, SEC-37, SEC-38
-- ============================================================

-- Helper function: get company_id for the authenticated user
CREATE OR REPLACE FUNCTION storage.get_user_company_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper function: check if the authenticated user has ADMIN role
CREATE OR REPLACE FUNCTION storage.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ============================================================
-- Bucket: pdfs
-- ============================================================

-- DROP existing policies if any (idempotent)
DROP POLICY IF EXISTS "pdfs_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "pdfs_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "pdfs_delete_admin" ON storage.objects;

-- SELECT: authenticated user can read PDFs from their company folder
CREATE POLICY "pdfs_select_tenant" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- INSERT: authenticated user can upload PDFs to their company folder
CREATE POLICY "pdfs_insert_tenant" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- DELETE: ADMIN only, within own company folder
CREATE POLICY "pdfs_delete_admin" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pdfs'
    AND storage.is_admin()
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- ============================================================
-- Bucket: checklists
-- ============================================================

DROP POLICY IF EXISTS "checklists_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "checklists_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "checklists_delete_tenant" ON storage.objects;

-- SELECT: authenticated user can view checklist photos from their company folder
CREATE POLICY "checklists_select_tenant" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'checklists'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- INSERT: authenticated user can upload images to their company folder
CREATE POLICY "checklists_insert_tenant" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'checklists'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- DELETE: authenticated user within own company
CREATE POLICY "checklists_delete_tenant" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'checklists'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- ============================================================
-- Bucket: company-logos
-- ============================================================

DROP POLICY IF EXISTS "logos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_admin" ON storage.objects;

-- SELECT: public read (logos are displayed publicly in PDFs and UI)
CREATE POLICY "logos_select_public" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company-logos'
  );

-- INSERT: ADMIN only, within own company folder
CREATE POLICY "logos_insert_admin" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND storage.is_admin()
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- UPDATE: ADMIN only, within own company folder
CREATE POLICY "logos_update_admin" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND storage.is_admin()
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );

-- DELETE: ADMIN only, within own company folder
CREATE POLICY "logos_delete_admin" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND storage.is_admin()
    AND (storage.foldername(name))[1] = storage.get_user_company_id()::text
  );
