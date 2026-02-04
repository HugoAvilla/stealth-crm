-- Criar função para Master alterar limite de membros por empresa
CREATE OR REPLACE FUNCTION public.master_change_member_limit(
  company_id_input bigint,
  new_limit_input integer,
  reason_input text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_limit_value integer;
BEGIN
  -- Verificar se é o master
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas conta master';
  END IF;

  -- Buscar limite atual
  SELECT max_members INTO old_limit_value
  FROM public.companies
  WHERE id = company_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  -- Atualizar limite
  UPDATE public.companies
  SET 
    max_members = new_limit_input,
    updated_at = now()
  WHERE id = company_id_input;

  -- Registrar ação no log
  INSERT INTO public.master_actions (
    action_type,
    target_user_id,
    old_value,
    new_value,
    reason,
    performed_by
  ) VALUES (
    'change_member_limit',
    NULL,
    old_limit_value::text,
    new_limit_input::text,
    'Company ID: ' || company_id_input::text || ' - ' || reason_input,
    auth.uid()
  );
END;
$$;