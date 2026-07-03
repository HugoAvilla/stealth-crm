-- Fix master_delete_user to allow deleting users with missing profiles
CREATE OR REPLACE FUNCTION public.master_delete_user(user_id_input uuid, reason_input text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_email text;
  v_name text;
  v_company_id bigint;
BEGIN
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a conta Master pode excluir usuários';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = user_id_input;
  
  IF v_profile IS NOT NULL THEN
    v_email := v_profile.email;
    v_name := v_profile.name;
    v_company_id := v_profile.company_id;
  ELSE
    v_email := 'deleted_or_orphaned@user.com';
    v_name := 'Usuário sem Perfil';
    v_company_id := NULL;
  END IF;

  -- Log action first
  INSERT INTO master_actions (action_type, target_user_id, old_value, reason, performed_by)
  VALUES (
    'user_deleted',
    user_id_input,
    jsonb_build_object('email', v_email, 'name', v_name, 'company_id', v_company_id)::text,
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
