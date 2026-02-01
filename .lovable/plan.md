
# Implementacao Final: Integracao Completa de Estoque, Servicos e Limpeza de Dados

## Resumo Executivo

Este plano implementa a integracao completa entre os modulos de Estoque, Regras PMG, Servicos e Vendas, alem de ajustes especificos em Garantias, Relatorios, Clientes, Contas e Financeiro. Tambem remove todos os dados ficticios (mock) substituindo por dados reais do Supabase.

---

## Analise do Estado Atual

### O Que Ja Existe no Banco de Dados (Supabase)

| Tabela | Status | Observacoes |
|--------|--------|-------------|
| `materials` | Existe | Campos: name, type, brand, unit, current_stock, minimum_stock, average_cost, company_id |
| `consumption_rules` | Existe | Campos: material_type, size_p, size_m, size_g, company_id |
| `stock_movements` | Existe | Campos: material_id, movement_type, quantity, reason, user_id, company_id |
| `services` | Existe | Campos: name, base_price, description, commission_percentage, company_id |
| `sales` | Existe | Campos: client_id, vehicle_id, total, discount, is_open, payment_method, company_id |
| `sale_items` | Existe | Campos: sale_id, service_id, unit_price, quantity, total_price |
| `accounts` | Existe | Campos: name, account_type, current_balance, is_main, company_id |
| `transactions` | Existe | Campos: name, amount, type, account_id, is_paid, sale_id, company_id |
| `vehicles` | Existe | Campos: brand, model, year, plate, size, client_id, company_id |

### O Que Esta Usando Mock Data (Frontend)

| Pagina | Usa Mock | Arquivo de Mock |
|--------|----------|-----------------|
| Estoque | Sim | `materials` de mockData.ts |
| Servicos | Sim | `services` de mockData.ts |
| Vendas | Sim | `sales`, `clients` de mockData.ts |
| Clientes | Sim | `clients` de mockData.ts |
| Financeiro | Sim | `accounts`, `transactions` de mockData.ts |
| Contas | Sim | `accounts`, `transactions` de mockData.ts |
| Garantias | Sim | `issuedWarranties`, `warrantyTemplates` de mockData.ts |
| Relatorios | Sim | `reportTypes` de mockData.ts |
| Dashboard | Sim | `dashboardStats` de mockData.ts |

---

## Parte 1: Integracao Estoque + Servicos (Dados Reais)

### 1.1 Atualizar Pagina de Estoque (`src/pages/Estoque.tsx`)

**Mudancas:**
- Remover import de `materials` do mockData
- Adicionar fetch de materiais do Supabase com filtro por `company_id`
- Implementar CRUD real (criar, editar, excluir materiais)
- Movimentacoes (entrada/saida) salvam em `stock_movements` e atualizam `current_stock`
- Adicionar estado de loading e empty state

```text
Fluxo de Dados:
Usuario -> Estoque.tsx -> supabase.from('materials') -> Banco de Dados
```

### 1.2 Atualizar Modal de Regras de Consumo (`src/components/estoque/ConsumptionRulesModal.tsx`)

**Mudancas:**
- Remover `consumptionRules`, `materials`, `services` do mockData
- Buscar materiais e regras do Supabase
- Permitir edicao inline dos valores P/M/G
- Salvar regras com upsert (criar ou atualizar)

### 1.3 Atualizar Pagina de Servicos (`src/pages/Servicos.tsx`)

**Mudancas:**
- Remover import de `services` do mockData
- Buscar servicos do Supabase
- Implementar CRUD real
- Calcular vendas e receita a partir de `sale_items`

### 1.4 Atualizar Modal de Nova Venda (`src/components/vendas/NewSaleModal.tsx`)

**Mudancas:**
- Buscar clientes e servicos do Supabase
- Ao criar venda:
  1. Inserir em `sales`
  2. Inserir itens em `sale_items`
  3. Se nao estiver em aberto, criar transacao em `transactions`
  4. Chamar funcao de consumo automatico de estoque

### 1.5 Funcao de Baixa Automatica de Estoque

**Nova funcao utilitaria:** `src/lib/stockConsumption.ts`

```text
Fluxo:
1. Venda criada -> buscar vehicle.size
2. Buscar regras de consumo (consumption_rules)
3. Para cada regra com consumo > 0:
   - Verificar estoque disponivel
   - Atualizar materials.current_stock
   - Registrar em stock_movements
4. Mostrar alertas se estoque insuficiente
```

---

## Parte 2: Ajustes Especificos

### 2.1 Garantias - Envio por E-mail

**Arquivo:** `src/pages/Garantias.tsx` e `src/components/garantias/SendEmailModal.tsx`

**Mudancas:**
- Ja existe botao "Enviar por Email" que abre modal
- Atualizar para gerar PDF real e preparar dados para envio
- Adicionar toast informando que o envio sera implementado com servico externo (Resend, SendGrid)

### 2.2 Relatorios - Manter Apenas PDF

**Arquivo:** `src/lib/mockData.ts` - linha 500-511

**Mudancas:**
- Alterar todos os `formats` para conter apenas `["pdf"]`
- Remover opcoes xlsx, csv, ofx da interface

**Arquivo:** `src/components/relatorios/ReportConfigModal.tsx`

**Mudancas:**
- Simplificar logica para sempre gerar PDF
- Remover selecao de formato (ou manter apenas PDF)

### 2.3 Clientes - Remover Botao de Ligacao + Scroll

**Arquivo:** `src/pages/Clientes.tsx`

**Mudancas:**
- O botao de chat ja existe (MessageCircle) - manter
- Nao existe botao de ligacao no codigo atual - nenhuma mudanca necessaria

**Arquivo:** `src/components/clientes/EditClientModal.tsx`

**Mudancas:**
- Ja usa `ScrollArea` na linha 114 - confirmar funcionamento
- Se necessario, ajustar `max-h` do DialogContent

### 2.4 Contas - Criar Conta no Banco

**Arquivo:** `src/components/financeiro/AddAccountModal.tsx`

**Mudancas:**
- Atualmente apenas mostra toast - nao salva no banco
- Implementar insert em `accounts` com company_id
- Atualizar parent component para recarregar lista

### 2.5 Financeiro - Transacao Automatica com Vendas

**Integracao:** Quando venda for fechada (is_open = false)

**Mudancas:**
- Ao criar venda fechada, criar automaticamente uma transacao de entrada
- Vincular transacao a venda via `sale_id`
- Atualizar saldo da conta principal

---

## Parte 3: Substituir Mock Data por Dados Reais

### 3.1 Arquivos a Modificar

| Arquivo | Acao | Prioridade |
|---------|------|------------|
| `src/pages/Estoque.tsx` | Fetch Supabase | Alta |
| `src/pages/Servicos.tsx` | Fetch Supabase | Alta |
| `src/pages/Vendas.tsx` | Fetch Supabase | Alta |
| `src/pages/Clientes.tsx` | Fetch Supabase | Alta |
| `src/pages/Financeiro.tsx` | Fetch Supabase | Alta |
| `src/pages/Contas.tsx` | Fetch Supabase | Alta |
| `src/pages/Garantias.tsx` | Fetch Supabase | Media |
| `src/pages/Dashboard.tsx` | Fetch Supabase | Media |
| `src/components/vendas/NewSaleModal.tsx` | Fetch + Insert | Alta |
| `src/components/estoque/ConsumptionRulesModal.tsx` | Fetch + Upsert | Alta |
| `src/lib/mockData.ts` | Manter tipos, remover dados | Media |

### 3.2 Padrao de Implementacao

Cada pagina seguira este padrao:

```typescript
// 1. Imports
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// 2. Estado
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

// 3. Fetch com company_id
useEffect(() => {
  const fetchData = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user?.id)
      .single();

    const { data } = await supabase
      .from('table_name')
      .select('*')
      .eq('company_id', profile?.company_id);

    setData(data || []);
    setLoading(false);
  };
  fetchData();
}, [user]);

// 4. Renderizacao com empty state
{loading ? <Skeleton /> : data.length === 0 ? <EmptyState /> : <DataTable />}
```

### 3.3 Dashboard - Metricas Reais

**Arquivo:** `src/pages/Dashboard.tsx`

**Mudancas:**
- Remover `dashboardStats` do mockData
- Calcular metricas a partir de queries reais:
  - Faturamento: SUM de sales.total do mes
  - Ticket Medio: AVG de sales.total
  - Novos Clientes: COUNT de clients criados no mes
  - Vagas Ocupadas: COUNT de spaces com status ocupado

---

## Parte 4: Limpeza de Dados Ficticios

### 4.1 Dados a Remover do `mockData.ts`

| Array | Acao |
|-------|------|
| `users` | Manter tipos, remover dados (auth.users e profiles usados) |
| `clients` | Manter tipos, remover dados |
| `services` | Manter tipos, remover dados |
| `sales` | Manter tipos, remover dados |
| `accounts` | Manter tipos, remover dados |
| `transactions` | Manter tipos, remover dados |
| `materials` | Manter tipos, remover dados |
| `consumptionRules` | Manter tipos, remover dados |
| `slots` | Manter tipos, remover dados |
| `warrantyTemplates` | Manter tipos, remover dados |
| `issuedWarranties` | Manter tipos, remover dados |
| `dashboardStats` | Remover completamente |
| `pipelineItems` | Manter tipos, remover dados |
| `clientMessages` | Manter tipos, remover dados |

### 4.2 Manter no `mockData.ts`

- Interfaces/tipos (Client, Vehicle, Service, etc.)
- Helper functions (getClientById, etc.) - adaptar para dados reais ou remover
- `reportTypes` - manter com formatos atualizados (apenas PDF)

---

## Estrutura de Arquivos a Criar/Modificar

```text
src/
├── lib/
│   ├── stockConsumption.ts        (CRIAR - funcao de baixa automatica)
│   └── mockData.ts                (MODIFICAR - remover dados, manter tipos)
├── pages/
│   ├── Estoque.tsx                (MODIFICAR - fetch Supabase)
│   ├── Servicos.tsx               (MODIFICAR - fetch Supabase)
│   ├── Vendas.tsx                 (MODIFICAR - fetch Supabase)
│   ├── Clientes.tsx               (MODIFICAR - fetch Supabase)
│   ├── Financeiro.tsx             (MODIFICAR - fetch Supabase)
│   ├── Contas.tsx                 (MODIFICAR - fetch Supabase)
│   ├── Garantias.tsx              (MODIFICAR - fetch Supabase)
│   └── Dashboard.tsx              (MODIFICAR - fetch Supabase)
├── components/
│   ├── vendas/
│   │   └── NewSaleModal.tsx       (MODIFICAR - fetch + insert + stock)
│   ├── estoque/
│   │   ├── ConsumptionRulesModal.tsx (MODIFICAR - fetch + upsert)
│   │   ├── NewMaterialModal.tsx   (MODIFICAR - insert Supabase)
│   │   ├── StockEntryModal.tsx    (MODIFICAR - insert movement)
│   │   └── StockExitModal.tsx     (MODIFICAR - insert movement)
│   ├── financeiro/
│   │   └── AddAccountModal.tsx    (MODIFICAR - insert Supabase)
│   ├── servicos/
│   │   └── NewServiceModal.tsx    (MODIFICAR - insert/update Supabase)
│   └── relatorios/
│       └── ReportConfigModal.tsx  (MODIFICAR - apenas PDF)
```

---

## Ordem de Implementacao Recomendada

### Fase 1: Base de Dados (Prioridade Alta)
1. Estoque.tsx - fetch e CRUD de materiais
2. ConsumptionRulesModal.tsx - fetch e edicao de regras
3. Servicos.tsx - fetch e CRUD de servicos
4. stockConsumption.ts - criar funcao utilitaria

### Fase 2: Vendas e Financeiro (Prioridade Alta)
5. NewSaleModal.tsx - buscar dados reais + integrar baixa de estoque
6. Vendas.tsx - fetch de vendas reais
7. AddAccountModal.tsx - salvar contas no banco
8. Financeiro.tsx e Contas.tsx - fetch de dados reais

### Fase 3: Outras Paginas (Prioridade Media)
9. Clientes.tsx - fetch de clientes reais
10. Garantias.tsx - fetch de garantias reais
11. Dashboard.tsx - calcular metricas reais

### Fase 4: Limpeza Final (Prioridade Media)
12. ReportConfigModal.tsx - simplificar para apenas PDF
13. mockData.ts - remover dados, manter tipos
14. Testar todos os fluxos end-to-end

---

## Detalhes Tecnicos

### Triggers Existentes no Banco

Os seguintes triggers ja existem e funcionam automaticamente:

| Trigger | Tabela | Funcao |
|---------|--------|--------|
| `update_stock_on_movement` | `stock_movements` | Atualiza `materials.current_stock` |
| `update_account_balance` | `transactions` | Atualiza `accounts.current_balance` |
| `process_transfer` | `transfers` | Processa transferencias entre contas |

**Importante:** Nao precisamos atualizar manualmente o estoque ao inserir movimentacao - o trigger faz isso automaticamente.

### Seguranca (RLS)

Todas as tabelas possuem RLS habilitado com policies baseadas em `company_id`. Isso garante que cada empresa so ve seus proprios dados.

### Tipos TypeScript

Os tipos em `src/integrations/supabase/types.ts` sao gerados automaticamente pelo Supabase e refletem a estrutura atual do banco.

---

## Estimativa de Complexidade

| Componente | Complexidade | Estimativa |
|------------|--------------|------------|
| Estoque.tsx | Media | 15 min |
| ConsumptionRulesModal.tsx | Media | 10 min |
| Servicos.tsx | Media | 10 min |
| NewSaleModal.tsx | Alta | 20 min |
| stockConsumption.ts | Media | 15 min |
| Vendas.tsx | Media | 10 min |
| Clientes.tsx | Media | 10 min |
| Financeiro.tsx + Contas.tsx | Media | 15 min |
| AddAccountModal.tsx | Baixa | 5 min |
| Garantias.tsx | Media | 10 min |
| Dashboard.tsx | Media | 15 min |
| ReportConfigModal.tsx | Baixa | 5 min |
| mockData.ts cleanup | Baixa | 5 min |
| **Total** | | ~145 min |

---

## Resultado Final Esperado

Apos a implementacao:

1. Todas as paginas buscarao dados reais do Supabase
2. Nenhum dado ficticio sera exibido
3. Estoque sera atualizado automaticamente ao criar vendas
4. Transacoes financeiras serao criadas automaticamente para vendas fechadas
5. Relatorios exportarao apenas em PDF
6. Empty states serao exibidos quando nao houver dados
7. Dashboard mostrara metricas zeradas ate haver dados reais

O sistema estara 100% pronto para uso em producao.
