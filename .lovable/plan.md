
# Plano de Alteracoes - 5 Itens

## Item 1: Mostrar nomes das abas no mobile

Atualmente, na barra de navegacao mobile, os labels estao ocultos com `hidden sm:inline`. Vamos remover essa classe para que os nomes aparecam ao lado dos icones tambem no mobile, mantendo o scroll horizontal.

**Arquivo:** `src/components/layout/TopNavigation.tsx`
- Linha 134: trocar `<span className="hidden sm:inline">` por `<span className="text-[10px] sm:text-sm whitespace-nowrap">` para que o label apareca sempre, com tamanho reduzido no mobile

---

## Item 2: PDFs Baixados na aba Relatorios

A sub-aba "PDFs Baixados" ja existe em `src/pages/Relatorios.tsx` (linha 126) usando o componente `DownloadedPDFsTab` com module="relatorios". O componente `DownloadedPDFsTab` ja permite clicar para abrir o PDF via proxy URL.

Os relatorios ja buscam dados reais do banco de dados (verificado no `ReportConfigModal.tsx` - cada tipo de relatorio tem sua funcao dedicada que consulta Supabase). Todos os 10 relatorios estao integrados:
- DFC, DRE, Extrato de Conta -> tabela `transactions`
- Vendas por Periodo/Servico/Vendedor -> tabelas `sales`, `sale_items`
- Clientes Ativos/Inativos -> tabelas `clients`, `sales`
- Ocupacao de Vagas -> tabela `spaces`
- Movimentacao de Estoque -> tabela `stock_movements`

**Nenhuma alteracao necessaria neste item** - a funcionalidade ja esta implementada e integrada com o banco de dados. Os PDFs gerados aparecem na sub-aba "PDFs Baixados" e podem ser visualizados ao clicar.

---

## Item 3 (Item 4 do usuario): Pagina de Pagamento + Pagina de Liberacao

### Pagina de Pagamento (`src/pages/Subscription.tsx`)

Alteracoes:
- Atualizar os dados de pagamento PIX:
  - Chave PIX: `Hg.lavila@gmail.com` (tipo Email)
  - Banco: PicPay
  - Beneficiario: Hugo Luz de Avila
  - Remover QR Code (nao tem)
  - Remover CNPJ, agencia e conta (dados nao se aplicam ao PicPay)
- Adicionar secao descritiva do que o CRM entrega:
  - Gestao de vendas e clientes
  - Controle financeiro completo (DFC, DRE)
  - Gestao de espaco/vagas
  - Emissao de garantias com WhatsApp
  - Relatorios em PDF
  - Gestao de estoque
  - Pipeline de producao
  - Equipe com multiplos usuarios e permissoes
  - Suporte via WhatsApp

### Pagina de Liberacao (`src/pages/WaitingApproval.tsx`)

Alteracoes:
- Explicar ao usuario que a liberacao e feita manualmente pelo suporte
- Trocar o botao "Meu pagamento nao foi confirmado" por "Enviar Comprovante"
- Redirecionar para WhatsApp no numero +5517992573141
- Mensagem pre-pronta incluindo nome e email do usuario (ja disponiveis via `user` do AuthContext):
  ```
  Ola, fiz o pagamento da plataforma CRM WFE, segue o comprovante do pagamento e aguardo a liberacao para uso da plataforma.
  Nome: {nome do usuario}
  Email: {email do usuario}
  ```
- Usar link nativo `<a>` para evitar bloqueio de popup

---

## Item 4 (Item 5 do usuario): Painel Master - Preco Global + Limite de Expiracao

### Preco Global
Adicionar no `SubscriptionsManager.tsx` um botao "Alterar Preco Global" que:
- Abre um modal pedindo novo preco e motivo
- Atualiza `plan_price` e `final_price` de TODAS as assinaturas de uma vez
- Cria uma nova RPC `master_change_global_price` no banco que:
  - Atualiza todos os registros em `subscriptions`
  - Atualiza o `monthly_price` em `system_config`
  - Registra a acao em `master_actions`

### Limite de Expiracao por Periodo
Adicionar no `SubscriptionsManager.tsx` um botao "Definir Periodo de Expiracao" que:
- Permite selecionar: Mensal (1 mes), Bimestral (2 meses), Semestral (6 meses), Anual (12 meses)
- Ao ativar um usuario (mudar status para `active`), o sistema calcula automaticamente o `expires_at` baseado no periodo escolhido a partir da data de ativacao

Para isso:
- Modificar a funcao `handleChangeStatus` no `SubscriptionsManager`: quando o novo status for `active`, calcular `expires_at` automaticamente baseado no periodo selecionado (a partir de `now()`)
- Adicionar um Select de periodo dentro do modal de alterar status quando o novo status for `active`

**Migracao SQL necessaria:**
- Criar funcao RPC `master_change_global_price` para atualizar preco de todas as assinaturas e `system_config` em uma transacao

## Detalhes Tecnicos

### Arquivos a modificar:
1. `src/components/layout/TopNavigation.tsx` - mostrar labels no mobile
2. `src/pages/Subscription.tsx` - dados PIX e descricao do CRM
3. `src/pages/WaitingApproval.tsx` - botao enviar comprovante WhatsApp
4. `src/components/master/SubscriptionsManager.tsx` - preco global + periodo de expiracao
5. Migracao SQL - RPC `master_change_global_price`

### Nenhum arquivo novo necessario
