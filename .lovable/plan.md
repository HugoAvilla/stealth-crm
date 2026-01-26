
# Plano de Implementacao Completa do CRM WFE EVOLUTION

## Resumo Executivo

Este plano aborda a implementacao de todos os **11 modulos restantes** do CRM, seguindo fielmente as especificacoes do PRD. Cada modulo sera construido com componentes reutilizaveis, mantendo a consistencia visual (tema dark military aviation) e arquitetural ja estabelecida.

---

## Modulos a Implementar

### 1. Modulo Espaco (Vagas)
**Arquivo principal:** `src/pages/Espaco.tsx`
**Componentes:**
- `src/components/espaco/NewSlotModal.tsx` - Modal para preencher vaga
- `src/components/espaco/SlotsDayDrawer.tsx` - Drawer com detalhes do dia
- `src/components/espaco/SlotCard.tsx` - Card de vaga (disponivel/ocupada)
- `src/components/espaco/SlotsChartsModal.tsx` - Graficos de ocupacao

**Funcionalidades:**
- Calendario mensal com chips de ocupacao (amarelo: em andamento, verde: finalizados)
- Grid de slots com estados: Disponivel, Acao de Preencher, Ocupada
- Cronometro de tempo no patio
- Upload de fotos de checklist (ate 20 fotos)
- Bloqueio de cadastro em dias futuros
- Tags de status: Em andamento, Pausado, Em espera, Finalizado

---

### 2. Modulo Financeiro
**Arquivo principal:** `src/pages/Financeiro.tsx`
**Componentes:**
- `src/components/financeiro/AddTransactionModal.tsx` - Entrada/Saida
- `src/components/financeiro/AddTransferModal.tsx` - Transferencia
- `src/components/financeiro/AddCategoryModal.tsx` - Categoria/Subcategoria
- `src/components/financeiro/AddAccountModal.tsx` - Nova conta
- `src/components/financeiro/FinancialSummaryCards.tsx` - Cards de resumo

**Funcionalidades:**
- Saldo geral com badge de contas
- Triade de cards: Saldo, Entradas, Saidas
- Grafico de evolucao do saldo (ultimos 7 dias)
- Cards de contas com saldo real e previsto
- Menu de adicao com 6 opcoes

---

### 3. Modulo Contas
**Arquivo principal:** `src/pages/Contas.tsx`
**Componentes:**
- `src/components/contas/AccountConfigModal.tsx` - Configurar conta
- `src/components/contas/TransactionDetailsModal.tsx` - Detalhes transacao
- `src/components/contas/AccountAnalytics.tsx` - Graficos de analise

**Funcionalidades:**
- Split layout: selecao de contas (esquerda) + analise (direita)
- 3 graficos: Formas de pagamento, Categorias, Evolucao
- Tabela de transacoes agrupada por data
- Filtros por periodo, categoria, status
- Botao ocultar informacoes

---

### 4. Modulo Relatorios
**Arquivo principal:** `src/pages/Relatorios.tsx`
**Componentes:**
- `src/components/relatorios/ReportConfigModal.tsx` - Modal generico
- `src/components/relatorios/ReportDFCModal.tsx` - DFC especifico
- `src/components/relatorios/ReportVendasModal.tsx` - Vendas especifico

**Funcionalidades:**
- Lista de 10 relatorios organizados por grupo
- Busca por nome do relatorio
- Modais de configuracao com filtros especificos por tipo
- Formatos: PDF, XLSX, CSV, OFX
- Preview e geracao de relatorios

---

### 5. Modulo Servicos
**Arquivo principal:** `src/pages/Servicos.tsx`
**Componentes:**
- `src/components/servicos/NewServiceModal.tsx` - Criar/editar servico

**Funcionalidades:**
- Tabela com: Nome, Preco, Pos-venda, Auto-agendamento, Vendas, Total
- Ordenacao: Mais vendidos, Maior faturamento, Nome A-Z
- Campos controlaveis por tags (Descricao, Comissao)

---

### 6. Modulo Garantias
**Arquivo principal:** `src/pages/Garantias.tsx`
**Componentes:**
- `src/components/garantias/NewWarrantyTemplateModal.tsx` - Modelo admin
- `src/components/garantias/IssueWarrantyModal.tsx` - Emitir garantia
- `src/components/garantias/SendEmailModal.tsx` - Enviar por email

**Funcionalidades:**
- Tabela de certificados com status
- Modelos com variaveis (cliente, veiculo, data)
- Geracao de PDF de certificado
- Envio por email (simulado)

---

### 7. Modulo Estoque
**Arquivo principal:** `src/pages/Estoque.tsx`
**Componentes:**
- `src/components/estoque/NewMaterialModal.tsx` - Novo material
- `src/components/estoque/StockEntryModal.tsx` - Entrada
- `src/components/estoque/StockExitModal.tsx` - Saida
- `src/components/estoque/ConsumptionRulesModal.tsx` - Regras P/M/G

**Funcionalidades:**
- Tabela com status de estoque (OK, Baixo, Critico)
- Entradas e saidas com motivo
- Matriz de consumo: Tamanho Carro x Categoria Material
- Integracao com vendas (baixa automatica)

---

### 8. Modulo Pipeline (Kanban)
**Arquivo principal:** `src/pages/Pipeline.tsx`
**Componentes:**
- `src/components/pipeline/PipelineColumn.tsx` - Coluna do kanban
- `src/components/pipeline/PipelineCard.tsx` - Card do cliente

**Funcionalidades:**
- 6 colunas: Agendados, Recebidos, Em Execucao, Controle Qualidade, Pronto, Entregue
- Drag-and-drop entre colunas
- Cards com: Modelo/Placa, Cliente, Servico, Horario
- Borda colorida: vermelho (atrasado), verde (no prazo)
- Automacao: notificar cliente ao mover para "Pronto"

---

### 9. Modulo Perfil
**Arquivo principal:** `src/pages/Perfil.tsx`
**Componentes:**
- `src/components/perfil/EditInfoModal.tsx` - Alterar informacoes
- `src/components/perfil/ChangePasswordModal.tsx` - Alterar senha

**Funcionalidades:**
- Cartao de identidade com avatar
- Toggle modo escuro
- Botao sair da conta
- Painel de assinatura com dias restantes
- Cards: Informacoes, Senha, Contrato

---

### 10. Modulo Sua Empresa
**Arquivo principal:** `src/pages/Empresa.tsx`
**Componentes:**
- `src/components/empresa/EditCompanyModal.tsx` - Editar dados

**Funcionalidades:**
- Upload de logo
- Paleta de 120+ cores para personalizar tema
- Dados: Nome, CNPJ, WhatsApp, Email, Endereco
- FAB de suporte no canto inferior direito

---

### 11. Modulo Admin
**Arquivo principal:** `src/pages/Admin.tsx`
**Componentes:**
- `src/components/admin/NewUserModal.tsx` - Criar usuario
- `src/components/admin/EditUserModal.tsx` - Editar usuario

**Funcionalidades:**
- Tabela de usuarios com papel e status
- Criar usuario com senha temporaria
- Permissoes: Admin (acesso total) vs Vendedor (restrito)
- Desativar/Excluir usuarios

---

## Atualizacoes no Mock Data

Adicionar ao `src/lib/mockData.ts`:
- `transactions` - Transacoes financeiras (entradas/saidas)
- `categories` - Categorias financeiras com cores
- `materials` - Materiais de estoque
- `consumptionRules` - Matriz de consumo P/M/G
- `warrantyTemplates` - Modelos de garantia
- `issuedWarranties` - Certificados emitidos
- `slots` - Vagas do espaco
- `companySettings` - Configuracoes da empresa

---

## Atualizacoes no App.tsx

Substituir todos os PlaceholderPage pelos componentes reais:
- `/espaco` -> `<Espaco />`
- `/financeiro` -> `<Financeiro />`
- `/contas` -> `<Contas />`
- `/relatorios` -> `<Relatorios />`
- `/servicos` -> `<Servicos />`
- `/garantias` -> `<Garantias />`
- `/estoque` -> `<Estoque />`
- `/pipeline` -> `<Pipeline />`
- `/perfil` -> `<Perfil />`
- `/empresa` -> `<Empresa />`
- `/admin` -> `<Admin />`

Todos envolvidos em `<MainLayout>` para manter sidebar e protecao.

---

## Ordem de Implementacao Recomendada

1. **Financeiro + Contas** (dependentes entre si)
2. **Espaco (Vagas)** (modulo operacional core)
3. **Pipeline** (kanban visual)
4. **Servicos** (CRUD simples)
5. **Estoque** (logica de consumo)
6. **Relatorios** (compilacao de dados)
7. **Garantias** (PDF/email)
8. **Perfil** (usuario)
9. **Empresa** (configuracoes)
10. **Admin** (gestao usuarios)

---

## Estimativa de Arquivos

- **11 paginas** novas
- **~35 componentes** novos
- **~500 linhas** adicionais no mockData
- **1 atualizacao** no App.tsx

---

## Consideracoes Tecnicas

- Usar `react-beautiful-dnd` ou logica nativa para drag-and-drop do Pipeline
- Graficos com `recharts` (ja instalado)
- Modais com `@radix-ui/react-dialog` (ja instalado)
- Tabelas com componentes UI existentes
- Manter padrao de hooks locais (useState) para estado
- Toasts com `sonner` para feedback
