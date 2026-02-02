-- ============================================
-- MIGRATION: Fix all RLS policies to use TO authenticated
-- This drops and recreates all 68 policies with proper role restriction
-- ============================================

-- ==================== ACCOUNTS ====================
DROP POLICY IF EXISTS "Admin can manage accounts in their company" ON public.accounts;
DROP POLICY IF EXISTS "Users can view accounts in their company" ON public.accounts;

CREATE POLICY "Admin can manage accounts in their company" ON public.accounts
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view accounts in their company" ON public.accounts
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== CATEGORIES ====================
DROP POLICY IF EXISTS "Admin can manage categories in their company" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories in their company" ON public.categories;

CREATE POLICY "Admin can manage categories in their company" ON public.categories
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view categories in their company" ON public.categories
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== CHAT_MESSAGES ====================
DROP POLICY IF EXISTS "Users can manage chat messages in their company" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages in their company" ON public.chat_messages;

CREATE POLICY "Users can manage chat messages in their company" ON public.chat_messages
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view chat messages in their company" ON public.chat_messages
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== CLIENTS ====================
DROP POLICY IF EXISTS "Admin can update all clients in company" ON public.clients;
DROP POLICY IF EXISTS "Only Admin can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their company" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients in their company" ON public.clients;
DROP POLICY IF EXISTS "Vendedor can update own clients" ON public.clients;

CREATE POLICY "Admin can update all clients in company" ON public.clients
FOR UPDATE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Only Admin can delete clients" ON public.clients
FOR DELETE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can insert clients in their company" ON public.clients
FOR INSERT TO authenticated
WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view clients in their company" ON public.clients
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Vendedor can update own clients" ON public.clients
FOR UPDATE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'VENDEDOR'::app_role) AND (created_by = auth.uid()));

-- ==================== COMPANIES ====================
DROP POLICY IF EXISTS "ADMIN can update their company" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

CREATE POLICY "ADMIN can update their company" ON public.companies
FOR UPDATE TO authenticated
USING ((id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Authenticated users can create company" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING ((id = get_user_company_id(auth.uid())) OR (owner_id = auth.uid()) OR is_master_account(auth.uid()));

-- ==================== COMPANY_JOIN_REQUESTS ====================
DROP POLICY IF EXISTS "Authenticated users can create join requests" ON public.company_join_requests;
DROP POLICY IF EXISTS "Company admin can update join requests" ON public.company_join_requests;
DROP POLICY IF EXISTS "Company admin can view join requests" ON public.company_join_requests;

CREATE POLICY "Authenticated users can create join requests" ON public.company_join_requests
FOR INSERT TO authenticated
WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Company admin can update join requests" ON public.company_join_requests
FOR UPDATE TO authenticated
USING (company_id IN (SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()));

CREATE POLICY "Company admin can view join requests" ON public.company_join_requests
FOR SELECT TO authenticated
USING ((company_id IN (SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid())) OR (requester_user_id = auth.uid()));

-- ==================== COMPANY_SETTINGS ====================
DROP POLICY IF EXISTS "Admin can delete their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin can insert their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin can update their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can view their company settings" ON public.company_settings;

CREATE POLICY "Admin can delete their company settings" ON public.company_settings
FOR DELETE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admin can insert their company settings" ON public.company_settings
FOR INSERT TO authenticated
WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admin can update their company settings" ON public.company_settings
FOR UPDATE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view their company settings" ON public.company_settings
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== CONSUMPTION_RULES ====================
DROP POLICY IF EXISTS "Users can manage consumption rules in their company" ON public.consumption_rules;
DROP POLICY IF EXISTS "Users can view consumption rules in their company" ON public.consumption_rules;

CREATE POLICY "Users can manage consumption rules in their company" ON public.consumption_rules
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

CREATE POLICY "Users can view consumption rules in their company" ON public.consumption_rules
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

-- ==================== COUPON_USAGE ====================
DROP POLICY IF EXISTS "Master can view coupon usage" ON public.coupon_usage;
DROP POLICY IF EXISTS "No direct coupon usage insert" ON public.coupon_usage;

CREATE POLICY "Master can view coupon usage" ON public.coupon_usage
FOR SELECT TO authenticated
USING (is_master_account(auth.uid()));

CREATE POLICY "No direct coupon usage insert" ON public.coupon_usage
FOR INSERT TO authenticated
WITH CHECK (false);

-- ==================== DISCOUNT_COUPONS ====================
DROP POLICY IF EXISTS "Master can manage coupons" ON public.discount_coupons;
DROP POLICY IF EXISTS "Master can view all coupons" ON public.discount_coupons;

CREATE POLICY "Master can manage coupons" ON public.discount_coupons
FOR ALL TO authenticated
USING (is_master_account(auth.uid()));

CREATE POLICY "Master can view all coupons" ON public.discount_coupons
FOR SELECT TO authenticated
USING (is_master_account(auth.uid()));

-- ==================== MASTER_ACTIONS ====================
DROP POLICY IF EXISTS "Only master can insert actions" ON public.master_actions;
DROP POLICY IF EXISTS "Only master can view actions" ON public.master_actions;

CREATE POLICY "Only master can insert actions" ON public.master_actions
FOR INSERT TO authenticated
WITH CHECK (is_master_account(auth.uid()));

CREATE POLICY "Only master can view actions" ON public.master_actions
FOR SELECT TO authenticated
USING (is_master_account(auth.uid()));

-- ==================== MATERIALS ====================
DROP POLICY IF EXISTS "Users can manage materials in their company" ON public.materials;
DROP POLICY IF EXISTS "Users can view materials in their company" ON public.materials;

CREATE POLICY "Users can manage materials in their company" ON public.materials
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

CREATE POLICY "Users can view materials in their company" ON public.materials
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

-- ==================== PIPELINE_STAGES ====================
DROP POLICY IF EXISTS "Users can manage pipeline in their company" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can view pipeline in their company" ON public.pipeline_stages;

CREATE POLICY "Users can manage pipeline in their company" ON public.pipeline_stages
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view pipeline in their company" ON public.pipeline_stages
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Admin can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admin can manage company profiles" ON public.profiles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role) AND (company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Admin can view company profiles" ON public.profiles
FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'ADMIN'::app_role) AND (company_id = get_user_company_id(auth.uid()))) OR is_master_account(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ==================== SALE_ITEMS ====================
DROP POLICY IF EXISTS "Users can manage sale items in their company" ON public.sale_items;
DROP POLICY IF EXISTS "Users can view sale items in their company" ON public.sale_items;

CREATE POLICY "Users can manage sale items in their company" ON public.sale_items
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view sale items in their company" ON public.sale_items
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== SALES ====================
DROP POLICY IF EXISTS "Admin can update all sales in company" ON public.sales;
DROP POLICY IF EXISTS "Only Admin can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Vendedor can update own sales" ON public.sales;

CREATE POLICY "Admin can update all sales in company" ON public.sales
FOR UPDATE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Only Admin can delete sales" ON public.sales
FOR DELETE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can insert sales in their company" ON public.sales
FOR INSERT TO authenticated
WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view sales in their company" ON public.sales
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Vendedor can update own sales" ON public.sales
FOR UPDATE TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'VENDEDOR'::app_role) AND (seller_id = auth.uid()));

-- ==================== SERVICES ====================
DROP POLICY IF EXISTS "Admin can manage services in their company" ON public.services;
DROP POLICY IF EXISTS "Users can view services in their company" ON public.services;

CREATE POLICY "Admin can manage services in their company" ON public.services
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view services in their company" ON public.services
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND (get_user_role(auth.uid()) <> 'NENHUM'::app_role));

-- ==================== SPACES ====================
DROP POLICY IF EXISTS "Users can manage spaces in their company" ON public.spaces;
DROP POLICY IF EXISTS "Users can view spaces in their company" ON public.spaces;

CREATE POLICY "Users can manage spaces in their company" ON public.spaces
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view spaces in their company" ON public.spaces
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== STOCK_MOVEMENTS ====================
DROP POLICY IF EXISTS "Users can insert stock movements in their company" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can view stock movements in their company" ON public.stock_movements;

CREATE POLICY "Users can insert stock movements in their company" ON public.stock_movements
FOR INSERT TO authenticated
WITH CHECK ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

CREATE POLICY "Users can view stock movements in their company" ON public.stock_movements
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role]));

-- ==================== SUBCATEGORIES ====================
DROP POLICY IF EXISTS "Admin can manage subcategories in their company" ON public.subcategories;
DROP POLICY IF EXISTS "Users can view subcategories in their company" ON public.subcategories;

CREATE POLICY "Admin can manage subcategories in their company" ON public.subcategories
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view subcategories in their company" ON public.subcategories
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== SUBSCRIPTIONS ====================
DROP POLICY IF EXISTS "Users can create their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

CREATE POLICY "Users can create their own subscription" ON public.subscriptions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR is_master_account(auth.uid()));

-- ==================== SYSTEM_CONFIG ====================
DROP POLICY IF EXISTS "Authenticated users can view system config" ON public.system_config;

CREATE POLICY "Authenticated users can view system config" ON public.system_config
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- ==================== TRANSACTIONS ====================
DROP POLICY IF EXISTS "Admin can manage transactions in their company" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions in their company" ON public.transactions;

CREATE POLICY "Admin can manage transactions in their company" ON public.transactions
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view transactions in their company" ON public.transactions
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== TRANSFERS ====================
DROP POLICY IF EXISTS "Admin can manage transfers in their company" ON public.transfers;
DROP POLICY IF EXISTS "Users can view transfers in their company" ON public.transfers;

CREATE POLICY "Admin can manage transfers in their company" ON public.transfers
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view transfers in their company" ON public.transfers
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== USER_ROLES ====================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ==================== VEHICLES ====================
DROP POLICY IF EXISTS "Users can manage vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON public.vehicles;

CREATE POLICY "Users can manage vehicles in their company" ON public.vehicles
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view vehicles in their company" ON public.vehicles
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== WARRANTIES ====================
DROP POLICY IF EXISTS "Users can manage warranties in their company" ON public.warranties;
DROP POLICY IF EXISTS "Users can view warranties in their company" ON public.warranties;

CREATE POLICY "Users can manage warranties in their company" ON public.warranties
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

CREATE POLICY "Users can view warranties in their company" ON public.warranties
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));

-- ==================== WARRANTY_TEMPLATES ====================
DROP POLICY IF EXISTS "Admin can manage warranty templates in their company" ON public.warranty_templates;
DROP POLICY IF EXISTS "Users can view warranty templates in their company" ON public.warranty_templates;

CREATE POLICY "Admin can manage warranty templates in their company" ON public.warranty_templates
FOR ALL TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view warranty templates in their company" ON public.warranty_templates
FOR SELECT TO authenticated
USING ((company_id = get_user_company_id(auth.uid())) AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]));