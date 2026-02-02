-- =============================================
-- FIX 1: Add company_id to company_settings table
-- =============================================

-- Add company_id column
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id 
ON public.company_settings(company_id);

-- Drop old policies that lack company isolation
DROP POLICY IF EXISTS "Admin and Vendedor can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Only Admin can manage company settings" ON public.company_settings;

-- Create new policies with proper company isolation
CREATE POLICY "Users can view their company settings"
ON public.company_settings FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can insert their company settings"
ON public.company_settings FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admin can update their company settings"
ON public.company_settings FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admin can delete their company settings"
ON public.company_settings FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- =============================================
-- FIX 2: Secure storage bucket policies
-- =============================================

-- Drop weak policies
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Create secure policies with company isolation
-- Files must be organized as: company-logos/{company_id}/filename
CREATE POLICY "Admin can upload their company logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'ADMIN'::app_role)
  AND (storage.foldername(name))[1]::bigint = get_user_company_id(auth.uid())
);

CREATE POLICY "Admin can update their company logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'ADMIN'::app_role)
  AND (storage.foldername(name))[1]::bigint = get_user_company_id(auth.uid())
);

CREATE POLICY "Admin can delete their company logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'ADMIN'::app_role)
  AND (storage.foldername(name))[1]::bigint = get_user_company_id(auth.uid())
);