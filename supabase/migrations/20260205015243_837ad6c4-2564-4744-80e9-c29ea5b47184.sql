-- ===========================================
-- CORREÇÃO DE SEGURANÇA: RLS TO public → TO authenticated
-- ===========================================

-- 1. product_types
DROP POLICY IF EXISTS "Users can manage product_types from their company" ON product_types;
DROP POLICY IF EXISTS "Users can view product_types from their company" ON product_types;

CREATE POLICY "Users can manage product_types from their company"
  ON product_types FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view product_types from their company"
  ON product_types FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 2. region_consumption_rules
DROP POLICY IF EXISTS "Users can manage consumption_rules from their company" ON region_consumption_rules;
DROP POLICY IF EXISTS "Users can view consumption_rules from their company" ON region_consumption_rules;

CREATE POLICY "Users can manage consumption_rules from their company"
  ON region_consumption_rules FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view consumption_rules from their company"
  ON region_consumption_rules FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 3. sales (UPDATE e DELETE do Admin)
DROP POLICY IF EXISTS "Admin can update all sales in company" ON sales;
DROP POLICY IF EXISTS "Only Admin can delete sales" ON sales;

CREATE POLICY "Admin can update all sales in company"
  ON sales FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) 
         AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Only Admin can delete sales"
  ON sales FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) 
         AND has_role(auth.uid(), 'ADMIN'::app_role));

-- 4. service_items_detailed
DROP POLICY IF EXISTS "Users can manage service_items from their company" ON service_items_detailed;
DROP POLICY IF EXISTS "Users can view service_items from their company" ON service_items_detailed;

CREATE POLICY "Users can manage service_items from their company"
  ON service_items_detailed FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view service_items from their company"
  ON service_items_detailed FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 5. vehicle_regions
DROP POLICY IF EXISTS "Users can manage vehicle_regions from their company" ON vehicle_regions;
DROP POLICY IF EXISTS "Users can view vehicle_regions from their company" ON vehicle_regions;

CREATE POLICY "Users can manage vehicle_regions from their company"
  ON vehicle_regions FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view vehicle_regions from their company"
  ON vehicle_regions FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- ===========================================
-- PROTEÇÃO DE DADOS BANCÁRIOS: system_config
-- ===========================================

DROP POLICY IF EXISTS "Authenticated users can view system config" ON system_config;

CREATE POLICY "Master or payment flow can view system config"
  ON system_config FOR SELECT TO authenticated
  USING (
    is_master_account(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = auth.uid() 
      AND status IN ('pending_payment', 'payment_submitted')
    )
  );