
# Plano: Adicionar Coluna de Categoria (Role) no Painel Master

## Contexto do Fluxo de Negócio

O fluxo está correto:
- **Usuário faz pagamento** → **Cadastra empresa** → **Automaticamente vira ADMIN**
- O trigger `ensure_owner_is_admin` já garante isso automaticamente no banco

Os usuários afetados (vinilcustom e christianguimaraes018) agora estão com role ADMIN - a correção anterior funcionou.

---

## Alteração Necessária

Adicionar uma coluna "Categoria" na tabela de assinaturas do Painel Master para mostrar a role de cada usuário.

### Arquivo a Modificar

`src/components/master/SubscriptionsManager.tsx`

---

## Detalhes Técnicos

### 1. Atualizar Interface para Incluir Role

```typescript
interface SubscriptionWithRelations extends Subscription {
  profile?: {
    email: string;
    name: string;
  } | null;
  company?: {
    id: number;
    company_name: string;
    max_members: number;
  } | null;
  userRole?: string | null; // NOVO
}
```

### 2. Buscar Roles na Função fetchSubscriptions

Adicionar query para buscar user_roles junto com os outros dados:

```typescript
// Fetch user roles
const { data: roles } = await supabase
  .from("user_roles")
  .select("user_id, role")
  .in("user_id", userIds);

// Adicionar ao enrichedSubs
const enrichedSubs = (subs || []).map((sub) => ({
  ...sub,
  profile: profiles?.find((p) => p.user_id === sub.user_id) || null,
  company: companies?.find((c) => c.id === sub.company_id) || null,
  userRole: roles?.find((r) => r.user_id === sub.user_id)?.role || null,
}));
```

### 3. Adicionar Função para Badge da Role

```typescript
const getRoleBadge = (role: string | null | undefined) => {
  switch (role) {
    case "ADMIN":
      return <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>;
    case "VENDEDOR":
      return <Badge className="bg-blue-500/20 text-blue-400">Vendedor</Badge>;
    case "PRODUCAO":
      return <Badge className="bg-orange-500/20 text-orange-400">Produção</Badge>;
    case "NENHUM":
      return <Badge className="bg-gray-500/20 text-gray-400">Pendente</Badge>;
    default:
      return <Badge variant="secondary">—</Badge>;
  }
};
```

### 4. Adicionar Coluna na Tabela

No TableHeader:
```tsx
<TableHead>Usuário</TableHead>
<TableHead>Categoria</TableHead>  {/* NOVA COLUNA */}
<TableHead>Empresa</TableHead>
<TableHead>Preço</TableHead>
<TableHead>Expira em</TableHead>
<TableHead>Status</TableHead>
<TableHead className="text-right">Ações</TableHead>
```

No TableBody, após a célula de Usuário:
```tsx
<TableCell>
  {getRoleBadge(sub.userRole)}
</TableCell>
```

---

## Visualização Final

| Usuário | Categoria | Empresa | Preço | Expira | Status | Ações |
|---------|-----------|---------|-------|--------|--------|-------|
| Lucas Avila | Admin | Hg Custom | R$ 297 | 29/03/2026 | Expirado | ... |
| Vinil Custom | Admin | Vinil Custom | R$ 297 | ... | Ativo | ... |
| Novo Membro | Pendente | — | R$ 0 | ... | Aguardando | ... |

---

## Cores dos Badges por Categoria

| Role | Cor | Exemplo |
|------|-----|---------|
| ADMIN | Roxo | `bg-purple-500/20 text-purple-400` |
| VENDEDOR | Azul | `bg-blue-500/20 text-blue-400` |
| PRODUCAO | Laranja | `bg-orange-500/20 text-orange-400` |
| NENHUM | Cinza | `bg-gray-500/20 text-gray-400` |
