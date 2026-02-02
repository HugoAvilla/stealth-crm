
# Plano: Corrigir SalesDayDrawer para Buscar Dados Reais do Supabase

## Problema Identificado

O componente `SalesDayDrawer.tsx` está importando e utilizando dados mock do arquivo `@/lib/mockData`:

```typescript
import { sales, getClientById, Sale } from "@/lib/mockData";
```

Isso faz com que o drawer sempre mostre arrays vazios (já que `mockData.ts` foi limpo e contém apenas definições de tipos), mesmo quando existem vendas reais no banco de dados.

---

## Componentes Afetados

| Componente | Problema | Ação |
|------------|----------|------|
| `SalesDayDrawer.tsx` | Usa `sales` e `getClientById` do mockData | Buscar dados do Supabase |
| `SalesKPIBar.tsx` | Recebe dados via props | Adaptar interface para novo formato |
| `SaleDetailsModal.tsx` | Usa `getClientById`, `getVehicleById`, `getServiceById` | Receber dados completos via props |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                     Vendas.tsx (Pai)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Busca vendas do mês via Supabase                   │    │
│  │  com joins: clients, vehicles, sale_items, services │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│  ┌──────────────────────┐   ┌─────────────────────────┐     │
│  │   SalesDayDrawer     │   │   SalesKPIBar           │     │
│  │   (Recebe via props) │   │   (Recebe via props)    │     │
│  └──────────────────────┘   └─────────────────────────┘     │
│              │                                               │
│              ▼                                               │
│  ┌──────────────────────┐                                   │
│  │   SaleDetailsModal   │                                   │
│  │   (Recebe via props) │                                   │
│  └──────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Detalhadas

### 1. Criar Interface Unificada de Venda

Criar um tipo que represente uma venda com todos os dados relacionados já carregados:

```typescript
interface SaleWithDetails {
  id: number;
  client_id: number | null;
  vehicle_id: number | null;
  sale_date: string;
  subtotal: number;
  discount: number | null;
  total: number;
  payment_method: string | null;
  status: string | null;
  is_open: boolean | null;
  observations: string | null;
  client: {
    id: number;
    name: string;
    phone: string;
  } | null;
  vehicle: {
    id: number;
    brand: string;
    model: string;
    year: number | null;
    plate: string | null;
    size: string | null;
  } | null;
  sale_items: {
    id: number;
    service_id: number | null;
    quantity: number | null;
    unit_price: number;
    total_price: number;
    service: {
      id: number;
      name: string;
      base_price: number;
    } | null;
  }[];
}
```

### 2. Atualizar Vendas.tsx

Modificar a query para incluir todos os relacionamentos necessários:

```typescript
const { data, error } = await supabase
  .from('sales')
  .select(`
    *,
    client:clients(id, name, phone),
    vehicle:vehicles(id, brand, model, year, plate, size),
    sale_items(
      id, service_id, quantity, unit_price, total_price,
      service:services(id, name, base_price)
    )
  `)
  .eq('company_id', profile.company_id)
  .gte('sale_date', format(monthStart, 'yyyy-MM-dd'))
  .lte('sale_date', format(monthEnd, 'yyyy-MM-dd'))
  .order('sale_date', { ascending: false });
```

Passar as vendas completas para o SalesDayDrawer.

### 3. Atualizar SalesDayDrawer.tsx

**Mudanças principais:**
- Remover importação de `sales` e `getClientById` do mockData
- Receber `allSales` como prop do componente pai
- Filtrar vendas do dia selecionado localmente
- Passar venda completa para `SaleDetailsModal`

**Nova interface de props:**
```typescript
interface SalesDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  allSales: SaleWithDetails[];
}
```

### 4. Atualizar SalesKPIBar.tsx

Adaptar para receber o novo formato de dados com campos corretos:
- Usar `is_open` para determinar status
- Calcular totais corretamente

### 5. Atualizar SaleDetailsModal.tsx

**Mudanças principais:**
- Remover importações de funções mock (`getClientById`, `getVehicleById`, `getServiceById`)
- Receber venda com dados já carregados via props
- Acessar `sale.client`, `sale.vehicle`, `sale.sale_items` diretamente

**Nova interface de props:**
```typescript
interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Vendas.tsx` | Expandir query com joins, passar dados para drawer |
| `src/components/vendas/SalesDayDrawer.tsx` | Receber vendas via props, remover mockData |
| `src/components/vendas/SalesKPIBar.tsx` | Adaptar interface para novo formato |
| `src/components/vendas/SaleDetailsModal.tsx` | Remover mockData, usar dados da prop |

---

## Fluxo de Dados Após Correção

1. **Vendas.tsx** carrega todas as vendas do mês com dados de clientes, veículos e serviços
2. Ao clicar em um dia do calendário, abre **SalesDayDrawer** passando as vendas
3. **SalesDayDrawer** filtra vendas do dia selecionado e exibe lista
4. Ao clicar em uma venda, abre **SaleDetailsModal** com todos os dados já disponíveis
5. Nenhuma busca adicional necessária - dados já estão carregados

---

## Benefícios

- Dados reais do Supabase exibidos corretamente
- Performance otimizada (apenas uma query com joins)
- Consistência entre calendário e drawer
- Detalhes da venda completos sem requisições extras
- Remoção de dependência do mockData nesses componentes

---

## Considerações Técnicas

- A query com múltiplos joins pode retornar mais dados, mas é mais eficiente que múltiplas requisições
- O filtro por `company_id` já está implementado na query existente
- RLS do Supabase continua garantindo isolamento multi-tenant
- O drawer continua suportando navegação entre dias (já implementado)
