-- ============================================
-- TABELA DE CUPONS DE DESCONTO
-- ============================================

CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_until timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.discount_coupons(is_active);

-- Trigger de updated_at
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.discount_coupons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA DE USO DE CUPONS (histórico)
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  coupon_id bigint REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  subscription_id bigint REFERENCES public.subscriptions(id),
  discount_applied numeric(10,2) NOT NULL,
  used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_id);

-- ============================================
-- ATUALIZAR TABELA DE ASSINATURAS
-- ============================================

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS final_price numeric(10,2);

-- ============================================
-- FUNCTION: Verificar se é conta master
-- ============================================

CREATE OR REPLACE FUNCTION public.is_master_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id 
    AND email = 'hg.lavila@gmail.com'
  )
$$;

-- ============================================
-- FUNCTION: Validar cupom
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code_input text)
RETURNS TABLE(
  is_valid boolean,
  discount_type text,
  discount_value numeric,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_record RECORD;
BEGIN
  -- Buscar cupom
  SELECT * INTO coupon_record
  FROM public.discount_coupons
  WHERE code = UPPER(coupon_code_input);

  -- Cupom não encontrado
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Cupom não encontrado'::text;
    RETURN;
  END IF;

  -- Cupom inativo
  IF NOT coupon_record.is_active THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Cupom inativo'::text;
    RETURN;
  END IF;

  -- Cupom expirado
  IF coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Cupom expirado'::text;
    RETURN;
  END IF;

  -- Limite de uso atingido
  IF coupon_record.usage_limit IS NOT NULL AND coupon_record.usage_count >= coupon_record.usage_limit THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Cupom atingiu limite de uso'::text;
    RETURN;
  END IF;

  -- Cupom válido
  RETURN QUERY SELECT 
    true, 
    coupon_record.discount_type, 
    coupon_record.discount_value,
    'Cupom válido'::text;
END;
$$;

-- ============================================
-- FUNCTION: Aplicar cupom (incrementar uso)
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_coupon(
  coupon_code_input text,
  p_user_id uuid,
  p_subscription_id bigint,
  p_discount_applied numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementar contador de uso
  UPDATE public.discount_coupons
  SET usage_count = usage_count + 1
  WHERE code = UPPER(coupon_code_input);

  -- Registrar histórico
  INSERT INTO public.coupon_usage (coupon_id, user_id, subscription_id, discount_applied)
  VALUES (
    (SELECT id FROM public.discount_coupons WHERE code = UPPER(coupon_code_input)),
    p_user_id,
    p_subscription_id,
    p_discount_applied
  );
END;
$$;

-- ============================================
-- RLS POLICIES - DISCOUNT_COUPONS
-- ============================================

ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Apenas conta master pode ver todos os cupons
CREATE POLICY "Master can view all coupons"
ON public.discount_coupons FOR SELECT
USING (is_master_account(auth.uid()));

-- Apenas conta master pode gerenciar cupons
CREATE POLICY "Master can manage coupons"
ON public.discount_coupons FOR ALL
USING (is_master_account(auth.uid()));

-- Master pode ver todo histórico de uso
CREATE POLICY "Master can view coupon usage"
ON public.coupon_usage FOR SELECT
USING (is_master_account(auth.uid()));

-- Master pode inserir uso de cupom
CREATE POLICY "System can insert coupon usage"
ON public.coupon_usage FOR INSERT
WITH CHECK (true);

-- ============================================
-- ATUALIZAR POLICIES EXISTENTES PARA MASTER
-- ============================================

-- Subscriptions: Master pode ver todas
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (
  user_id = auth.uid() OR is_master_account(auth.uid())
);

-- Companies: Master pode ver todas
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (
  (id = get_user_company_id(auth.uid())) 
  OR (owner_id = auth.uid())
  OR is_master_account(auth.uid())
);

-- Profiles: Master pode ver todos
DROP POLICY IF EXISTS "Admin can view company profiles" ON public.profiles;
CREATE POLICY "Admin can view company profiles"
ON public.profiles FOR SELECT
USING (
  (has_role(auth.uid(), 'ADMIN') AND (company_id = get_user_company_id(auth.uid())))
  OR is_master_account(auth.uid())
);

-- ============================================
-- DADOS INICIAIS - Cupom de exemplo
-- ============================================

INSERT INTO public.discount_coupons (code, discount_type, discount_value, description)
VALUES ('ALUNO10', 'percentage', 10, 'Desconto de 10% para alunos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.discount_coupons (code, discount_type, discount_value, description)
VALUES ('PROMO50', 'fixed', 50, 'Desconto de R$ 50,00')
ON CONFLICT (code) DO NOTHING;