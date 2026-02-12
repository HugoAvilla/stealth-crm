

# Plano: Migrar para Gmail API (OAuth 2.0) com novo email

## Resumo
Substituir o envio SMTP/nodemailer pelo Gmail API via OAuth 2.0 e atualizar o email remetente para `customapp01@gmail.com`.

## Passo 1: Adicionar Secrets OAuth

Cadastrar no Supabase:
- **GOOGLE_CLIENT_ID**: `795735742039-ddf3gvbioqap540ag01m19ubl8n9t8qc.apps.googleusercontent.com`
- **GOOGLE_CLIENT_SECRET**: `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`

Atualizar o secret existente:
- **GMAIL_USER**: alterar de `Hg.lavila@gmail.com` para `customapp01@gmail.com`

Secrets ja existentes que serao utilizados:
- **REFRESH_TOKEN**: ja cadastrado

Secrets que podem ser removidos depois:
- **GMAIL_APP_PASSWORD**: nao sera mais necessario

## Passo 2: Reescrever Edge Function `send-email`

Arquivo: `supabase/functions/send-email/index.ts`

Mudancas:
- Remover `nodemailer` completamente
- Usar Gmail API REST via `fetch`
- Fluxo:
  1. Receber `{ to, subject, html, text }` do body
  2. Obter access_token via `POST https://oauth2.googleapis.com/token` usando REFRESH_TOKEN, GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
  3. Montar email RFC 2822 com `From: "CRM WFE" <customapp01@gmail.com>`
  4. Codificar em base64url
  5. Enviar via `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
  6. Retornar sucesso ou erro
- Manter CORS headers e validacao de campos

## Passo 3: Frontend

Nenhuma alteracao necessaria. O `SendEmailModal.tsx` ja chama `supabase.functions.invoke('send-email')` com o formato correto.

## Arquivos Afetados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_USER) | Novo/Atualizar | Credenciais OAuth e novo email |
| `supabase/functions/send-email/index.ts` | Reescrever | Trocar SMTP por Gmail API REST |

