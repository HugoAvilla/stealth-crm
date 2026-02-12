

# Plano: Atualizar Secrets e Retestar Gmail API

## Resumo
Os secrets ja foram cadastrados anteriormente, mas o teste retornou "The OAuth client was not found". Vamos verificar os valores atuais, re-cadastrar se necessario, e testar novamente.

## Passo 1: Verificar secrets existentes
Confirmar que os 3 secrets estao cadastrados corretamente no Supabase:
- **GOOGLE_CLIENT_ID**: `795735742039-ddf3gvbioqap540ag01m19ubl8n9t8qc.apps.googleusercontent.com`
- **GOOGLE_CLIENT_SECRET**: `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`
- **REFRESH_TOKEN**: ja cadastrado pelo usuario

## Passo 2: Re-deploy da Edge Function
Fazer o deploy da edge function `send-email` novamente para garantir que ela carregue os secrets atualizados.

## Passo 3: Testar envio
Chamar a edge function via curl com um email de teste para validar que o fluxo OAuth funciona corretamente.

## Passo 4: Diagnosticar (se necessario)
Se o erro persistir, verificar os logs da edge function para identificar qual etapa esta falhando (token exchange ou envio).

## Arquivos Afetados
Nenhuma alteracao de codigo necessaria. Apenas operacoes de secrets, deploy e teste.

