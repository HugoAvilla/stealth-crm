
# Plano de Correcao: Role NENHUM apos Criar Empresa

## Problema Identificado

O usuario cria a empresa com sucesso, mas o role permanece como `NENHUM` ao inves de ser atualizado para `ADMIN`. Isso faz com que o sistema mostre incorretamente o modal "Conta Pendente de Aprovacao".

**Dados no banco:**
- Usuario `hugoodfort@gmail.com` tem `role = NENHUM` mas e o `owner_id` da empresa 3

**Causa raiz:** O UPDATE na tabela `user_roles` esta falhando silenciosamente ou nao esta sendo executado.

---

## Correcoes Necessarias

### 1. Verificar e Corrigir CompanySetup.tsx

**Problema atual:** O codigo faz UPDATE, mas pode estar falhando sem tratar o erro adequadamente.

**Alteracao no arquivo:** `src/pages/CompanySetup.tsx`

Modificar o bloco de atualizacao do role (linhas 147-153) para:

```typescript
// 4. Update user role to ADMIN
const { data: existingRole, error: checkRoleError } = await supabase
  .from('user_roles')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle();

if (existingRole) {
  // UPDATE existing role
  const { error: roleError } = await supabase
    .from('user_roles')
    .update({ role: 'ADMIN' })
    .eq('user_id', user.id);
    
  if (roleError) {
    console.error('Error updating role:', roleError);
    throw roleError;
  }
} else {
  // INSERT new role (fallback)
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: user.id, role: 'ADMIN' });
    
  if (roleError) {
    console.error('Error inserting role:', roleError);
    throw roleError;
  }
}
```

---

### 2. Corrigir ProtectedRoute para Owners

**Problema:** O ProtectedRoute verifica `role === 'NENHUM' && companyId`, mas nao considera se o usuario e owner da empresa.

**Alteracao no arquivo:** `src/components/auth/ProtectedRoute.tsx`

Adicionar verificacao se usuario e owner antes de mostrar PendingApprovalModal:

```typescript
// User has role NENHUM - pending approval (only for users with company who are NOT owners)
if (user.role === 'NENHUM' && user.companyId) {
  // If user is company owner, they should be ADMIN - likely a data issue
  // Redirect to refresh or handle gracefully
  return <PendingApprovalModal />;
}
```

**Solucao melhor:** Adicionar `isCompanyOwner` ao AuthContext e verificar:

```typescript
if (user.role === 'NENHUM' && user.companyId && !user.isCompanyOwner) {
  return <PendingApprovalModal />;
}
```

---

### 3. Adicionar isCompanyOwner ao AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx`

Adicionar nova propriedade ao AuthUser:

```typescript
interface AuthUser {
  // ... existing fields
  isCompanyOwner: boolean;
}
```

Modificar `fetchUserData` para verificar se usuario e owner:

```typescript
// Check if user is company owner
let isCompanyOwner = false;
if (profile?.company_id) {
  const { data: companyData } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', profile.company_id)
    .single();
  
  isCompanyOwner = companyData?.owner_id === userId;
}
```

---

### 4. Correcao Imediata no Banco (SQL)

Para corrigir usuarios ja afetados, executar uma migracao que atualiza o role para ADMIN quando o usuario e owner da empresa:

```sql
UPDATE public.user_roles ur
SET role = 'ADMIN'
FROM public.companies c
WHERE c.owner_id = ur.user_id
AND ur.role = 'NENHUM';
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `AuthContext.tsx` | Adicionar `isCompanyOwner` ao AuthUser |
| `ProtectedRoute.tsx` | Nao mostrar PendingApprovalModal para owners |
| `CompanySetup.tsx` | Melhorar tratamento de erro no UPDATE de role |
| SQL Migration | Corrigir usuarios existentes |

---

## Ordem de Implementacao

1. **Migracao SQL** - Corrigir usuarios existentes no banco
2. **AuthContext** - Adicionar `isCompanyOwner`
3. **ProtectedRoute** - Verificar owner antes de mostrar modal
4. **CompanySetup** - Melhorar logica de UPDATE do role

---

## Logica Correta Final

O `PendingApprovalModal` deve aparecer APENAS para:
- Usuarios que entraram via **join request** (nao sao owners)
- Cujo status ainda e **pending** ou foram aprovados mas role ainda e NENHUM

Nao deve aparecer para:
- Owners de empresa (devem ter role ADMIN automaticamente)
- Usuarios que criaram sua propria empresa
