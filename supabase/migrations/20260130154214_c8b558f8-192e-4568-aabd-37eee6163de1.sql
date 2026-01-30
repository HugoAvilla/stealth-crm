-- ============================================
-- 1. ATUALIZAR TABELA SPACES
-- ============================================

-- Adicionar novas colunas
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS sale_id bigint REFERENCES public.sales(id) ON DELETE SET NULL;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS has_exited boolean DEFAULT false;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_spaces_sale_id ON public.spaces(sale_id);
CREATE INDEX IF NOT EXISTS idx_spaces_payment_status ON public.spaces(payment_status);
CREATE INDEX IF NOT EXISTS idx_spaces_has_exited ON public.spaces(has_exited);

-- ============================================
-- 2. CRIAR TABELA MASTER_ACTIONS (LOG DE AÇÕES)
-- ============================================

CREATE TABLE IF NOT EXISTS public.master_actions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_subscription_id bigint,
  old_value text,
  new_value text,
  reason text,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT master_actions_pkey PRIMARY KEY (id),
  CONSTRAINT master_actions_target_subscription_id_fkey FOREIGN KEY (target_subscription_id) REFERENCES public.subscriptions(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_master_actions_target_user ON public.master_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_master_actions_type ON public.master_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_master_actions_performed_by ON public.master_actions(performed_by);

-- Habilitar RLS
ALTER TABLE public.master_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas master pode ver logs
CREATE POLICY "Only master can view actions"
ON public.master_actions FOR SELECT
USING (is_master_account(auth.uid()));

CREATE POLICY "Only master can insert actions"
ON public.master_actions FOR INSERT
WITH CHECK (is_master_account(auth.uid()));

-- ============================================
-- 3. CRIAR FUNCTIONS PARA PAINEL MASTER
-- ============================================

-- Function: Alterar preço da assinatura
CREATE OR REPLACE FUNCTION public.master_change_subscription_price(
  subscription_id_input bigint,
  new_price_input numeric,
  reason_input text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  old_price_value numeric;
BEGIN
  -- Verificar se é o master
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Buscar preço atual
  SELECT plan_price INTO old_price_value
  FROM public.subscriptions
  WHERE id = subscription_id_input;

  -- Atualizar preço
  UPDATE public.subscriptions
  SET 
    plan_price = new_price_input,
    final_price = new_price_input,
    updated_at = now()
  WHERE id = subscription_id_input;

  -- Registrar ação no log
  INSERT INTO public.master_actions (
    action_type,
    target_subscription_id,
    old_value,
    new_value,
    reason,
    performed_by
  ) VALUES (
    'change_price',
    subscription_id_input,
    old_price_value::text,
    new_price_input::text,
    reason_input,
    auth.uid()
  );
END;
$$;

-- Function: Alterar data de expiração
CREATE OR REPLACE FUNCTION public.master_change_expiry_date(
  subscription_id_input bigint,
  new_expiry_input timestamp with time zone,
  reason_input text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  old_expiry_value timestamp with time zone;
BEGIN
  -- Verificar se é o master
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Buscar data atual
  SELECT expires_at INTO old_expiry_value
  FROM public.subscriptions
  WHERE id = subscription_id_input;

  -- Atualizar data
  UPDATE public.subscriptions
  SET 
    expires_at = new_expiry_input,
    updated_at = now()
  WHERE id = subscription_id_input;

  -- Registrar ação no log
  INSERT INTO public.master_actions (
    action_type,
    target_subscription_id,
    old_value,
    new_value,
    reason,
    performed_by
  ) VALUES (
    'change_expiry',
    subscription_id_input,
    old_expiry_value::text,
    new_expiry_input::text,
    reason_input,
    auth.uid()
  );
END;
$$;

-- Function: Ativar/Bloquear assinatura
CREATE OR REPLACE FUNCTION public.master_toggle_subscription_status(
  subscription_id_input bigint,
  new_status_input text,
  reason_input text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  old_status_value text;
BEGIN
  -- Verificar se é o master
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Buscar status atual
  SELECT status INTO old_status_value
  FROM public.subscriptions
  WHERE id = subscription_id_input;

  -- Atualizar status
  UPDATE public.subscriptions
  SET 
    status = new_status_input,
    updated_at = now()
  WHERE id = subscription_id_input;

  -- Registrar ação no log
  INSERT INTO public.master_actions (
    action_type,
    target_subscription_id,
    old_value,
    new_value,
    reason,
    performed_by
  ) VALUES (
    'change_status',
    subscription_id_input,
    old_status_value,
    new_status_input,
    reason_input,
    auth.uid()
  );
END;
$$;