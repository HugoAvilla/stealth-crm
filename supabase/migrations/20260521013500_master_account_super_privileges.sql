-- Garante que a conta master tenha todas as permissões de roles do sistema
-- Isso resolve bloqueios onde a conta master esbarra em validações de "has_role" ou "has_any_role".

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_master_account(_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_master_account(_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = ANY(_roles)
    )
$$;

-- Atualizar a função get_user_role para retornar ADMIN se for a conta master
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN public.is_master_account(_user_id) THEN 'ADMIN'::app_role
      ELSE (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
    END
$$;
