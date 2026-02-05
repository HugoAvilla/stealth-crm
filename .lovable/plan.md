
# Plano: Correcoes de Seguranca Criticas

## Resumo das Correcoes

Este plano aborda 3 vulnerabilidades de seguranca criticas identificadas na auditoria:

1. **Politicas RLS com TO public** - 6 tabelas expostas a acesso nao autenticado
2. **Dados bancarios expostos** - Tabela system_config acessivel a todos usuarios
3. **Padronizacao de requisitos de senha** - Inconsistencia entre 6 e 8 caracteres

---

## 1. Corrigir Politicas RLS com TO public

### Problema Identificado

As seguintes tabelas tem politicas RLS configuradas com `TO public` em vez de `TO authenticated`, permitindo potencialmente acesso sem autenticacao:

| Tabela | Politicas Afetadas |
|--------|-------------------|
| `product_types` | ALL, SELECT |
| `region_consumption_rules` | ALL, SELECT |
| `sales` | UPDATE (Admin), DELETE (Admin) |
| `service_items_detailed` | ALL, SELECT |
| `vehicle_regions` | ALL, SELECT |

### Risco
Mesmo que as politicas usem `auth.uid()` na expressao (que retorna NULL para usuarios nao autenticados), a configuracao `TO public` e uma ma pratica que pode causar problemas em cenarios especificos.

### Solucao
Recriar todas as politicas afetadas alterando de `TO public` para `TO authenticated`:

```sql
-- product_types
DROP POLICY IF EXISTS "Users can manage product_types from their company" ON product_types;
DROP POLICY IF EXISTS "Users can view product_types from their company" ON product_types;

CREATE POLICY "Users can manage product_types from their company"
  ON product_types FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view product_types from their company"
  ON product_types FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- region_consumption_rules
DROP POLICY IF EXISTS "Users can manage consumption_rules from their company" ON region_consumption_rules;
DROP POLICY IF EXISTS "Users can view consumption_rules from their company" ON region_consumption_rules;

CREATE POLICY "Users can manage consumption_rules from their company"
  ON region_consumption_rules FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view consumption_rules from their company"
  ON region_consumption_rules FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- sales (apenas UPDATE e DELETE do Admin)
DROP POLICY IF EXISTS "Admin can update all sales in company" ON sales;
DROP POLICY IF EXISTS "Only Admin can delete sales" ON sales;

CREATE POLICY "Admin can update all sales in company"
  ON sales FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) 
         AND has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Only Admin can delete sales"
  ON sales FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) 
         AND has_role(auth.uid(), 'ADMIN'::app_role));

-- service_items_detailed
DROP POLICY IF EXISTS "Users can manage service_items from their company" ON service_items_detailed;
DROP POLICY IF EXISTS "Users can view service_items from their company" ON service_items_detailed;

CREATE POLICY "Users can manage service_items from their company"
  ON service_items_detailed FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view service_items from their company"
  ON service_items_detailed FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- vehicle_regions
DROP POLICY IF EXISTS "Users can manage vehicle_regions from their company" ON vehicle_regions;
DROP POLICY IF EXISTS "Users can view vehicle_regions from their company" ON vehicle_regions;

CREATE POLICY "Users can manage vehicle_regions from their company"
  ON vehicle_regions FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view vehicle_regions from their company"
  ON vehicle_regions FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
```

---

## 2. Proteger Dados Bancarios (system_config)

### Problema Identificado

A tabela `system_config` contem dados sensiveis:
- Chave PIX: `pix@wfeevolution.com.br`
- Nome do beneficiario: `WFE Evolution LTDA`
- CNPJ: `00.000.000/0000-00`
- Dados bancarios: Banco, agencia, conta

A politica atual permite que **qualquer usuario autenticado** visualize esses dados:

```sql
-- Politica atual (VULNERAVEL)
USING (auth.uid() IS NOT NULL)
```

### Risco
Usuarios comuns podem acessar dados bancarios que deveriam ser visiveis apenas durante o fluxo de pagamento ou pelo Master.

### Solucao
Restringir o acesso apenas ao Master account:

```sql
DROP POLICY IF EXISTS "Authenticated users can view system config" ON system_config;

CREATE POLICY "Only master can view system config"
  ON system_config FOR SELECT TO authenticated
  USING (is_master_account(auth.uid()));
```

### Impacto na Aplicacao
A tela de pagamento (Subscription) busca dados de `system_config` para mostrar chave PIX. Sera necessario criar uma **Edge Function** para fornecer apenas os dados necessarios para o pagamento, sem expor tudo.

Alternativa mais simples: Criar uma politica que permite acesso durante o fluxo de assinatura:

```sql
CREATE POLICY "Users can view payment info for subscription"
  ON system_config FOR SELECT TO authenticated
  USING (
    is_master_account(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = auth.uid() 
      AND status IN ('pending_payment', 'payment_submitted')
    )
  );
```

---

## 3. Padronizar Requisitos de Senha (8 caracteres minimo)

### Problema Identificado

Inconsistencia nos requisitos de senha entre diferentes telas:

| Arquivo | Requisito Atual |
|---------|-----------------|
| `SignUp.tsx` | 6 caracteres (linha 140) |
| `ResetPassword.tsx` | 8 caracteres (linha 68) |
| `ChangePasswordModal.tsx` | 6 caracteres (linha 41) |

### Solucao
Padronizar para **8 caracteres minimo** em todos os fluxos:

**SignUp.tsx:**
```tsx
// Linha 136: placeholder
placeholder="Mínimo 8 caracteres"

// Linha 140: minLength
minLength={8}

// Adicionar validacao antes do submit
if (password.length < 8) {
  toast({
    title: 'Senha muito curta',
    description: 'A senha deve ter no mínimo 8 caracteres',
    variant: 'destructive',
  });
  return;
}
```

**ChangePasswordModal.tsx:**
```tsx
// Linha 41: alterar de 6 para 8
if (newPassword.length < 8) {
  toast.error("A nova senha deve ter pelo menos 8 caracteres");
  return;
}
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Recriar 10 politicas RLS com TO authenticated |
| Nova migracao SQL | Proteger system_config para Master + fluxo pagamento |
| `src/pages/SignUp.tsx` | Alterar minLength de 6 para 8, atualizar placeholder |
| `src/components/perfil/ChangePasswordModal.tsx` | Alterar validacao de 6 para 8 caracteres |

---

## Ordem de Implementacao

1. Criar migracao SQL para corrigir politicas TO public
2. Criar migracao SQL para proteger system_config
3. Atualizar SignUp.tsx com requisito de 8 caracteres
4. Atualizar ChangePasswordModal.tsx com requisito de 8 caracteres

---

## Nota sobre Rate Limiting e Leaked Password Protection

Essas configuracoes sao feitas diretamente no **Supabase Dashboard**, nao via codigo:

### Rate Limiting
1. Acesse: Supabase Dashboard > Authentication > Rate Limits
2. Configure limites para:
   - Sign-in attempts: 5 por minuto
   - Sign-up attempts: 3 por minuto
   - Password reset: 3 por hora

### Leaked Password Protection
1. Acesse: Supabase Dashboard > Authentication > Policies
2. Ative "Leaked password protection" (requer plano Pro)
3. Alternativa gratuita: ja implementada via HIBP Edge Function

---

## Resumo Visual das Correcoes

```text
ANTES                              DEPOIS
+----------------------------+     +----------------------------+
| product_types              |     | product_types              |
| TO public ⚠️               |     | TO authenticated ✅        |
+----------------------------+     +----------------------------+

+----------------------------+     +----------------------------+
| system_config              |     | system_config              |
| Qualquer usuario pode ver  |     | Apenas Master ou           |
| dados bancarios ⚠️         |     | fluxo de pagamento ✅      |
+----------------------------+     +----------------------------+

+----------------------------+     +----------------------------+
| Senha                      |     | Senha                      |
| 6 chars (signup)           |     | 8 chars (todos) ✅         |
| 8 chars (reset)            |     |                            |
| 6 chars (change) ⚠️        |     |                            |
+----------------------------+     +----------------------------+
```
