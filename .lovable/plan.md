
# Plano: Integrar API Have I Been Pwned (HIBP) para Verificação de Senhas Vazadas

## Objetivo

Implementar uma verificação automática de senhas vazadas durante o cadastro de usuários, utilizando a API pública e gratuita Have I Been Pwned (HIBP). Esta é uma alternativa à funcionalidade nativa do Supabase Pro.

---

## Como Funciona

A API HIBP usa um modelo chamado **k-Anonymity** que protege a privacidade do usuário:

1. O sistema gera um hash SHA-1 da senha
2. Envia apenas os **primeiros 5 caracteres** do hash para a API
3. A API retorna uma lista de todos os hashes que começam com esses 5 caracteres
4. O sistema verifica localmente se o hash completo está na lista
5. A senha nunca é enviada para nenhum servidor externo

```text
Fluxo de Verificação:

Senha → SHA-1 Hash → Primeiros 5 chars → API HIBP
                                            ↓
                     Verifica localmente ← Lista de hashes
                            ↓
                    Senha vazada? Sim/Não
```

---

## Arquitetura da Solução

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   SignUp.tsx    │────▶│  Edge Function       │────▶│  API HIBP       │
│   (Frontend)    │     │  check-pwned-password│     │  (Externo)      │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────────┐
│ AuthContext.tsx │     │  Retorna contagem    │
│ (Validação)     │     │  de vazamentos       │
└─────────────────┘     └──────────────────────┘
```

---

## Alterações Necessárias

### 1. Nova Edge Function: `check-pwned-password`

Criar função que:
- Recebe os primeiros 5 caracteres do hash SHA-1 da senha
- Consulta a API `https://api.pwnedpasswords.com/range/{prefix}`
- Retorna a lista de sufixos e contagens de vazamento
- Não requer API key (API pública gratuita)

### 2. Atualizar `supabase/config.toml`

Adicionar configuração para a nova edge function.

### 3. Atualizar `src/contexts/AuthContext.tsx`

Modificar a função `signUp` para:
- Gerar hash SHA-1 da senha no frontend (usando Web Crypto API nativa)
- Chamar a edge function com o prefixo do hash
- Verificar se a senha está na lista de vazadas
- Bloquear cadastro se a senha foi vazada

### 4. Atualizar `src/pages/SignUp.tsx`

- Melhorar feedback visual durante verificação
- Exibir mensagem amigável se senha foi vazada

---

## Detalhes Técnicos

### Edge Function (`supabase/functions/check-pwned-password/index.ts`)

```typescript
// Estrutura da função
- Recebe POST com { hashPrefix: string } (5 caracteres)
- Valida formato do prefixo (apenas hex, exatamente 5 chars)
- Chama api.pwnedpasswords.com/range/{prefix}
- Retorna lista de sufixos:contagens
- CORS habilitado para chamadas do frontend
```

### Geração do Hash SHA-1 (Frontend)

```typescript
// Usando Web Crypto API nativa (não precisa de biblioteca)
const encoder = new TextEncoder();
const data = encoder.encode(password);
const hashBuffer = await crypto.subtle.digest('SHA-1', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
const prefix = hashHex.substring(0, 5).toUpperCase();
const suffix = hashHex.substring(5).toUpperCase();
```

### Fluxo de Validação no SignUp

1. Usuário preenche senha
2. Ao clicar em "Criar conta":
   - Gera SHA-1 hash da senha
   - Extrai prefixo (5 chars) e sufixo
   - Chama edge function com prefixo
   - Procura sufixo na resposta
   - Se encontrado → bloqueia com mensagem de erro
   - Se não encontrado → prossegue com cadastro normal

---

## Mensagens de Erro (UX)

Quando a senha for detectada como vazada:

**Título:** "Senha comprometida"

**Mensagem:** "Esta senha foi encontrada em vazamentos de dados conhecidos. Por favor, escolha uma senha diferente e mais segura para proteger sua conta."

---

## Vantagens

- **Gratuito**: API HIBP não cobra para uso
- **Privado**: Senha nunca sai do navegador (apenas hash parcial)
- **Rápido**: Consulta leva menos de 500ms
- **Seguro**: Modelo k-Anonymity é padrão da indústria
- **Sem dependências**: Usa apenas Web Crypto API nativa

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/check-pwned-password/index.ts` | Criar |
| `supabase/config.toml` | Modificar |
| `src/contexts/AuthContext.tsx` | Modificar |
| `src/pages/SignUp.tsx` | Modificar |

---

## Impacto

- Nenhuma alteração no banco de dados
- Nenhuma dependência externa adicional
- Compatível com o plano gratuito do Supabase
- Melhora significativa na segurança de senhas dos usuários
