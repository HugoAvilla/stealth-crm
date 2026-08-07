-- =============================================================================
-- ENFORCEMENT DE PERMISSÕES NO BACKEND (RLS)
-- =============================================================================
-- Complementa o enforcement de frontend: mesmo que um funcionário tente burlar
-- a UI (chamada direta à API), o banco recusa a operação bloqueada.
--
-- Estratégia: função fn_is_locked() + políticas RESTRICTIVE. Políticas
-- RESTRICTIVE são combinadas com AND às políticas permissivas já existentes,
-- então elas SÓ RESTRINGEM (nunca concedem acesso novo) — é seguro aplicar
-- sem precisar reescrever as políticas atuais.
--
-- IMPORTANTE: aplicar e TESTAR no Supabase com um funcionário real. Operações
-- feitas via RPC security-definer (ex.: consumo de estoque) rodam como o dono
-- da função e não passam por estas políticas — a cobertura aqui é das operações
-- diretas nas tabelas.
-- =============================================================================

-- Retorna TRUE se a ação estiver bloqueada para o usuário atual.
-- Privilegiados (ADMIN, dono da empresa, master) nunca são bloqueados.
create or replace function public.fn_is_locked(action_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.user_roles ur
       where ur.user_id = auth.uid() and ur.role::text = 'ADMIN'
    ) then false
    when exists (
      select 1
        from public.companies c
        join public.profiles p on p.company_id = c.id
       where p.user_id = auth.uid() and c.owner_id = auth.uid()
    ) then false
    else coalesce(
      (select action_key = any(coalesce(pr.locked_modules, '{}'::text[]))
         from public.profiles pr
        where pr.user_id = auth.uid()),
      false
    )
  end;
$$;

grant execute on function public.fn_is_locked(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Políticas RESTRICTIVE por ação destrutiva (delete/update) nas tabelas-chave.
-- Idempotentes (drop if exists + create).
-- -----------------------------------------------------------------------------

-- Vendas
drop policy if exists deny_locked_sales_delete on public.sales;
create policy deny_locked_sales_delete on public.sales
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('vendas_delete'));

drop policy if exists deny_locked_sales_update on public.sales;
create policy deny_locked_sales_update on public.sales
  as restrictive for update to authenticated
  using (not public.fn_is_locked('vendas_edit'));

-- Clientes
drop policy if exists deny_locked_clients_delete on public.clients;
create policy deny_locked_clients_delete on public.clients
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('clientes_delete'));

drop policy if exists deny_locked_clients_update on public.clients;
create policy deny_locked_clients_update on public.clients
  as restrictive for update to authenticated
  using (not public.fn_is_locked('clientes_edit'));

-- Espaço
drop policy if exists deny_locked_spaces_delete on public.spaces;
create policy deny_locked_spaces_delete on public.spaces
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('espaco_delete'));

drop policy if exists deny_locked_spaces_update on public.spaces;
create policy deny_locked_spaces_update on public.spaces
  as restrictive for update to authenticated
  using (not public.fn_is_locked('espaco_edit'));

-- Estoque (materiais)
drop policy if exists deny_locked_materials_delete on public.materials;
create policy deny_locked_materials_delete on public.materials
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('estoque_delete'));

drop policy if exists deny_locked_materials_update on public.materials;
create policy deny_locked_materials_update on public.materials
  as restrictive for update to authenticated
  using (not public.fn_is_locked('estoque_edit'));

-- Perdas de material
drop policy if exists deny_locked_losses_delete on public.material_losses;
create policy deny_locked_losses_delete on public.material_losses
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('perdas_delete'));

drop policy if exists deny_locked_losses_update on public.material_losses;
create policy deny_locked_losses_update on public.material_losses
  as restrictive for update to authenticated
  using (not public.fn_is_locked('perdas_edit'));

-- Garantias
drop policy if exists deny_locked_warranties_delete on public.warranties;
create policy deny_locked_warranties_delete on public.warranties
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('garantias_delete'));

-- Compras
drop policy if exists deny_locked_purchases_delete on public.purchases;
create policy deny_locked_purchases_delete on public.purchases
  as restrictive for delete to authenticated
  using (not public.fn_is_locked('compras_delete'));

drop policy if exists deny_locked_purchases_update on public.purchases;
create policy deny_locked_purchases_update on public.purchases
  as restrictive for update to authenticated
  using (not public.fn_is_locked('compras_edit'));

-- =============================================================================
-- COBERTURA PENDENTE (rollout incremental, ver PRD):
--   * INSERT de transações: uma mesma tabela (transactions) serve Financeiro e
--     Contas, e "add_entrada" vs "add_saida" não se distinguem só pela operação
--     — precisa de checagem por coluna `type`/módulo. Documentar antes de aplicar.
--   * Ações puramente de UI (imprimir, enviar WhatsApp, ver sub-aba, exportar)
--     não têm operação de banco — enforcement é só no frontend, por natureza.
--   * Demais add/edit de cada aba: replicar o padrão acima conforme necessidade.
-- =============================================================================
