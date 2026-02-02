

# Plano: Corrigir RLS Policies - Applied To "authenticated"

## Diagnóstico

Todas as 68 policies das tabelas do banco estão configuradas com **"Applied to: public"** (visível como `roles:{public}` no banco), quando deveriam estar restritas a **"authenticated"** para garantir que apenas usuários autenticados possam acessar.

Isso é uma vulnerabilidade de segurança porque tecnicamente um usuário anônimo poderia tentar executar queries (embora as expressões USING com `auth.uid()` já protejam na prática).

---

## Tabelas e Policies a Corrigir

| Tabela | Qtd Policies |
|--------|--------------|
| accounts | 2 |
| categories | 2 |
| chat_messages | 2 |
| clients | 5 |
| companies | 3 |
| company_join_requests | 3 |
| company_settings | 4 |
| consumption_rules | 2 |
| coupon_usage | 2 |
| discount_coupons | 2 |
| master_actions | 2 |
| materials | 2 |
| pipeline_stages | 2 |
| profiles | 4 |
| sale_items | 2 |
| sales | 5 |
| services | 2 |
| spaces | 2 |
| stock_movements | 2 |
| subcategories | 2 |
| subscriptions | 3 |
| system_config | 1 |
| transactions | 2 |
| transfers | 2 |
| user_roles | 3 |
| vehicles | 2 |
| warranties | 2 |
| warranty_templates | 2 |
| **Total** | **68** |

---

## Solução

Criar uma migration SQL que:

1. **DROP** cada policy existente
2. **CREATE** cada policy novamente com `TO authenticated`

---

## Exemplo de Alteração

```sql
-- ANTES (atual - aplicado a public)
CREATE POLICY "policy_name" ON public.table FOR SELECT
USING (expression);

-- DEPOIS (corrigido - aplicado a authenticated)
CREATE POLICY "policy_name" ON public.table FOR SELECT
TO authenticated
USING (expression);
```

---

## Resumo da Migration

A migration irá:
- Dropar todas as 68 policies existentes
- Recriar todas as 68 policies com `TO authenticated` 
- Manter as mesmas expressões USING e WITH CHECK
- Manter os mesmos comandos (SELECT, INSERT, UPDATE, DELETE, ALL)

---

## Detalhes Técnicos

A alteração envolve adicionar a cláusula `TO authenticated` em cada policy, garantindo que:

- `anon` (usuários não autenticados) NÃO tenham acesso
- Apenas usuários com sessão válida (`authenticated`) possam executar operações
- As expressões de segurança existentes (`auth.uid()`, `has_role()`, `get_user_company_id()`) continuem funcionando normalmente

---

## Impacto

- Nenhuma mudança de comportamento para usuários autenticados
- Maior segurança: rejeição explícita para usuários anônimos
- Conformidade com boas práticas de RLS do Supabase

