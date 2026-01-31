

# Plano: Limite de Contas e Configuracao de Email

## Analise do Problema

### 1. Confirmacao de Email Obrigatoria

O Supabase Auth esta configurado para exigir confirmacao de email por padrao. Quando um novo usuario cria conta, ele recebe um email de confirmacao e so pode fazer login apos clicar no link.

**Usuarios afetados no banco:**
- `ghastavila@gmail.com` - email_confirmed_at: NULL (nao confirmado)
- `hg.lavila1@gmail.com` - email_confirmed_at: NULL (nao confirmado)

**Solucao:** Isso e uma configuracao do Supabase que precisa ser alterada no dashboard. Existem duas opcoes:
- Manter a confirmacao de email (mais seguro)
- Desabilitar a confirmacao de email (menos seguro, mas mais facil para novos usuarios)

Para desabilitar, voce precisa acessar:
**Supabase Dashboard > Authentication > Providers > Email > Desativar "Confirm email"**

---

### 2. Limite de Contas Vinculadas

**Situacao atual:** Nao existe limite de quantas contas podem ser vinculadas a uma empresa.

**Alteracoes necessarias:**

---

## Implementacao do Limite de Contas

### PARTE 1: Banco de Dados

**Migracao SQL:**

1. Adicionar coluna `max_members` na tabela `companies`
   - Tipo: integer
   - Valor padrao: 5 (limite inicial)
   
2. Criar function para verificar limite antes de aprovar solicitacao
   - Validar se a empresa ainda tem vagas
   - Atualizar RPC `approve_company_join_request` para verificar limite

```sql
-- Adicionar coluna max_members
ALTER TABLE public.companies 
ADD COLUMN max_members integer NOT NULL DEFAULT 5;

-- Function auxiliar para contar membros atuais
CREATE OR REPLACE FUNCTION public.count_company_members(company_id_input bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE company_id = company_id_input;
$$;
```

---

### PARTE 2: Atualizar approve_company_join_request

Modificar a function para verificar se ha vagas disponiveis:

```sql
CREATE OR REPLACE FUNCTION public.approve_company_join_request(request_id_input bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_company RECORD;
  v_current_members integer;
BEGIN
  -- Get request
  SELECT * INTO v_request FROM public.company_join_requests 
  WHERE id = request_id_input AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada ou ja processada';
  END IF;

  -- Get company with max_members
  SELECT * INTO v_company FROM public.companies 
  WHERE id = v_request.company_id;

  -- Count current members
  SELECT COUNT(*) INTO v_current_members
  FROM public.profiles
  WHERE company_id = v_request.company_id;

  -- Check limit
  IF v_current_members >= v_company.max_members THEN
    RAISE EXCEPTION 'Limite de membros atingido (% de %)', 
      v_current_members, v_company.max_members;
  END IF;

  -- Update profile, role and request (existing logic)
  ...
END;
$$;
```

---

### PARTE 3: Frontend - Modal de Configuracao

**Novo arquivo:** `src/components/empresa/TeamSettingsModal.tsx`

Modal para o Admin configurar:
- Campo para definir limite de membros (1-50)
- Exibicao de membros atuais
- Botao salvar

---

### PARTE 4: Modificar Empresa.tsx

Adicionar:
- Botao de configuracoes ao lado do codigo da empresa
- Card mostrando membros atuais / limite
- Acesso ao modal de configuracoes

---

### PARTE 5: Validacao na Aprovacao (Frontend)

Modificar `TeamRequests.tsx`:
- Buscar limite atual da empresa
- Contar membros atuais
- Desabilitar botao "Aprovar" se limite atingido
- Exibir mensagem informativa

---

## Estrutura de Arquivos

```text
src/
├── components/
│   └── empresa/
│       └── TeamSettingsModal.tsx  (criar)
├── pages/
│   ├── Empresa.tsx               (modificar)
│   └── TeamRequests.tsx          (modificar)
```

---

## Interface do Usuario

### Card na pagina Empresa.tsx

```text
┌─────────────────────────────────────────────┐
│ 👥 Equipe                           ⚙️      │
├─────────────────────────────────────────────┤
│                                             │
│   Membros: 3 de 5                          │
│   [████████░░░░░░░░] 60%                   │
│                                             │
│   Codigo: ABC123  [Copiar]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Modal de Configuracoes

```text
┌──────────────────────────────────────┐
│ Configuracoes da Equipe         [X] │
├──────────────────────────────────────┤
│                                      │
│ Limite de Membros                    │
│ ┌──────────────────────────────┐     │
│ │ 5                        [-][+]    │
│ └──────────────────────────────┘     │
│                                      │
│ Minimo: 1 | Maximo: 50              │
│                                      │
│           [Salvar]                   │
│                                      │
└──────────────────────────────────────┘
```

---

## Ordem de Implementacao

1. **Migracao SQL** - Adicionar coluna max_members e atualizar RPC
2. **TeamSettingsModal.tsx** - Novo componente
3. **Empresa.tsx** - Adicionar card de equipe e botao de config
4. **TeamRequests.tsx** - Validar limite ao aprovar

---

## Sobre a Confirmacao de Email

Esta e uma configuracao de seguranca do Supabase. Voce pode:

**Opcao A: Manter (Recomendado)**
- Usuarios precisam confirmar email
- Mais seguro contra contas falsas
- Usuarios devem verificar pasta de spam

**Opcao B: Desabilitar**
- Usuarios podem entrar imediatamente
- Menos seguro
- Configurar em: Dashboard Supabase > Authentication > Providers > Email

Se quiser manter a confirmacao mas facilitar para usuarios existentes, posso criar uma migracao para confirmar os emails pendentes manualmente.

