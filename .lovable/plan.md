
# Plano de Implementacao: Sistema de Hierarquia Multi-Usuario por Codigo Unico

## Resumo da Analise

Analisei a arquitetura existente e identifiquei:

- **CompanySetup.tsx**: Ja existe e cria empresa + define role ADMIN
- **AuthContext.tsx**: Gerencia autenticacao e busca role/company/subscription
- **ProtectedRoute.tsx**: Valida roles e status de assinatura
- **Sidebar.tsx**: Menu dinamico baseado em role (ADMIN/VENDEDOR/PRODUCAO)
- **Admin.tsx**: Pagina de gerenciamento de usuarios (usa dados mock)
- **Empresa.tsx**: Pagina da empresa (suporta upload de logo)

**Tabela companies**: Nao possui coluna `company_code` ainda
**Tabela user_roles**: Ja existe com tipos ADMIN, VENDEDOR, PRODUCAO, NENHUM

---

## Alteracoes Necessarias

### PARTE 1: Banco de Dados

**Migracao SQL para criar:**

1. **Coluna `company_code`** na tabela `companies`
   - Tipo: text, UNIQUE
   - Indice para busca rapida
   
2. **Function `generate_company_code()`**
   - Gera codigo aleatorio de 6 caracteres (A-Z, 0-9)
   - Verifica unicidade antes de retornar
   
3. **Trigger `auto_generate_company_code`**
   - Executa antes de INSERT na tabela companies
   - Gera codigo automaticamente se nulo
   
4. **Update para empresas existentes**
   - Gera codigos para empresas que nao possuem
   
5. **Tabela `company_join_requests`**
   - id, company_id, requester_user_id, requester_name, requester_email
   - requested_role (VENDEDOR ou PRODUCAO)
   - status (pending, approved, rejected)
   - approved_by, approved_at, rejected_reason
   - RLS policies para controle de acesso
   
6. **Function `approve_join_request()`**
   - SECURITY DEFINER
   - Valida que apenas owner da empresa pode aprovar
   - Atualiza profile com company_id
   - Atualiza user_roles com role solicitado
   - Marca request como approved
   
7. **Function `reject_join_request()`**
   - SECURITY DEFINER
   - Valida que apenas owner da empresa pode rejeitar
   - Marca request como rejected com motivo

---

### PARTE 2: Frontend - Novos Arquivos

#### 2.1 Pagina de Solicitacao de Acesso
**Arquivo:** `src/pages/CompanyJoin.tsx`

**Funcionalidades:**
- Campo para digitar codigo da empresa (6 caracteres)
- Selecao de role desejado (VENDEDOR ou PRODUCAO)
- Validacao do codigo contra tabela companies
- Criacao de solicitacao na tabela company_join_requests
- Tela de sucesso apos envio

**Fluxo:**
1. Usuario digita codigo da empresa
2. Sistema busca empresa pelo codigo
3. Usuario seleciona role (Vendedor ou Producao)
4. Sistema cria solicitacao pendente
5. Exibe mensagem de aguardando aprovacao

---

#### 2.2 Pagina de Gestao de Solicitacoes (Admin)
**Arquivo:** `src/pages/TeamRequests.tsx`

**Funcionalidades:**
- Lista solicitacoes pendentes da empresa
- Botao Aprovar (chama RPC approve_join_request)
- Botao Rejeitar (abre modal para motivo, chama RPC reject_join_request)
- Historico de solicitacoes processadas
- Badge com contador de pendentes

---

#### 2.3 Modal de Rejeicao
**Arquivo:** `src/components/team/RejectRequestModal.tsx`

**Funcionalidades:**
- Campo de texto para motivo (opcional)
- Botao confirmar rejeicao
- Botao cancelar

---

### PARTE 3: Modificacoes em Arquivos Existentes

#### 3.1 CompanySetup.tsx
**Modificacoes:**
- Apos criar empresa, exibir tela de sucesso com codigo gerado
- Botao para copiar codigo
- Instrucoes para compartilhar com equipe
- Botao "Ir para Dashboard"

**Novo fluxo:**
1. Usuario preenche dados da empresa
2. Sistema cria empresa (trigger gera codigo automaticamente)
3. Sistema exibe tela de sucesso com codigo visivel
4. Usuario pode copiar e ir para dashboard

---

#### 3.2 App.tsx - Novas Rotas
**Adicionar:**
- `/empresa/entrar` - CompanyJoin (requer autenticacao, sem empresa)
- `/equipe/solicitacoes` - TeamRequests (requer ADMIN)

**Logica de redirecionamento:**
- Usuario com subscription ativa mas sem company_id pode escolher:
  - Criar empresa (`/empresa/cadastro`)
  - Entrar em empresa existente (`/empresa/entrar`)

---

#### 3.3 Sidebar.tsx
**Adicionar para ADMIN:**
- Link "Solicitacoes" com icone UserPlus
- Badge com contador de solicitacoes pendentes

---

#### 3.4 Empresa.tsx
**Adicionar:**
- Card exibindo codigo da empresa
- Botao para copiar codigo
- Texto explicativo sobre compartilhamento

---

#### 3.5 ProtectedRoute.tsx
**Modificar:**
- Usuario sem company_id pode acessar:
  - `/empresa/cadastro` (criar)
  - `/empresa/entrar` (solicitar acesso)
- Usuario com solicitacao pendente ve modal de aguardando aprovacao

---

#### 3.6 AuthContext.tsx
**Adicionar ao AuthUser:**
- `pendingJoinRequest: boolean` - se tem solicitacao pendente

**Modificar fetchUserData:**
- Buscar se existe solicitacao pendente para o usuario

---

### PARTE 4: Componentes UI Reutilizaveis

#### 4.1 CompanyCodeDisplay
**Arquivo:** `src/components/team/CompanyCodeDisplay.tsx`

Componente para exibir codigo da empresa com botao de copiar:
- Codigo em destaque (font-mono, texto grande)
- Botao de copiar com feedback visual
- Texto explicativo

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   ├── CompanySetup.tsx      (modificar)
│   ├── CompanyJoin.tsx       (criar)
│   └── TeamRequests.tsx      (criar)
├── components/
│   └── team/
│       ├── CompanyCodeDisplay.tsx   (criar)
│       └── RejectRequestModal.tsx   (criar)
└── contexts/
    └── AuthContext.tsx       (modificar)
```

---

## Fluxos de Usuario

### Fluxo 1: Primeira Conta (Admin)
1. Usuario cria conta
2. Usuario paga assinatura
3. Usuario cadastra empresa
4. Sistema gera codigo unico
5. Sistema exibe codigo para compartilhar
6. Usuario vira ADMIN da empresa

### Fluxo 2: Segunda Conta (Vendedor/Producao)
1. Usuario cria conta
2. Usuario paga assinatura
3. Usuario escolhe "Entrar em empresa existente"
4. Usuario digita codigo da empresa
5. Usuario seleciona role desejado
6. Sistema cria solicitacao pendente
7. Admin recebe notificacao
8. Admin aprova/rejeita
9. Se aprovado, usuario acessa sistema

### Fluxo 3: Admin Gerencia Solicitacoes
1. Admin ve badge no menu "Solicitacoes"
2. Admin clica e ve lista de pendentes
3. Admin aprova ou rejeita cada uma
4. Sistema atualiza role e company_id do usuario

---

## Detalhes Tecnicos

### Geracao de Codigo
```sql
-- Gera codigo de 6 caracteres (A-Z, 0-9)
upper(substr(md5(random()::text), 1, 6))
```

### Validacao de Codigo
```typescript
const { data: company } = await supabase
  .from('companies')
  .select('id, company_name')
  .eq('company_code', code.toUpperCase())
  .single();
```

### Aprovacao de Solicitacao
```typescript
await supabase.rpc('approve_join_request', {
  request_id_input: requestId
});
```

### Contador de Pendentes no Sidebar
```typescript
const { count } = await supabase
  .from('company_join_requests')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', user.companyId)
  .eq('status', 'pending');
```

---

## Consideracoes de Seguranca

1. **RLS na tabela company_join_requests:**
   - SELECT: Admin ve da sua empresa, solicitante ve propria solicitacao
   - INSERT: Apenas usuario autenticado (requester_user_id = auth.uid())
   - UPDATE: Apenas owner da empresa

2. **Functions SECURITY DEFINER:**
   - approve_join_request valida owner antes de atualizar
   - reject_join_request valida owner antes de atualizar

3. **Validacao de role:**
   - Apenas VENDEDOR e PRODUCAO podem ser solicitados
   - ADMIN so pode ser definido pelo owner ao criar empresa

---

## Ordem de Implementacao

1. **Migracao SQL** - Criar tabela, functions, triggers
2. **AuthContext** - Adicionar pendingJoinRequest
3. **CompanyCodeDisplay** - Componente reutilizavel
4. **CompanySetup** - Exibir codigo apos criacao
5. **CompanyJoin** - Nova pagina de solicitacao
6. **RejectRequestModal** - Modal de rejeicao
7. **TeamRequests** - Pagina de gestao
8. **App.tsx** - Novas rotas
9. **Sidebar** - Link com contador
10. **Empresa.tsx** - Exibir codigo
11. **ProtectedRoute** - Logica de redirecionamento

