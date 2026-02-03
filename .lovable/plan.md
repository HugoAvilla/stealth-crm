
# Plano: Integracao Completa do Sistema de Vendas com Estoque INSULFILM/PPF

## Resumo do Fluxo Entendido

O cliente deseja um fluxo integrado onde:

1. **Cliente** e **Veiculo** sao cadastrados
2. Na **Venda**, o usuario seleciona:
   - Regioes do veiculo (ex: Para-brisa, Laterais, Vigia)
   - Tipo de produto para CADA regiao (pode usar produtos diferentes por regiao)
3. O sistema calcula automaticamente o consumo baseado em:
   - Tamanho do veiculo (P/M/G)
   - Regras de consumo configuradas por regiao
4. Ao finalizar a venda, o estoque e baixado automaticamente

---

## Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    NOVA VENDA (NewSaleModal)                        │
├─────────────────────────────────────────────────────────────────────┤
│  1. Seleciona Cliente                                               │
│  2. Seleciona Veiculo (com tamanho P/M/G)                          │
│  3. NOVA INTERFACE: Adicionar Servicos Detalhados                   │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │  [+ Adicionar Regiao]                                    │    │
│     │                                                          │    │
│     │  ┌────────────────────────────────────────────────────┐  │    │
│     │  │ Para-brisa     │ 3M G70 Crystalline    │ 1.5m │ R$│  │    │
│     │  └────────────────────────────────────────────────────┘  │    │
│     │  ┌────────────────────────────────────────────────────┐  │    │
│     │  │ Laterais       │ UltraBlack G5 Premium │ 2.5m │ R$│  │    │
│     │  └────────────────────────────────────────────────────┘  │    │
│     │  ┌────────────────────────────────────────────────────┐  │    │
│     │  │ Vigia          │ UltraBlack G5 Premium │ 1.3m │ R$│  │    │
│     │  └────────────────────────────────────────────────────┘  │    │
│     │                                                          │    │
│     │  Subtotal: R$ XXX,XX                                     │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  4. Forma de pagamento, desconto, observacoes                       │
│  5. [CADASTRAR VENDA]                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AO SALVAR A VENDA                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. INSERT em sales (venda principal)                               │
│  2. INSERT em service_items_detailed (cada regiao/produto)          │
│  3. PARA CADA item detalhado:                                       │
│     - Busca material vinculado ao product_type_id                   │
│     - Calcula metros = regras_consumo[region_id][vehicle_size]      │
│     - INSERT em stock_movements (saida)                             │
│     - Trigger atualiza materials.current_stock                      │
│  4. Cria transacao financeira (se venda fechada)                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mudancas Detalhadas

### 1. Atualizar NewSaleModal.tsx

**Adicionar nova secao "Servicos Detalhados":**

- Interface com lista de itens (regioes + produtos)
- Cada item contem:
  - Select de Categoria (INSULFILM/PPF)
  - Select de Regiao (filtrado por categoria)
  - Select de Tipo de Produto (filtrado por categoria)
  - Metros calculados automaticamente (baseado no tamanho do veiculo)
  - Preco calculado (metros x preco por metro do produto)
- Botao "+ Adicionar Regiao"
- Subtotal atualizado em tempo real

**Estado adicional necessario:**

```typescript
interface DetailedServiceItem {
  id: string; // UUID temporario para controle de lista
  category: 'INSULFILM' | 'PPF';
  regionId: number;
  regionName: string;
  productTypeId: number;
  productTypeName: string;
  metersUsed: number; // calculado automaticamente
  unitPrice: number; // preco por metro do produto
  totalPrice: number; // metros x preco
}

const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
```

**Novas queries necessarias:**

```typescript
// Carregar tipos de produto
const { data: productTypes } = useQuery({
  queryKey: ['product-types', companyId],
  queryFn: async () => {
    const { data } = await supabase
      .from('product_types')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);
    return data;
  }
});

// Carregar regioes do veiculo
const { data: vehicleRegions } = useQuery({
  queryKey: ['vehicle-regions', companyId],
  queryFn: async () => {
    const { data } = await supabase
      .from('vehicle_regions')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order');
    return data;
  }
});

// Carregar regras de consumo
const { data: consumptionRules } = useQuery({
  queryKey: ['consumption-rules', companyId],
  queryFn: async () => {
    const { data } = await supabase
      .from('region_consumption_rules')
      .select('*')
      .eq('company_id', companyId);
    return data;
  }
});
```

**Calculo automatico de metros:**

Quando o usuario seleciona uma regiao e o veiculo ja tem tamanho definido:

```typescript
function calculateMeters(regionId: number, vehicleSize: 'P' | 'M' | 'G', category: string) {
  const rule = consumptionRules?.find(
    r => r.region_id === regionId && r.vehicle_size === vehicleSize && r.category === category
  );
  return rule?.meters_consumed || 0;
}
```

---

### 2. Criar Componente ServiceItemRow.tsx

Componente para cada linha de servico detalhado:

```typescript
interface ServiceItemRowProps {
  item: DetailedServiceItem;
  vehicleSize: 'P' | 'M' | 'G' | null;
  productTypes: ProductType[];
  vehicleRegions: VehicleRegion[];
  consumptionRules: RegionConsumptionRule[];
  onUpdate: (item: DetailedServiceItem) => void;
  onRemove: (id: string) => void;
}
```

Layout da linha:
```text
┌──────────────────────────────────────────────────────────────────────┐
│ [INSULFILM ▼]  [Para-brisa ▼]  [3M G70 ▼]  1.5m  R$ 300,00  [🗑️] │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 3. Atualizar stockConsumption.ts

**Criar nova funcao consumeStockForDetailedSale:**

```typescript
async function consumeStockForDetailedSale(
  saleId: number,
  detailedItems: ServiceItemDetailed[],
  vehicleSize: 'P' | 'M' | 'G',
  companyId: number,
  userId: string
): Promise<ConsumptionResult>
```

**Logica:**

1. Para cada item em `detailedItems`:
   - Buscar material vinculado ao `product_type_id`
   - Se nao houver material vinculado, adicionar warning
   - Se houver, calcular metros a consumir
   - Verificar estoque disponivel
   - Inserir movimento de saida em `stock_movements`
2. Retornar resumo do consumo

---

### 4. Atualizar handleSubmit em NewSaleModal

**Fluxo de salvamento:**

```typescript
const handleSubmit = async () => {
  // 1. Validacoes
  if (!selectedClientId || !selectedVehicleId || detailedItems.length === 0) {
    toast.error("Preencha cliente, veículo e pelo menos um serviço.");
    return;
  }

  // 2. Calcular totais
  const subtotal = detailedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal - discount;

  // 3. Criar venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      client_id: selectedClientId,
      vehicle_id: selectedVehicleId,
      sale_date: format(saleDate, 'yyyy-MM-dd'),
      subtotal,
      discount,
      total,
      payment_method: paymentMethod,
      is_open: isOpen,
      status: isOpen ? 'Aberta' : 'Fechada',
      observations: notes,
      company_id: companyId,
      seller_id: user?.id,
    })
    .select()
    .single();

  // 4. Criar service_items_detailed
  const serviceItemsData = detailedItems.map(item => ({
    sale_id: sale.id,
    category: item.category,
    product_type_id: item.productTypeId,
    region_id: item.regionId,
    meters_used: item.metersUsed,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    company_id: companyId,
  }));

  await supabase.from('service_items_detailed').insert(serviceItemsData);

  // 5. Consumir estoque
  const vehicle = vehicles.find(v => v.id === selectedVehicleId);
  if (vehicle?.size) {
    await consumeStockForDetailedSale(
      sale.id,
      serviceItemsData,
      vehicle.size as 'P' | 'M' | 'G',
      companyId,
      user?.id
    );
  }

  // 6. Criar transacao financeira (se fechada)
  if (!isOpen) {
    await createTransactionFromSale(...);
  }
};
```

---

### 5. Atualizar SaleDetailsModal.tsx

Exibir os itens detalhados da venda:

```typescript
// Query para buscar itens detalhados
const { data: detailedItems } = useQuery({
  queryKey: ['sale-detailed-items', sale?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('service_items_detailed')
      .select(`
        *,
        product_type:product_types(brand, name, model, category),
        region:vehicle_regions(name, description)
      `)
      .eq('sale_id', sale?.id);
    return data;
  },
  enabled: !!sale?.id
});
```

Renderizar tabela com:
| Regiao | Produto | Metros | Preco/m | Total |
|--------|---------|--------|---------|-------|
| Para-brisa | 3M G70 | 1.5m | R$ 200 | R$ 300 |
| Laterais | UltraBlack G5 | 2.5m | R$ 120 | R$ 300 |

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/vendas/NewSaleModal.tsx` | Refatorar (adicionar servicos detalhados) |
| `src/components/vendas/ServiceItemRow.tsx` | Criar (componente de linha) |
| `src/lib/stockConsumption.ts` | Adicionar funcao `consumeStockForDetailedSale` |
| `src/components/vendas/SaleDetailsModal.tsx` | Atualizar (exibir itens detalhados) |
| `src/types/sales.ts` | Adicionar tipos para itens detalhados |

---

## Fluxo Visual da Interface

**Antes (atual):**
```text
Cliente → Veiculo → [x] Servico 1 → [x] Servico 2 → Desconto → Salvar
```

**Depois (novo):**
```text
Cliente → Veiculo → [+ Adicionar Regiao]
                     │
                     ├── [INSULFILM] [Para-brisa] [3M G70]     1.5m  R$300
                     ├── [INSULFILM] [Laterais]   [UltraBlack] 2.5m  R$300
                     └── [INSULFILM] [Vigia]      [UltraBlack] 1.3m  R$156
                                                              ────────────
                                                     Subtotal: R$ 756,00
                                                      Desconto: R$ 0,00
                                                         TOTAL: R$ 756,00
```

---

## Consideracoes Tecnicas

1. **Manter compatibilidade**: O sistema antigo de `services` e `sale_items` continuara funcionando para servicos que nao sao INSULFILM/PPF

2. **Vinculacao de materiais**: Para que o estoque seja baixado, cada `product_type` deve ter um `material` vinculado atraves do campo `materials.product_type_id`

3. **Calculo automatico**: Os metros sao calculados automaticamente baseado no tamanho do veiculo, mas o usuario pode ajustar manualmente se necessario

4. **Validacao de estoque**: O sistema alertara se nao houver estoque suficiente, mas nao bloqueara a venda

5. **Historico completo**: A tabela `service_items_detailed` mantem registro completo de qual produto foi usado em qual regiao, permitindo rastreabilidade

---

## Exemplo Pratico do Fluxo

**Cenario:** Cliente faz INSULFILM nas laterais e vigia com UltraBlack G5, e para-brisa com 3M G70. Veiculo tamanho M.

**Regras de consumo configuradas:**
- Para-brisa M: 1.5m
- Laterais M: 2.5m  
- Vigia M: 1.3m

**Precos por metro:**
- UltraBlack G5: R$ 120/m
- 3M G70: R$ 200/m

**Resultado na venda:**
| Regiao | Produto | Metros | Preco/m | Total |
|--------|---------|--------|---------|-------|
| Para-brisa | 3M G70 | 1.5m | R$ 200 | R$ 300 |
| Laterais | UltraBlack G5 | 2.5m | R$ 120 | R$ 300 |
| Vigia | UltraBlack G5 | 1.3m | R$ 120 | R$ 156 |
| **Total** | | **5.3m** | | **R$ 756** |

**Baixa no estoque:**
- Material vinculado ao UltraBlack G5: -3.8m (2.5 + 1.3)
- Material vinculado ao 3M G70: -1.5m

---

## Ordem de Implementacao

1. Criar componente `ServiceItemRow.tsx`
2. Atualizar `NewSaleModal.tsx` com nova interface
3. Atualizar `stockConsumption.ts` com nova funcao
4. Atualizar `SaleDetailsModal.tsx` para exibir itens detalhados
5. Atualizar tipos em `src/types/sales.ts`
6. Testar fluxo completo
