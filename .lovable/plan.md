
# Plano de Correção: Erro ao Aprovar Vendedor

## Problema Identificado

O erro ocorre ao tentar aprovar uma solicitação de acesso:

```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Causa raiz:** A tabela `user_roles` foi criada com constraint `UNIQUE (user_id, role)` (combinação das duas colunas), mas a função `approve_company_join_request` usa `ON CONFLICT (user_id)` que requer uma constraint UNIQUE apenas na coluna `user_id`.

**Estrutura atual incorreta:**
```sql
UNIQUE (user_id, role)  -- permite múltiplos roles por usuário
```

**Estrutura necessária:**
```sql
UNIQUE (user_id)  -- cada usuário tem apenas um role
```

---

## Solução

### Migração SQL

Criar uma nova migração que:

1. **Remove** a constraint UNIQUE atual em `(user_id, role)`
2. **Adiciona** nova constraint UNIQUE apenas em `user_id`

```sql
-- Remover constraint antiga
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Adicionar nova constraint UNIQUE apenas em user_id
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
```

Isso permitirá que a função `approve_company_join_request` funcione corretamente com `ON CONFLICT (user_id) DO UPDATE`.

---

## Detalhes Técnicos

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Constraint | `UNIQUE (user_id, role)` | `UNIQUE (user_id)` |
| Comportamento | Permitia múltiplos roles por usuário | Um role por usuário |
| ON CONFLICT | Não funcionava | Funciona corretamente |

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar para alterar constraint |

Nenhuma alteração de frontend é necessária - o problema está apenas no banco de dados.
