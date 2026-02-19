
# Plano de Correcoes - 6 Problemas

## 1. PDF nao abre ("PDF nao disponivel para visualizacao")

**Problema:** A funcao `generateReportPDF` chama `saveAndUploadPDF` que e async (faz upload ao Supabase Storage), porem `generateReportPDF` nao e async e nao usa `await`. O upload nunca completa antes do `savePDFRecord` registrar o metadata, entao o `storagePath` pode ficar `undefined`.

**Solucao:**
- Arquivo: `src/lib/pdfGenerator.ts`
- Tornar `generateReportPDF` async e usar `await saveAndUploadPDF(...)`
- Fazer o mesmo para todas as funcoes de geracao de PDF que chamam `saveAndUploadPDF` sem await
- Arquivo: `src/components/relatorios/ReportConfigModal.tsx`
- Adicionar `await` na chamada de `generateReportPDF`

## 2. Erro ao alterar preco global

**Problema:** A funcao SQL `master_change_global_price` faz o UPDATE no `system_config` ANTES de ler o `monthly_price` antigo para o log. O INSERT no `master_actions` le o valor ja atualizado. Alem disso, pode haver problema de tipagem no RPC.

**Solucao:**
- Migracao SQL: Recriar a funcao `master_change_global_price` lendo o `old_value` ANTES de fazer o UPDATE

## 3. Erro ao excluir usuario (FK constraint master_actions)

**Problema:** A funcao `master_delete_user` exclui `subscriptions` antes de limpar `master_actions` que referenciam essas subscriptions via `target_subscription_id`. O erro e: `"master_actions_target_subscription_id_fkey" violates foreign key constraint`.

**Solucao:**
- Migracao SQL: Atualizar a funcao `master_delete_user` para setar `target_subscription_id = NULL` nos registros de `master_actions` que referenciam as subscriptions do usuario ANTES de deletar as subscriptions

## 4. WhatsApp link bloqueado (api.whatsapp.com)

**Problema:** O link esta usando `api.whatsapp.com/send/?phone=...` em vez de `https://wa.me/5517992573141?text=...`. O dominio `api.whatsapp.com` e bloqueado por alguns navegadores/extensoes.

**Solucao:**
- Arquivo: `src/pages/WaitingApproval.tsx`
- O codigo ja usa `https://wa.me/...` (linha 75), entao o link deve estar correto. Porem a screenshot mostra `api.whatsapp.com` na barra de endereco, o que sugere que o `wa.me` esta redirecionando para `api.whatsapp.com`. Isso e um comportamento do WhatsApp que nao controlamos. O link `https://wa.me/` ja e o formato correto e funcionara quando o usuario tiver o WhatsApp instalado ou usar pelo celular.

## 5. Remover contagem regressiva e botao "Verificar agora"

**Problema:** O usuario pediu para remover a contagem regressiva de verificacao e o botao preto de "Verificar agora", mantendo apenas o botao verde.

**Solucao:**
- Arquivo: `src/pages/WaitingApproval.tsx`
- Remover o bloco de countdown (linhas 110-115)
- Remover o botao "Verificar agora" (linhas 151-168)
- Manter a verificacao automatica silenciosa em background (sem mostrar ao usuario)

## 6. Status Global (bonus - solicitado pelo usuario)

**Problema:** O usuario quer uma funcao de "Status Global" similar ao "Preco Global", que defina o periodo de expiracao para TODOS os usuarios ativos de uma vez.

**Solucao:**
- Migracao SQL: Criar RPC `master_change_global_expiration` que:
  - Recebe periodo em meses e motivo
  - Atualiza `expires_at` de todas as subscriptions com status `active` para `now() + periodo`
  - Registra acao em `master_actions`
- Arquivo: `src/components/master/SubscriptionsManager.tsx`
  - Adicionar botao "Expiracao Global" ao lado do "Preco Global"
  - Adicionar modal com seletor de periodo (Mensal, Bimestral, Semestral, Anual) e campo motivo

## Detalhes Tecnicos

### Arquivos a modificar:
1. `src/lib/pdfGenerator.ts` - tornar funcoes async
2. `src/components/relatorios/ReportConfigModal.tsx` - await na geracao
3. `src/pages/WaitingApproval.tsx` - remover countdown e botao verificar
4. `src/components/master/SubscriptionsManager.tsx` - botao + modal Expiracao Global
5. Migracao SQL - corrigir `master_change_global_price`, `master_delete_user`, criar `master_change_global_expiration`
