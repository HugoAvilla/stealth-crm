-- ============================================
-- ENUM E TABELA DE ROLES (SEGURANÇA)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'VENDEDOR', 'PRODUCAO', 'NENHUM');

-- Tabela separada para roles (evita privilege escalation)
CREATE TABLE public.user_roles (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'NENHUM',
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNÇÃO SECURITY DEFINER PARA VERIFICAR ROLE
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Função para verificar se tem uma das roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- ============================================
-- POLICIES PARA USER_ROLES
-- ============================================
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- 1. Tabela de Perfis de Usuários
-- ============================================
CREATE TABLE public.profiles (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Tabela de Clientes/Leads
-- ============================================
CREATE TABLE public.clients (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    cpf_cnpj text,
    origem text,
    birth_date date,
    cep text,
    state text,
    city text,
    neighborhood text,
    street text,
    number text,
    complement text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Tabela de Veículos
-- ============================================
CREATE TABLE public.vehicles (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_id int8 REFERENCES public.clients(id) ON DELETE CASCADE,
    brand text NOT NULL,
    model text NOT NULL,
    year int,
    plate text,
    size text CHECK (size IN ('P', 'M', 'G')),
    color text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Tabela de Serviços
-- ============================================
CREATE TABLE public.services (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    description text,
    base_price numeric(10,2) NOT NULL DEFAULT 0,
    commission_percentage numeric(5,2),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Tabela de Vendas
-- ============================================
CREATE TABLE public.sales (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sale_date date NOT NULL DEFAULT CURRENT_DATE,
    client_id int8 REFERENCES public.clients(id),
    vehicle_id int8 REFERENCES public.vehicles(id),
    seller_id uuid REFERENCES auth.users(id),
    subtotal numeric(10,2) NOT NULL DEFAULT 0,
    discount numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    payment_method text,
    is_open boolean DEFAULT false,
    status text DEFAULT 'Fechada' CHECK (status IN ('Fechada', 'Aberta', 'Cancelada')),
    observations text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Tabela de Itens da Venda
-- ============================================
CREATE TABLE public.sale_items (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sale_id int8 REFERENCES public.sales(id) ON DELETE CASCADE,
    service_id int8 REFERENCES public.services(id),
    quantity int DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. Tabela de Vagas do Espaço
-- ============================================
CREATE TABLE public.spaces (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    client_id int8 REFERENCES public.clients(id),
    vehicle_id int8 REFERENCES public.vehicles(id),
    status text DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'ocupado')),
    tag text CHECK (tag IN ('Em andamento', 'Pausado', 'Em espera', 'Finalizado')),
    entry_date date,
    entry_time time,
    exit_date date,
    exit_time time,
    observations text,
    photos jsonb DEFAULT '[]'::jsonb,
    discount numeric(10,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Tabela de Contas Bancárias
-- ============================================
CREATE TABLE public.accounts (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    account_type text,
    initial_balance numeric(10,2) DEFAULT 0,
    current_balance numeric(10,2) DEFAULT 0,
    is_main boolean DEFAULT false,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. Tabela de Categorias Financeiras
-- ============================================
CREATE TABLE public.categories (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('Entrada', 'Saida')),
    color text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. Tabela de Subcategorias
-- ============================================
CREATE TABLE public.subcategories (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    category_id int8 REFERENCES public.categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('Entrada', 'Saida')),
    color text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. Tabela de Transações Financeiras
-- ============================================
CREATE TABLE public.transactions (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transaction_date date NOT NULL,
    name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    type text NOT NULL CHECK (type IN ('Entrada', 'Saida', 'Transferencia')),
    account_id int8 REFERENCES public.accounts(id),
    category_id int8 REFERENCES public.categories(id),
    subcategory_id int8 REFERENCES public.subcategories(id),
    payment_method text,
    description text,
    is_paid boolean DEFAULT false,
    sale_id int8 REFERENCES public.sales(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. Tabela de Transferências
-- ============================================
CREATE TABLE public.transfers (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transfer_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    from_account_id int8 REFERENCES public.accounts(id),
    to_account_id int8 REFERENCES public.accounts(id),
    description text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. Tabela de Materiais (Estoque)
-- ============================================
CREATE TABLE public.materials (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    brand text,
    type text,
    unit text NOT NULL CHECK (unit IN ('Metros', 'Litros', 'Unidades')),
    current_stock numeric(10,2) DEFAULT 0,
    minimum_stock numeric(10,2) DEFAULT 0,
    average_cost numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 14. Tabela de Movimentação de Estoque
-- ============================================
CREATE TABLE public.stock_movements (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    material_id int8 REFERENCES public.materials(id),
    movement_type text NOT NULL CHECK (movement_type IN ('Entrada', 'Saida')),
    quantity numeric(10,2) NOT NULL,
    reason text,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. Tabela de Regras de Consumo P/M/G
-- ============================================
CREATE TABLE public.consumption_rules (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    material_type text NOT NULL,
    size_p numeric(10,2) DEFAULT 0,
    size_m numeric(10,2) DEFAULT 0,
    size_g numeric(10,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.consumption_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 16. Tabela de Garantias
-- ============================================
CREATE TABLE public.warranties (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_id int8 REFERENCES public.clients(id),
    vehicle_id int8 REFERENCES public.vehicles(id),
    sale_id int8 REFERENCES public.sales(id),
    warranty_type text NOT NULL,
    issue_date date NOT NULL,
    expiry_date date NOT NULL,
    warranty_text text,
    status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Enviado')),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 17. Tabela de Configurações da Empresa
-- ============================================
CREATE TABLE public.company_settings (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    company_name text,
    cnpj text,
    phone text,
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
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 18. Tabela de Estágios do Pipeline
-- ============================================
CREATE TABLE public.pipeline_stages (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_id int8 REFERENCES public.clients(id),
    vehicle_id int8 REFERENCES public.vehicles(id),
    stage text NOT NULL CHECK (stage IN ('Agendados', 'Recebidos', 'Em Execução', 'Controle de Qualidade', 'Pronto', 'Entregue')),
    service_name text,
    scheduled_time time,
    position int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 19. Tabela de Mensagens do Chat
-- ============================================
CREATE TABLE public.chat_messages (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_id int8 REFERENCES public.clients(id) ON DELETE CASCADE,
    content text NOT NULL,
    sender text NOT NULL CHECK (sender IN ('client', 'company')),
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 20. Tabela de Templates de Garantia
-- ============================================
CREATE TABLE public.warranty_templates (
    id int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    service_id int8 REFERENCES public.services(id),
    validity_months int NOT NULL,
    terms text,
    coverage text,
    restrictions text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE INDEX idx_vehicles_client_id ON public.vehicles(client_id);
CREATE INDEX idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX idx_sales_client_id ON public.sales(client_id);
CREATE INDEX idx_sales_vehicle_id ON public.sales(vehicle_id);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_sale_id ON public.transactions(sale_id);
CREATE INDEX idx_stock_movements_material_id ON public.stock_movements(material_id);
CREATE INDEX idx_pipeline_client_id ON public.pipeline_stages(client_id);
CREATE INDEX idx_chat_messages_client_id ON public.chat_messages(client_id);

-- ============================================
-- FUNÇÃO UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS UPDATED_AT
-- ============================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consumption_rules_updated_at BEFORE UPDATE ON public.consumption_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranty_templates_updated_at BEFORE UPDATE ON public.warranty_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TRIGGER: Criar perfil automaticamente ao signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Criar perfil
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
    
    -- Criar role NENHUM (pendente aprovação)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'NENHUM');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Atualizar saldo da conta
-- ============================================
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_paid AND NEW.account_id IS NOT NULL THEN
        IF NEW.type = 'Entrada' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Saida' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- ============================================
-- TRIGGER: Processar transferência
-- ============================================
CREATE OR REPLACE FUNCTION public.process_transfer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
    UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_transfer_trigger
    AFTER INSERT ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.process_transfer();

-- ============================================
-- TRIGGER: Atualizar estoque
-- ============================================
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'Entrada' THEN
        UPDATE public.materials SET current_stock = current_stock + NEW.quantity WHERE id = NEW.material_id;
    ELSIF NEW.movement_type = 'Saida' THEN
        UPDATE public.materials SET current_stock = current_stock - NEW.quantity WHERE id = NEW.material_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_movement_trigger
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_movement();

-- ============================================
-- TRIGGER: Garantir apenas uma conta principal
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_single_main_account()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_main = true THEN
        UPDATE public.accounts SET is_main = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_main_account_trigger
    BEFORE INSERT OR UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_main_account();

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - CLIENTS
-- ============================================
CREATE POLICY "Admin and Vendedor can view clients" ON public.clients FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can insert clients" ON public.clients FOR INSERT 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can update all clients" ON public.clients FOR UPDATE 
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Vendedor can update own clients" ON public.clients FOR UPDATE 
USING (public.has_role(auth.uid(), 'VENDEDOR') AND created_by = auth.uid());

CREATE POLICY "Only Admin can delete clients" ON public.clients FOR DELETE 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - VEHICLES
-- ============================================
CREATE POLICY "Admin and Vendedor can view vehicles" ON public.vehicles FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage vehicles" ON public.vehicles FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- RLS POLICIES - SERVICES
-- ============================================
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT 
USING (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) != 'NENHUM');

CREATE POLICY "Admin can manage services" ON public.services FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - SALES
-- ============================================
CREATE POLICY "Admin and Vendedor can view sales" ON public.sales FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can insert sales" ON public.sales FOR INSERT 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can update all sales" ON public.sales FOR UPDATE 
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Vendedor can update own sales" ON public.sales FOR UPDATE 
USING (public.has_role(auth.uid(), 'VENDEDOR') AND seller_id = auth.uid());

CREATE POLICY "Only Admin can delete sales" ON public.sales FOR DELETE 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - SALE_ITEMS
-- ============================================
CREATE POLICY "Admin and Vendedor can view sale items" ON public.sale_items FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage sale items" ON public.sale_items FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- RLS POLICIES - SPACES
-- ============================================
CREATE POLICY "Admin and Vendedor can view spaces" ON public.spaces FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage spaces" ON public.spaces FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- RLS POLICIES - ACCOUNTS (Financeiro)
-- ============================================
CREATE POLICY "Admin and Vendedor can view accounts" ON public.accounts FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage accounts" ON public.accounts FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - CATEGORIES
-- ============================================
CREATE POLICY "Admin and Vendedor can view categories" ON public.categories FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage categories" ON public.categories FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - SUBCATEGORIES
-- ============================================
CREATE POLICY "Admin and Vendedor can view subcategories" ON public.subcategories FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage subcategories" ON public.subcategories FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - TRANSACTIONS (Financeiro)
-- ============================================
CREATE POLICY "Admin and Vendedor can view transactions" ON public.transactions FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage transactions" ON public.transactions FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - TRANSFERS (Financeiro)
-- ============================================
CREATE POLICY "Admin and Vendedor can view transfers" ON public.transfers FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage transfers" ON public.transfers FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - MATERIALS (Estoque)
-- ============================================
CREATE POLICY "Admin and Producao can view materials" ON public.materials FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

CREATE POLICY "Admin and Producao can manage materials" ON public.materials FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

-- ============================================
-- RLS POLICIES - STOCK_MOVEMENTS
-- ============================================
CREATE POLICY "Admin and Producao can view stock movements" ON public.stock_movements FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

CREATE POLICY "Admin and Producao can insert stock movements" ON public.stock_movements FOR INSERT 
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

-- ============================================
-- RLS POLICIES - CONSUMPTION_RULES
-- ============================================
CREATE POLICY "Admin and Producao can view consumption rules" ON public.consumption_rules FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

CREATE POLICY "Admin and Producao can manage consumption rules" ON public.consumption_rules FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'PRODUCAO']::app_role[]));

-- ============================================
-- RLS POLICIES - WARRANTIES
-- ============================================
CREATE POLICY "Admin and Vendedor can view warranties" ON public.warranties FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage warranties" ON public.warranties FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- RLS POLICIES - WARRANTY_TEMPLATES
-- ============================================
CREATE POLICY "Admin and Vendedor can view warranty templates" ON public.warranty_templates FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin can manage warranty templates" ON public.warranty_templates FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - COMPANY_SETTINGS
-- ============================================
CREATE POLICY "Admin and Vendedor can view company settings" ON public.company_settings FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Only Admin can manage company settings" ON public.company_settings FOR ALL 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================
-- RLS POLICIES - PIPELINE_STAGES
-- ============================================
CREATE POLICY "Admin and Vendedor can view pipeline" ON public.pipeline_stages FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage pipeline" ON public.pipeline_stages FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- RLS POLICIES - CHAT_MESSAGES
-- ============================================
CREATE POLICY "Admin and Vendedor can view chat messages" ON public.chat_messages FOR SELECT 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

CREATE POLICY "Admin and Vendedor can manage chat messages" ON public.chat_messages FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'VENDEDOR']::app_role[]));

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================
INSERT INTO public.company_settings (company_name, primary_color)
VALUES ('WFE Evolution', '#D8E600');

INSERT INTO public.accounts (name, account_type, is_main, current_balance, initial_balance)
VALUES ('Conta Principal', 'Conta Corrente', true, 0, 0);

INSERT INTO public.categories (name, type, color) VALUES
('Vendas', 'Entrada', '#10B981'),
('Serviços', 'Entrada', '#3B82F6'),
('Custos Fixos', 'Saida', '#EF4444'),
('Fornecedores', 'Saida', '#F59E0B'),
('Marketing', 'Saida', '#8B5CF6');