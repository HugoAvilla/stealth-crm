

# Novos Relatórios de Clientes: Lista de Marketing + Lista Completa (Backup)

O usuário do sistema pediu dois novos formatos de exportação na seção de Clientes dos Relatórios:

1. **Lista de Marketing** — Nome, telefone e email dos clientes (para campanhas)
2. **Lista Completa (Backup)** — Todos os dados dos clientes + veículos + histórico de serviços

## O que será feito

### 1. Adicionar 2 novos relatórios no `mockData.ts`

No array `reportTypes`, adicionar ao grupo `clientes`:

- `clientes_marketing` — "Lista de Marketing" — "Nome, telefone e email para campanhas"
- `clientes_completo` — "Lista Completa (Backup)" — "Todos os dados de clientes, veículos e serviços"

### 2. Implementar os geradores no `ReportConfigModal.tsx`

**Lista de Marketing (`generateClientesMarketingReport`):**
- Query: `clients` → select `name, phone, email` onde `company_id` = companyId
- Colunas: `#`, `Nome`, `Telefone`, `Email`
- Summary: total de clientes exportados

**Lista Completa/Backup (`generateClientesCompletoReport`):**
- Query: `clients` com join em `vehicles` e `sales(sale_date, total, sale_items(services(name)))`
- Colunas: `#`, `Nome`, `Telefone`, `Email`, `CPF/CNPJ`, `Veículos`, `Total Gasto`, `Última Compra`
- Summary: total de clientes, total de veículos, valor total

### 3. Adicionar os cases no `switch` do `handleGenerate`

Dois novos cases: `clientes_marketing` e `clientes_completo`.

## Arquivos a modificar

1. **`src/lib/mockData.ts`** — 2 novas entradas no array `reportTypes`
2. **`src/components/relatorios/ReportConfigModal.tsx`** — 2 novas funções geradoras + 2 cases no switch

Nenhum componente visual precisa mudar — os novos relatórios aparecerão automaticamente no bloco "Clientes" da página de Relatórios.

