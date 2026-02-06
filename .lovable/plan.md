
# Plano: Correção do Bug de Tela Preta Após Pagamento e Cadastro da Empresa

## Diagnóstico do Problema

### Causa Raiz Identificada
Após o pagamento e cadastro da empresa, alguns usuários estão ficando com `role: NENHUM` em vez de `role: ADMIN`, causando um **loop de redirecionamento infinito**.

**Dados dos usuários afetados:**
| Email | É dono? | Company ID | Status Assinatura | Role |
|-------|---------|------------|-------------------|------|
| vinilcustom@gmail.com | Sim (owner_id = user_id) | 6 | active | **NENHUM** ❌ |
| christianguimaraes018@gmail.com | Sim (owner_id = user_id) | 5 | active | **NENHUM** ❌ |

### Fluxo do Bug

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Usuário autenticado tenta acessar "/" (Dashboard)                              │
│                           ↓                                                     │
│  ProtectedRoute verifica allowedRoles=['ADMIN', 'VENDEDOR']                     │
│                           ↓                                                     │
│  Usuário tem role='NENHUM' → não está na lista                                  │
│                           ↓                                                     │
│  ProtectedRoute redireciona para "/" (linha 84)                                 │
│                           ↓                                                     │
│  🔄 LOOP INFINITO → TELA PRETA                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Por Que a Role Não Foi Atualizada?

O problema está em `CompanySetup.tsx` (linhas 148-175):
1. Verifica se já existe uma role
2. Tenta UPDATE se existe, ou INSERT se não existe
3. **Possível falha**: O UPDATE pode ter falhado devido a RLS policies ou race condition

---

## Solução Proposta

### Parte 1: Correção Imediata dos Dados (SQL)

Atualizar a role dos donos de empresa que estão com `NENHUM`:

```sql
UPDATE user_roles ur
SET role = 'ADMIN'
FROM companies c
WHERE c.owner_id = ur.user_id
  AND ur.role = 'NENHUM';
```

### Parte 2: Correção do ProtectedRoute

Adicionar lógica para redirecionar donos de empresa com role `NENHUM` para uma tela de fallback em vez de criar loop:

**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

**Antes (linha 82-84):**
```tsx
if (allowedRoles && !allowedRoles.includes(user.role)) {
  return <Navigate to="/" replace />;
}
```

**Depois:**
```tsx
// Verificar se dono de empresa com role incorreta
if (user.role === 'NENHUM' && user.companyId && user.isCompanyOwner) {
  // Forçar refresh para tentar corrigir (pode ser problema de cache)
  // Ou redirecionar para página de erro/suporte
  return <Navigate to="/empresa" replace />;
}

if (allowedRoles && !allowedRoles.includes(user.role)) {
  // Evitar loop: se já está em "/" e não tem permissão, mostrar mensagem
  if (location.pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta ainda está sendo configurada. Por favor, aguarde ou entre em contato com o suporte.
          </p>
          <Button onClick={() => signOut()}>Sair</Button>
        </div>
      </div>
    );
  }
  return <Navigate to="/" replace />;
}
```

### Parte 3: Trigger Automático no Banco de Dados

Criar trigger para garantir que donos de empresa sempre tenham role ADMIN:

```sql
CREATE OR REPLACE FUNCTION ensure_owner_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma empresa é criada, garantir que o owner seja ADMIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.owner_id, 'ADMIN')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'ADMIN';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_ensure_owner_admin
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION ensure_owner_is_admin();
```

### Parte 4: Melhorar CompanySetup.tsx

Adicionar retry e melhor tratamento de erro ao atualizar role:

```tsx
// Na função handleSubmit, após criar a empresa:

// 4. UPSERT role para ADMIN (mais robusto)
const { error: roleError } = await supabase
  .from('user_roles')
  .upsert(
    { user_id: user.id, role: 'ADMIN' },
    { onConflict: 'user_id' }
  );

if (roleError) {
  console.error('Error setting ADMIN role:', roleError);
  // Não falhar silenciosamente - mostrar erro
  throw new Error('Erro ao configurar permissões. Por favor, contate o suporte.');
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/auth/ProtectedRoute.tsx` | Evitar loop infinito, tratar caso de owner com NENHUM |
| `src/pages/CompanySetup.tsx` | Usar UPSERT em vez de verificar/update/insert |
| Migração SQL | Trigger para garantir owner = ADMIN automaticamente |
| SQL One-time | Corrigir dados dos usuários afetados |

---

## Sequência de Implementação

| Ordem | Ação | Prioridade |
|-------|------|------------|
| 1 | Criar migração SQL com trigger e correção de dados | Alta |
| 2 | Atualizar ProtectedRoute para evitar loop | Alta |
| 3 | Melhorar CompanySetup com UPSERT | Alta |
| 4 | Testar fluxo completo de cadastro | Alta |

---

## Resultado Esperado

1. **Usuários afetados** (vinilcustom, christianguimaraes018) poderão acessar o CRM imediatamente após a correção
2. **Novos usuários** terão role ADMIN garantida pelo trigger ao criar empresa
3. **Nunca mais** haverá loop de redirecionamento causando tela preta

---

## Detalhes Técnicos

### Migração SQL Completa

```sql
-- 1. Corrigir usuários existentes que são donos com role NENHUM
UPDATE user_roles ur
SET role = 'ADMIN'
FROM companies c
WHERE c.owner_id = ur.user_id
  AND ur.role = 'NENHUM';

-- 2. Inserir role ADMIN para donos que não têm nenhuma role
INSERT INTO user_roles (user_id, role)
SELECT c.owner_id, 'ADMIN'
FROM companies c
LEFT JOIN user_roles ur ON ur.user_id = c.owner_id
WHERE ur.user_id IS NULL;

-- 3. Criar função para garantir ADMIN em novos donos
CREATE OR REPLACE FUNCTION public.ensure_owner_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.owner_id, 'ADMIN')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'ADMIN';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS trigger_ensure_owner_admin ON companies;
CREATE TRIGGER trigger_ensure_owner_admin
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION ensure_owner_is_admin();
```

### ProtectedRoute Atualizado

```tsx
export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireCompany = true,
  requireActiveSubscription = true,
  requireMaster = false
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, refreshUser, signOut } = useAuth();
  const location = useLocation();

  // ... código existente até linha 76 ...

  // NOVO: Tratar dono de empresa com role incorreta
  if (user.role === 'NENHUM' && user.companyId && user.isCompanyOwner) {
    // Tentar atualizar a role (possível fix automático)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Configurando sua conta...</h2>
          <p className="text-muted-foreground">
            Estamos finalizando a configuração. Por favor, aguarde.
          </p>
          <Button 
            variant="outline" 
            onClick={async () => {
              await refreshUser();
              window.location.reload();
            }}
          >
            Atualizar
          </Button>
        </div>
      </div>
    );
  }

  // Verificação existente de NENHUM para não-donos
  if (user.role === 'NENHUM' && user.companyId && !user.isCompanyOwner) {
    return <PendingApprovalModal />;
  }

  // MELHORADO: Evitar loop infinito
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Se já está na raiz, não redirecionar para ela mesma
    if (location.pathname === '/') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta área. 
              Entre em contato com o administrador da sua empresa.
            </p>
            <Button onClick={() => signOut()}>Sair</Button>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```
