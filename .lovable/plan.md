
# Plano: Exclusão de Perfil no Master + Cupons Individuais + Remoção do Pipeline

## Resumo das Alterações

1. **Botão de Excluir Perfil** no Painel Master (exclusão completa do usuário)
2. **Cupons de Desconto Individuais** por usuário no Painel Master
3. **Remoção Completa do Pipeline** (módulo, rota, sidebar, botão no Dashboard)

---

## 1. Exclusão de Perfil Completo (Painel Master)

### Lógica de Exclusão

A exclusão de um usuário precisa remover dados em cascata de várias tabelas, respeitando as dependências:

```text
┌────────────────────────────────────────────────────────────────┐
│                  EXCLUSÃO DE USUÁRIO                           │
├────────────────────────────────────────────────────────────────┤
│  1. subscriptions (user_id)                                    │
│  2. coupon_usage (user_id)                                     │
│  3. user_roles (user_id)                                       │
│  4. profiles (user_id)                                         │
│  5. auth.users (id) - conta de autenticação                    │
└────────────────────────────────────────────────────────────────┘
```

### Migração SQL Necessária

Nova função RPC `master_delete_user`:

```sql
CREATE OR REPLACE FUNCTION public.master_delete_user(
  user_id_input UUID,
  reason_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Apenas conta master pode executar
  IF NOT is_master_account(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a conta Master pode excluir usuários';
  END IF;

  -- Buscar perfil para log
  SELECT * INTO v_profile FROM profiles WHERE user_id = user_id_input;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Registrar ação no log de auditoria
  INSERT INTO master_actions (action_type, target_id, details, performed_by)
  VALUES (
    'user_deleted',
    user_id_input::text,
    jsonb_build_object(
      'reason', reason_input,
      'email', v_profile.email,
      'name', v_profile.name
    ),
    auth.uid()
  );

  -- Excluir em cascata (a maioria já tem ON DELETE CASCADE)
  DELETE FROM subscriptions WHERE user_id = user_id_input;
  DELETE FROM coupon_usage WHERE user_id = user_id_input;
  DELETE FROM user_roles WHERE user_id = user_id_input;
  DELETE FROM profiles WHERE user_id = user_id_input;
  
  -- Deletar usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = user_id_input;

  RETURN true;
END;
$$;
```

### Alterações no Frontend

**Arquivo:** `src/components/master/SubscriptionsManager.tsx`

Adicionar na tabela de assinaturas:
- Novo botão de ação (ícone Trash2 vermelho)
- Modal de confirmação com campo de motivo
- Chamada RPC `master_delete_user`

---

## 2. Cupons Individuais por Usuário

### Conceito

Na aba "Assinaturas" do Painel Master, adicionar um botão para criar cupom exclusivo para aquele usuário específico. O cupom terá:
- `target_user_id` (novo campo na tabela `discount_coupons`)
- Limite de uso = 1
- Código gerado automaticamente baseado no nome do usuário

### Migração SQL Necessária

```sql
-- Adicionar coluna para cupom individual
ALTER TABLE public.discount_coupons 
ADD COLUMN target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Atualizar função de validação
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code_input text)
RETURNS TABLE (
  valid boolean,
  discount_type text,
  discount_value numeric,
  error_message text
)
-- Adicionar verificação: se target_user_id não é null, 
-- só é válido para aquele usuário
```

### Alterações no Frontend

**Arquivo:** `src/components/master/SubscriptionsManager.tsx`

Na linha de cada assinatura, adicionar:
- Botão "Criar Cupom" (ícone Tag)
- Modal para definir tipo e valor do desconto
- Código gerado: `{NOME_USUARIO}_{RANDOM4}` (ex: LUCAS_A7X2)

---

## 3. Remoção Completa do Pipeline

### Arquivos a Remover

| Arquivo/Diretório | Ação |
|-------------------|------|
| `src/pages/Pipeline.tsx` | Excluir |
| Tabelas do banco (pipelines, pipeline_*) | Manter (para futuro) |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Remover import e rota `/pipeline` |
| `src/components/layout/Sidebar.tsx` | Remover item "Pipeline" do navItems |
| `src/components/dashboard/QuickActions.tsx` | Remover botão "Ver Pipeline" |
| `src/pages/Dashboard.tsx` | Remover prop `onViewPipeline` |

### Detalhes das Modificações

**`src/App.tsx`:**
```tsx
// REMOVER:
import Pipeline from "./pages/Pipeline";

// REMOVER:
<Route path="/pipeline" element={...} />
```

**`src/components/layout/Sidebar.tsx`:**
```tsx
// REMOVER do array navItems:
{ icon: Target, label: 'Pipeline', path: '/pipeline' },
```

**`src/components/dashboard/QuickActions.tsx`:**
```tsx
// REMOVER:
- Prop onViewPipeline
- Botão "Ver Pipeline" do array actions

// ATUALIZAR interface:
interface QuickActionsProps {
  onNewSale: () => void;
  onNewSlot: () => void;
  onNewClient: () => void;
  // onViewPipeline removido
}
```

**`src/pages/Dashboard.tsx`:**
```tsx
// REMOVER:
- Prop onViewPipeline do QuickActions
```

---

## Estrutura de Arquivos Final

```
EXCLUIR:
  src/pages/Pipeline.tsx

MODIFICAR:
  src/App.tsx
  src/components/layout/Sidebar.tsx
  src/components/dashboard/QuickActions.tsx
  src/pages/Dashboard.tsx
  src/components/master/SubscriptionsManager.tsx

MIGRAÇÃO SQL:
  - Função master_delete_user
  - Coluna target_user_id na tabela discount_coupons
```

---

## Sequência de Implementação

| Ordem | Tarefa | Prioridade |
|-------|--------|------------|
| 1 | Criar migração SQL (master_delete_user + target_user_id) | Alta |
| 2 | Adicionar botão de excluir no SubscriptionsManager | Alta |
| 3 | Adicionar modal de confirmação de exclusão | Alta |
| 4 | Adicionar botão de criar cupom individual | Alta |
| 5 | Adicionar modal de criação de cupom individual | Alta |
| 6 | Remover Pipeline.tsx | Alta |
| 7 | Remover rota /pipeline do App.tsx | Alta |
| 8 | Remover item do Sidebar | Alta |
| 9 | Remover botão "Ver Pipeline" do QuickActions | Alta |
| 10 | Atualizar Dashboard.tsx | Alta |

---

## Resultado Esperado

### Painel Master - Aba Assinaturas

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Usuário          │ Empresa │ Preço │ Expira │ Status │     Ações       │
├──────────────────────────────────────────────────────────────────────────┤
│  Lucas Avila      │ Hg      │ R$297 │ 29/03  │ Expirado│ $ 📅 👥 ⚡ 🎫 🗑 │
│  hugoodfort@...   │ custom  │       │ 2026   │        │                 │
└──────────────────────────────────────────────────────────────────────────┘

Legenda dos ícones:
$ = Alterar Preço
📅 = Alterar Expiração  
👥 = Limite Membros
⚡ = Alterar Status
🎫 = Criar Cupom Individual (NOVO)
🗑 = Excluir Perfil (NOVO)
```

### Dashboard - Quick Actions (Sem Pipeline)

```text
┌─────────────────────────────────────────────────────────────┐
│  [+ Nova Venda]  [🚗 Preencher Vaga]  [👤 Novo Cliente]    │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (Sem Pipeline)

O item "Pipeline" será completamente removido da navegação lateral.

---

## Segurança

- Apenas conta Master pode excluir usuários (verificação via `is_master_account`)
- Todas as exclusões são registradas em `master_actions` com motivo
- Cupons individuais validam `target_user_id` na aplicação
- RLS mantido para todas as operações

