-- Adicionar coluna max_members na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 5;

-- Function auxiliar para contar membros atuais
CREATE OR REPLACE FUNCTION public.count_company_members(company_id_input bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE company_id = company_id_input;
$$;

-- Atualizar approve_company_join_request para verificar limite
CREATE OR REPLACE FUNCTION public.approve_company_join_request(request_id_input bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_record RECORD;
  company_record RECORD;
  current_members integer;
BEGIN
  -- Buscar dados da solicitação
  SELECT * INTO req_record
  FROM public.company_join_requests
  WHERE id = request_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Buscar empresa com max_members
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = req_record.company_id;

  -- Verificar se usuário atual é o owner da empresa
  IF company_record.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode aprovar solicitações';
  END IF;

  -- Verificar se já não foi processada
  IF req_record.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada';
  END IF;

  -- Contar membros atuais
  SELECT COUNT(*) INTO current_members
  FROM public.profiles
  WHERE company_id = req_record.company_id;

  -- Verificar limite de membros
  IF current_members >= company_record.max_members THEN
    RAISE EXCEPTION 'Limite de membros atingido (% de %)', current_members, company_record.max_members;
  END IF;

  -- Atualizar o perfil do solicitante
  UPDATE public.profiles
  SET 
    company_id = req_record.company_id,
    updated_at = now()
  WHERE user_id = req_record.requester_user_id;

  -- Criar/atualizar role do usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (req_record.requester_user_id, req_record.requested_role::app_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Marcar solicitação como aprovada
  UPDATE public.company_join_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = request_id_input;
END;
$$;