-- Adicionar coluna para cupom individual por usuário
ALTER TABLE public.discount_coupons 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.discount_coupons.target_user_id IS 'Se preenchido, o cupom só é válido para este usuário específico';

-- Criar função para excluir usuário completamente (apenas para Master)
CREATE OR REPLACE FUNCTION public.master_delete_user(
  user_id_input UUID,
  reason_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Apenas conta master pode executar
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a conta Master pode excluir usuários';
  END IF;

  -- Buscar perfil para log
  SELECT * INTO v_profile FROM profiles WHERE user_id = user_id_input;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Registrar ação no log de auditoria
  INSERT INTO master_actions (action_type, target_user_id, old_value, reason, performed_by)
  VALUES (
    'user_deleted',
    user_id_input,
    jsonb_build_object(
      'email', v_profile.email,
      'name', v_profile.name,
      'company_id', v_profile.company_id
    )::text,
    reason_input,
    auth.uid()
  );

  -- Excluir em cascata
  DELETE FROM subscriptions WHERE user_id = user_id_input;
  DELETE FROM coupon_usage WHERE user_id = user_id_input;
  DELETE FROM user_roles WHERE user_id = user_id_input;
  DELETE FROM profiles WHERE user_id = user_id_input;
  
  -- Deletar usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = user_id_input;

  RETURN true;
END;
$$;

-- Criar função para criar cupom individual por usuário (apenas para Master)
CREATE OR REPLACE FUNCTION public.master_create_individual_coupon(
  p_user_id UUID,
  p_discount_type TEXT,
  p_discount_value NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_coupon_code TEXT;
BEGIN
  -- Apenas conta master pode executar
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a conta Master pode criar cupons individuais';
  END IF;

  -- Buscar nome do usuário para gerar código
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Gerar código baseado no nome do usuário + random
  v_coupon_code := UPPER(SPLIT_PART(v_profile.name, ' ', 1)) || '_' || 
                   UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  -- Criar cupom individual
  INSERT INTO discount_coupons (
    code,
    discount_type,
    discount_value,
    description,
    usage_limit,
    is_active,
    target_user_id,
    created_by
  ) VALUES (
    v_coupon_code,
    p_discount_type,
    p_discount_value,
    COALESCE(p_description, 'Cupom individual para ' || v_profile.name),
    1,
    true,
    p_user_id,
    auth.uid()
  );

  -- Registrar ação no log
  INSERT INTO master_actions (action_type, target_user_id, new_value, reason, performed_by)
  VALUES (
    'coupon_created',
    p_user_id,
    jsonb_build_object(
      'code', v_coupon_code,
      'discount_type', p_discount_type,
      'discount_value', p_discount_value
    )::text,
    COALESCE(p_description, 'Cupom individual criado'),
    auth.uid()
  );

  RETURN v_coupon_code;
END;
$$;