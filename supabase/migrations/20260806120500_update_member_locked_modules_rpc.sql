-- RPC para o admin/dono editar as permissões (locked_modules) de um funcionário
-- da própria empresa. Security definer + validação de escopo (mesma empresa).
-- Espelha o padrão de unlink_company_member.

create or replace function public.update_member_locked_modules(
    target_user_id uuid,
    modules text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_id uuid := auth.uid();
    caller_company_id bigint;
    caller_is_admin boolean;
    caller_is_owner boolean;
    target_company_id bigint;
begin
    if caller_id is null then
        raise exception 'Não autenticado';
    end if;

    select company_id into caller_company_id
      from public.profiles
     where user_id = caller_id;

    select exists (
        select 1 from public.user_roles
         where user_id = caller_id and role::text = 'ADMIN'
    ) into caller_is_admin;

    select exists (
        select 1 from public.companies
         where id = caller_company_id and owner_id = caller_id
    ) into caller_is_owner;

    if not (coalesce(caller_is_admin, false) or coalesce(caller_is_owner, false)) then
        raise exception 'Sem permissão para alterar permissões de funcionários';
    end if;

    select company_id into target_company_id
      from public.profiles
     where user_id = target_user_id;

    if target_company_id is null or target_company_id is distinct from caller_company_id then
        raise exception 'Funcionário não pertence à sua empresa';
    end if;

    update public.profiles
       set locked_modules = coalesce(modules, '{}')
     where user_id = target_user_id;
end;
$$;

grant execute on function public.update_member_locked_modules(uuid, text[]) to authenticated;
