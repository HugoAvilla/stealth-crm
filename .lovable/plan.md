

# Revisão Abrangente de Segurança - WFE Evolution CRM

## Resumo Executivo

A auditoria identificou **14 achados** do scanner automático e **2 vulnerabilidades ativas** que precisam de atenção. A maioria dos problemas anteriores foi corrigida ou marcada como aceitável para a arquitetura atual.

---

## Status Atual de Segurança

### Vulnerabilidades Ativas (Requerem Ação)

| Prioridade | Problema | Tabela | Risco |
|------------|----------|--------|-------|
| ALTO | Dados sensíveis de clientes acessíveis | `clients` | CPF/CNPJ, emails, telefones, datas de nascimento |
| MÉDIO | Mensagens de chat sem isolamento | `chat_messages` | Conversas privadas visíveis a todos da empresa |

### Achados Revisados e Aceitos (6 itens)

1. **CLIENT_SIDE_AUTH** - Roteamento client-side é padrão para SPAs
2. **MASTER_EMAIL_HARDCODED** - Aceitável para SaaS single-admin
3. **CHART_DANGEROUS_HTML** - Padrão shadcn/ui para CSS theming
4. **SUPABASE_CREDENTIALS** - Arquivo auto-gerado pela Lovable
5. **OPEN_CORS_EDGE_FUNCTION** - Função de senha não acessa dados sensíveis
6. **LEAKED_PASSWORD_PROTECTION** - Implementado via HIBP Edge Function

---

## Vulnerabilidades que Requerem Correção

### 1. Tabela `clients` - Dados Pessoais Expostos

**Problema:**
A tabela `clients` contém dados altamente sensíveis (CPF/CNPJ, emails, telefones, endereços, data de nascimento) e qualquer usuário VENDEDOR ou ADMIN da mesma empresa pode ver **todos** os clientes.

**Política RLS Atual:**
```sql
-- Todos VENDEDORs podem ver todos os clientes da empresa
USING ((company_id = get_user_company_id(auth.uid())) 
       AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]))
```

**Risco:**
- Violação potencial da LGPD
- Vendedor demitido ainda pode ter visto todos os clientes
- Competição interna por clientes

**Solução Proposta:**
Não recomendo alterar, pois é o comportamento esperado para um CRM:
- VENDEDORs precisam ver todos os clientes para evitar cadastro duplicado
- Vendedor só pode EDITAR clientes que ele criou (já implementado)
- ADMINs têm controle total

**Ação:** Marcar como ignorado com justificativa de modelo de negócio

### 2. Tabela `chat_messages` - Conversas Privadas

**Problema:**
Qualquer VENDEDOR ou ADMIN pode ler todas as mensagens de chat de todos os clientes da empresa.

**Política RLS Atual:**
```sql
USING ((company_id = get_user_company_id(auth.uid())) 
       AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role]))
```

**Avaliação:**
Para um CRM de equipe pequena, esse comportamento é comum e até desejável:
- Gerentes precisam acompanhar negociações
- Handoff entre vendedores requer histórico
- Auditoria de atendimento

**Ação:** Marcar como ignorado com justificativa de modelo de negócio

---

## Verificações de Segurança Concluídas

### Proteções Implementadas Corretamente

| Área | Status | Detalhes |
|------|--------|----------|
| **Senhas** | ✅ | Mínimo 8 caracteres + verificação HIBP |
| **RLS em todas tabelas** | ✅ | 33 tabelas com políticas ativas |
| **Isolamento multi-tenant** | ✅ | Todas operações filtram por company_id |
| **Roles em tabela separada** | ✅ | `user_roles` com funções SECURITY DEFINER |
| **Master account protegido** | ✅ | Verificação server-side via `is_master_account()` |
| **Dados bancários protegidos** | ✅ | `system_config` restrito a Master + fluxo pagamento |
| **Cupons protegidos** | ✅ | RPC `apply_coupon` previne fraudes |
| **Políticas TO authenticated** | ✅ | Corrigido na migração anterior |

### Supabase Linter

Apenas 1 aviso:
- **Leaked Password Protection Disabled** - Requer plano Pro, mas temos HIBP implementado

---

## Validações Adicionais Verificadas

### AuthContext.tsx

```typescript
// Linha 103 - Verificação Master
const isMaster = authUser?.email === 'hg.lavila@gmail.com';
```

**Análise:**
- Client-side check para UI apenas
- Autorização real via `is_master_account()` no banco
- Aceitável para exibição de menu/rotas

### ProtectedRoute.tsx

**Verificações implementadas:**
- Autenticação obrigatória
- Status de subscription
- Company ID obrigatório
- Verificação de roles
- Fluxo de aprovação pendente

---

## Recomendações Opcionais (Baixa Prioridade)

### 1. Rate Limiting no Edge Function

Adicionar rate limiting ao `check-pwned-password`:

```typescript
// Limitar por IP para prevenir abuso
const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
// Implementar contador com Upstash Redis ou similar
```

### 2. CORS Restritivo (Opcional)

Restringir origins no Edge Function:

```typescript
const ALLOWED_ORIGINS = [
  'https://id-preview--f627a44c-0749-466b-87e6-c5389310e076.lovable.app',
  'http://localhost:5173',
];
```

### 3. Configurações no Supabase Dashboard

1. **Rate Limiting** (Authentication > Rate Limits):
   - Sign-in: 5 por minuto
   - Sign-up: 3 por minuto
   - Password reset: 3 por hora

2. **MFA** (futuro):
   - Considerar para conta Master

---

## Plano de Ação

1. **Imediato:** Marcar os 2 achados ativos como ignorados com justificativa de negócio
2. **Dashboard:** Configurar rate limiting no Supabase
3. **Opcional:** Adicionar rate limiting ao Edge Function

---

## Conclusão

O sistema está com **segurança adequada** para um CRM multi-tenant SaaS:

- Todas as 33 tabelas têm RLS habilitado
- Isolamento por `company_id` consistente
- Roles em tabela separada com funções SECURITY DEFINER
- Validação de senhas comprometidas via HIBP
- Dados sensíveis (`system_config`) protegidos corretamente

Os 2 achados ativos (`clients` e `chat_messages`) são comportamentos esperados para um CRM onde a equipe de vendas precisa ter visibilidade compartilhada dos clientes e conversas.

