

# Plano: Atualizar Refresh Token e Retestar

## Resumo
O usuario forneceu um novo Refresh Token. Vamos atualiza-lo nos secrets e retestar o envio de email.

## Passo 1: Atualizar o secret REFRESH_TOKEN
Substituir o valor atual do secret `REFRESH_TOKEN` pelo novo token fornecido.

## Passo 2: Re-deploy da Edge Function
Fazer deploy da `send-email` para garantir que carregue o novo token.

## Passo 3: Testar envio
Chamar a edge function via curl para validar que o fluxo OAuth funciona com o novo token.

## Passo 4: Remover logs de debug
Se o teste for bem-sucedido, remover os console.log de debug que expoem partes das credenciais.

## Arquivos Afetados
- `supabase/functions/send-email/index.ts` (remocao de debug logs apos sucesso)

## Detalhes Tecnicos
- O token fornecido sera salvo como secret `REFRESH_TOKEN` via ferramenta de secrets do Supabase
- A edge function ja possui sanitizacao de whitespace (.replace(/\s/g, ''))
- O teste sera feito com um POST para a funcao com um email de destino de teste

