
# Plano: Integracao Gmail SMTP para Envio de Emails de Garantia

## Resumo
Criar uma Edge Function que envia emails reais via Gmail SMTP e atualizar o modal de envio para usa-la. O email chegara com o nome "CRM WFE" para o cliente.

## Passo 1: Adicionar Secrets

Armazenar de forma segura as credenciais:
- **GMAIL_USER**: `Hg.lavila@gmail.com`
- **GMAIL_APP_PASSWORD**: `qiyg orxr elyk zxod`

## Passo 2: Criar Edge Function `send-email`

Arquivo: `supabase/functions/send-email/index.ts`

- Conectar ao SMTP do Gmail (`smtp.gmail.com:465`) usando o modulo `https://deno.land/x/smtp@v0.7.0/mod.ts`
- Configurar o remetente como `"CRM WFE" <Hg.lavila@gmail.com>` para que o cliente veja "CRM WFE" como nome do remetente
- Receber `to`, `subject`, `html` e `text` no body da requisicao
- Validar autenticacao JWT do usuario
- Retornar sucesso/erro

### Configuracao no config.toml:
```toml
[functions.send-email]
verify_jwt = false
```

## Passo 3: Atualizar `SendEmailModal.tsx`

- Importar o cliente Supabase
- No `handleSend`, chamar `supabase.functions.invoke('send-email', { body: { to, subject, html, text } })`
- Adicionar estado de loading com spinner no botao
- Tratar erros reais da Edge Function
- Montar corpo HTML profissional com dados da garantia (numero do certificado, cliente, etc.)

## Arquivos Afetados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Secrets (GMAIL_USER, GMAIL_APP_PASSWORD) | Novo | Credenciais Gmail armazenadas com seguranca |
| `supabase/config.toml` | Editar | Adicionar config da funcao send-email |
| `supabase/functions/send-email/index.ts` | Novo | Edge Function SMTP Gmail |
| `src/components/garantias/SendEmailModal.tsx` | Editar | Integrar com Edge Function real |

## Detalhes Tecnicos

### Edge Function - Estrutura principal:
```typescript
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Conexao SMTP
const client = new SMTPClient({
  connection: {
    hostname: "smtp.gmail.com",
    port: 465,
    tls: true,
    auth: {
      username: Deno.env.get("GMAIL_USER"),
      password: Deno.env.get("GMAIL_APP_PASSWORD"),
    },
  },
});

// Envio com nome "CRM WFE"
await client.send({
  from: { name: "CRM WFE", address: Deno.env.get("GMAIL_USER") },
  to: destinatario,
  subject: assunto,
  content: textoPlano,
  html: htmlFormatado,
});
```

### Nome do Remetente
O campo `from` sera configurado como `"CRM WFE" <Hg.lavila@gmail.com>`, fazendo com que o cliente veja **CRM WFE** como remetente na caixa de entrada.
