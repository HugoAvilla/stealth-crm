
-- Fix 1: master_change_global_price - read old value BEFORE updating
CREATE OR REPLACE FUNCTION public.master_change_global_price(new_price_input numeric, reason_input text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_price_value numeric;
BEGIN
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Read old value BEFORE update
  SELECT monthly_price INTO old_price_value FROM public.system_config WHERE id = 1;

  -- Update all subscriptions
  UPDATE public.subscriptions
  SET plan_price = new_price_input, final_price = new_price_input, updated_at = now();

  -- Update system_config
  UPDATE public.system_config
  SET monthly_price = new_price_input, updated_at = now()
  WHERE id = 1;

  -- Log action with correct old value
  INSERT INTO public.master_actions (action_type, old_value, new_value, reason, performed_by)
  VALUES ('global_price_change', old_price_value::text, new_price_input::text, reason_input, auth.uid());
END;
$function$;

-- Fix 2: master_delete_user - clear FK references before deleting subscriptions
CREATE OR REPLACE FUNCTION public.master_delete_user(user_id_input uuid, reason_input text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
BEGIN
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a conta Master pode excluir usuários';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = user_id_input;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Log action first
  INSERT INTO master_actions (action_type, target_user_id, old_value, reason, performed_by)
  VALUES (
    'user_deleted',
    user_id_input,
    jsonb_build_object('email', v_profile.email, 'name', v_profile.name, 'company_id', v_profile.company_id)::text,
    reason_input,
    auth.uid()
  );

  -- Clear FK references in master_actions BEFORE deleting subscriptions
  UPDATE master_actions
  SET target_subscription_id = NULL
  WHERE target_subscription_id IN (SELECT id FROM subscriptions WHERE user_id = user_id_input);

  -- Now safe to delete
  DELETE FROM subscriptions WHERE user_id = user_id_input;
  DELETE FROM coupon_usage WHERE user_id = user_id_input;
  DELETE FROM user_roles WHERE user_id = user_id_input;
  DELETE FROM profiles WHERE user_id = user_id_input;
  DELETE FROM auth.users WHERE id = user_id_input;

  RETURN true;
END;
$function$;

-- Fix 3: Create master_change_global_expiration RPC
CREATE OR REPLACE FUNCTION public.master_change_global_expiration(months_input integer, reason_input text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_count integer;
BEGIN
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Update expires_at for all active subscriptions
  UPDATE public.subscriptions
  SET expires_at = now() + (months_input || ' months')::interval, updated_at = now()
  WHERE status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Log action
  INSERT INTO public.master_actions (action_type, old_value, new_value, reason, performed_by)
  VALUES (
    'global_expiration_change',
    affected_count::text || ' assinaturas afetadas',
    months_input::text || ' meses a partir de agora',
    reason_input,
    auth.uid()
  );
END;
$function$;
