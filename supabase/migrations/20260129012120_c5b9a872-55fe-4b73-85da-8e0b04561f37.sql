-- ============================================
-- TABELA DE EMPRESAS (Multi-tenant)
-- ============================================
CREATE TABLE public.companies (
  id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_name text NOT NULL,
  cnpj text,
  phone text NOT NULL,
  email text,
  cep text,
  state text,
  city text,
  neighborhood text,
  street text,
  number text,
  complement text,
  logo_url text,
  primary_color text DEFAULT '#D8E600',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABELA DE ASSINATURAS
-- ============================================
CREATE TABLE public.subscriptions (
  id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_submitted', 'active', 'expired', 'blocked')),
  plan_name text DEFAULT 'WFE Evolution CRM',
  plan_price numeric(10,2) DEFAULT 297.00,
  payment_method text DEFAULT 'PIX',
  payment_confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABELA DE CONFIGURAÇÃO GLOBAL
-- ============================================
CREATE TABLE public.system_config (
  id int8 PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pix_key text DEFAULT 'pix@wfeevolution.com.br',
  pix_qr_code_url text,
  beneficiary_name text DEFAULT 'WFE Evolution LTDA',
  beneficiary_cnpj text DEFAULT '00.000.000/0000-00',
  bank_name text DEFAULT 'Banco do Brasil',
  agency text DEFAULT '0000',
  account text DEFAULT '00000-0',
  monthly_price numeric(10,2) DEFAULT 297.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.system_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================
-- ADICIONAR company_id EM TODAS AS TABELAS
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.consumption_rules ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.warranty_templates ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id) ON DELETE CASCADE;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_company_id ON public.materials(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON public.accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÕES AUXILIARES MULTI-TENANT
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS int8
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_subscription_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.subscriptions WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- HABILITAR RLS NAS NOVAS TABELAS
-- ============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES - SYSTEM_CONFIG (público para leitura)
-- ============================================
CREATE POLICY "Anyone can view system config"
ON public.system_config FOR SELECT
USING (true);

-- ============================================
-- POLICIES - COMPANIES
-- ============================================
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (id = get_user_company_id(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create company"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ADMIN can update their company"
ON public.companies FOR UPDATE
USING (
  id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- ============================================
-- POLICIES - SUBSCRIPTIONS
-- ============================================
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (user_id = auth.uid());

-- ============================================
-- ATUALIZAR handle_new_user PARA CRIAR SUBSCRIPTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sanitized_name text;
BEGIN
    -- Get name from metadata, fallback to email username
    sanitized_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    sanitized_name := trim(sanitized_name);
    
    IF length(sanitized_name) > 100 THEN
        sanitized_name := left(sanitized_name, 100);
    END IF;
    
    IF length(sanitized_name) < 1 THEN
        sanitized_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Create profile (sem company_id inicialmente)
    INSERT INTO public.profiles (user_id, name, email, phone)
    VALUES (
      NEW.id, 
      sanitized_name, 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    );
    
    -- Create role NENHUM (pending approval - será ADMIN após criar empresa)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'NENHUM');
    
    -- Create subscription with pending_payment status
    INSERT INTO public.subscriptions (user_id, status)
    VALUES (NEW.id, 'pending_payment');
    
    RETURN NEW;
END;
$$;

-- ============================================
-- REMOVER POLICIES ANTIGAS E RECRIAR COM MULTI-TENANT
-- ============================================

-- PROFILES - atualizar para incluir company filter
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admin can view company profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Admin can manage company profiles"
ON public.profiles FOR ALL
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- CLIENTS - multi-tenant
DROP POLICY IF EXISTS "Admin and Vendedor can view clients" ON public.clients;
DROP POLICY IF EXISTS "Admin and Vendedor can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admin can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Vendedor can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Only Admin can delete clients" ON public.clients;

CREATE POLICY "Users can view clients in their company"
ON public.clients FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can insert clients in their company"
ON public.clients FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can update all clients in company"
ON public.clients FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Vendedor can update own clients"
ON public.clients FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "Only Admin can delete clients"
ON public.clients FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- SALES - multi-tenant
DROP POLICY IF EXISTS "Admin and Vendedor can view sales" ON public.sales;
DROP POLICY IF EXISTS "Admin and Vendedor can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admin can update all sales" ON public.sales;
DROP POLICY IF EXISTS "Vendedor can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Only Admin can delete sales" ON public.sales;

CREATE POLICY "Users can view sales in their company"
ON public.sales FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can insert sales in their company"
ON public.sales FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can update all sales in company"
ON public.sales FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Vendedor can update own sales"
ON public.sales FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'VENDEDOR'::app_role)
  AND seller_id = auth.uid()
);

CREATE POLICY "Only Admin can delete sales"
ON public.sales FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- MATERIALS - multi-tenant (ADMIN e PRODUCAO)
DROP POLICY IF EXISTS "Admin and Producao can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admin and Producao can manage materials" ON public.materials;

CREATE POLICY "Users can view materials in their company"
ON public.materials FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

CREATE POLICY "Users can manage materials in their company"
ON public.materials FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

-- ACCOUNTS - multi-tenant
DROP POLICY IF EXISTS "Admin and Vendedor can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admin can manage accounts" ON public.accounts;

CREATE POLICY "Users can view accounts in their company"
ON public.accounts FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage accounts in their company"
ON public.accounts FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- TRANSACTIONS - multi-tenant
DROP POLICY IF EXISTS "Admin and Vendedor can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admin can manage transactions" ON public.transactions;

CREATE POLICY "Users can view transactions in their company"
ON public.transactions FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage transactions in their company"
ON public.transactions FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- SERVICES - multi-tenant
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Admin can manage services" ON public.services;

CREATE POLICY "Users can view services in their company"
ON public.services FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND get_user_role(auth.uid()) <> 'NENHUM'::app_role
);

CREATE POLICY "Admin can manage services in their company"
ON public.services FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Demais tabelas seguem o mesmo padrão...
-- SPACES
DROP POLICY IF EXISTS "Admin and Vendedor can view spaces" ON public.spaces;
DROP POLICY IF EXISTS "Admin and Vendedor can manage spaces" ON public.spaces;

CREATE POLICY "Users can view spaces in their company"
ON public.spaces FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage spaces in their company"
ON public.spaces FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

-- CATEGORIES
DROP POLICY IF EXISTS "Admin and Vendedor can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;

CREATE POLICY "Users can view categories in their company"
ON public.categories FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage categories in their company"
ON public.categories FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- SUBCATEGORIES
DROP POLICY IF EXISTS "Admin and Vendedor can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admin can manage subcategories" ON public.subcategories;

CREATE POLICY "Users can view subcategories in their company"
ON public.subcategories FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage subcategories in their company"
ON public.subcategories FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- TRANSFERS
DROP POLICY IF EXISTS "Admin and Vendedor can view transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admin can manage transfers" ON public.transfers;

CREATE POLICY "Users can view transfers in their company"
ON public.transfers FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage transfers in their company"
ON public.transfers FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Admin and Producao can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin and Producao can insert stock movements" ON public.stock_movements;

CREATE POLICY "Users can view stock movements in their company"
ON public.stock_movements FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

CREATE POLICY "Users can insert stock movements in their company"
ON public.stock_movements FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

-- CONSUMPTION_RULES
DROP POLICY IF EXISTS "Admin and Producao can view consumption rules" ON public.consumption_rules;
DROP POLICY IF EXISTS "Admin and Producao can manage consumption rules" ON public.consumption_rules;

CREATE POLICY "Users can view consumption rules in their company"
ON public.consumption_rules FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

CREATE POLICY "Users can manage consumption rules in their company"
ON public.consumption_rules FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'PRODUCAO'::app_role])
);

-- WARRANTIES
DROP POLICY IF EXISTS "Admin and Vendedor can view warranties" ON public.warranties;
DROP POLICY IF EXISTS "Admin and Vendedor can manage warranties" ON public.warranties;

CREATE POLICY "Users can view warranties in their company"
ON public.warranties FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage warranties in their company"
ON public.warranties FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

-- WARRANTY_TEMPLATES
DROP POLICY IF EXISTS "Admin and Vendedor can view warranty templates" ON public.warranty_templates;
DROP POLICY IF EXISTS "Admin can manage warranty templates" ON public.warranty_templates;

CREATE POLICY "Users can view warranty templates in their company"
ON public.warranty_templates FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Admin can manage warranty templates in their company"
ON public.warranty_templates FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- PIPELINE_STAGES
DROP POLICY IF EXISTS "Admin and Vendedor can view pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admin and Vendedor can manage pipeline" ON public.pipeline_stages;

CREATE POLICY "Users can view pipeline in their company"
ON public.pipeline_stages FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage pipeline in their company"
ON public.pipeline_stages FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

-- VEHICLES
DROP POLICY IF EXISTS "Admin and Vendedor can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admin and Vendedor can manage vehicles" ON public.vehicles;

CREATE POLICY "Users can view vehicles in their company"
ON public.vehicles FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage vehicles in their company"
ON public.vehicles FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

-- CHAT_MESSAGES
DROP POLICY IF EXISTS "Admin and Vendedor can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admin and Vendedor can manage chat messages" ON public.chat_messages;

CREATE POLICY "Users can view chat messages in their company"
ON public.chat_messages FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage chat messages in their company"
ON public.chat_messages FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

-- SALE_ITEMS (herda da venda)
DROP POLICY IF EXISTS "Admin and Vendedor can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Admin and Vendedor can manage sale items" ON public.sale_items;

CREATE POLICY "Users can view sale items in their company"
ON public.sale_items FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);

CREATE POLICY "Users can manage sale items in their company"
ON public.sale_items FOR ALL
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
);