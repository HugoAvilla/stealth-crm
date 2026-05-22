-- Migration: fix_checkout_rls_policies
-- Created to resolve "Erro ao carregar informações de assinatura" by correcting RLS policies
-- on public.system_config and public.plan_prices for all authenticated users.

-- 1. Enable RLS on plan_prices and system_config
ALTER TABLE IF EXISTS public.plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_config ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view plan prices" ON public.plan_prices;
DROP POLICY IF EXISTS "Authenticated users can view plan prices" ON public.plan_prices;
DROP POLICY IF EXISTS "Master or payment flow can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Authenticated users can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Anyone can view system config" ON public.system_config;

-- 3. Create clean, robust SELECT policies for authenticated users
CREATE POLICY "Authenticated users can view plan prices"
  ON public.plan_prices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view system config"
  ON public.system_config FOR SELECT TO authenticated
  USING (true);

-- 4. Create master control policies for INSERT, UPDATE, DELETE on plan_prices and system_config
-- Using is_master_account to let administrators modify them
DROP POLICY IF EXISTS "Master can manage plan prices" ON public.plan_prices;
CREATE POLICY "Master can manage plan prices"
  ON public.plan_prices FOR ALL TO authenticated
  USING (is_master_account(auth.uid()))
  WITH CHECK (is_master_account(auth.uid()));

DROP POLICY IF EXISTS "Master can manage system config" ON public.system_config;
CREATE POLICY "Master can manage system config"
  ON public.system_config FOR ALL TO authenticated
  USING (is_master_account(auth.uid()))
  WITH CHECK (is_master_account(auth.uid()));

-- 5. Add unique constraint if not exists to plan_prices to ensure safe seed / upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_plan_prices_code_period'
    ) THEN
        ALTER TABLE public.plan_prices 
        ADD CONSTRAINT uq_plan_prices_code_period UNIQUE (plan_code, billing_period);
    END IF;
END $$;

-- 6. Seed/Ensure standard plans exist in plan_prices
INSERT INTO public.plan_prices (plan_code, billing_period, price)
VALUES 
  ('basic', 'monthly', 197.00),
  ('basic', 'annual', 1891.20),
  ('ultra', 'monthly', 297.00),
  ('ultra', 'annual', 2851.20)
ON CONFLICT (plan_code, billing_period) DO NOTHING;
