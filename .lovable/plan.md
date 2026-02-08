
# Plano: Corrigir Lógica de Preço nos Serviços Detalhados

## Problema Identificado

Quando o usuário seleciona um serviço detalhado, o sistema está pegando o preço do **material** (`unit_price` na tabela `product_types`) ao invés do **preço pré-determinado do serviço** (`fixed_price` na tabela `vehicle_regions`).

### Fluxo Atual (Incorreto)
1. Usuário seleciona Categoria (INSULFILM/PPF)
2. Usuário seleciona Serviço (Parabrisa) → `fixed_price = R$ 900.00`
3. Usuário seleciona Produto (3m ceramic) → **Sobrescreve o preço com `unit_price = R$ 300.00`**

### Fluxo Correto
1. Usuário seleciona Categoria
2. Usuário seleciona Serviço → Aplica `fixed_price = R$ 900.00`
3. Usuário seleciona Produto → **Mantém o preço do serviço**

---

## Alterações Necessárias

### 1. Remover `unit_price` da Tabela `product_types`

**Arquivo**: `src/components/estoque/ProductTypesTab.tsx`

O campo `unit_price` não é mais necessário pois o preço de venda é definido no serviço. 
- Atualmente: linha 72 define `unit_price: 0` ao criar produto
- Manter apenas `cost_per_meter` (custo por metro) para controle interno

O campo já não aparece na tabela de listagem (apenas "Custo/Metro"), então não há alterações visuais necessárias nesta aba.

### 2. Corrigir `ServiceItemRow.tsx` - Lógica de Preço

**Arquivo**: `src/components/vendas/ServiceItemRow.tsx`

#### 2a. Remover interface de `unit_price` do ProductType

```tsx
interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  // REMOVER: unit_price: number;
}
```

#### 2b. Atualizar `handleProductChange` para NÃO sobrescrever o preço

```tsx
// ANTES (linha 123-136):
const handleProductChange = (productTypeId: string) => {
  const product = productTypes.find((p) => p.id === parseInt(productTypeId));
  const unitPrice = product?.unit_price || 0;  // ❌ Pega preço do material
  onUpdate({
    ...item,
    productTypeId: parseInt(productTypeId),
    productTypeName: product ? ... : "",
    unitPrice,
    totalPrice: item.metersUsed * unitPrice,  // ❌ Sobrescreve o preço
  });
};

// DEPOIS:
const handleProductChange = (productTypeId: string) => {
  const product = productTypes.find((p) => p.id === parseInt(productTypeId));
  onUpdate({
    ...item,
    productTypeId: parseInt(productTypeId),
    productTypeName: product
      ? `${product.brand} ${product.name}${product.light_transmission ? ` ${product.light_transmission}` : ""}`
      : "",
    // Não altera unitPrice nem totalPrice - mantém o preço do serviço
  });
};
```

#### 2c. Atualizar `handleRegionChange` para sempre usar `fixed_price`

```tsx
// ANTES (linha 107-121):
const handleRegionChange = (regionId: string) => {
  const region = vehicleRegions.find((r) => r.id === parseInt(regionId));
  const meters = calculateMeters(parseInt(regionId), item.category);
  const fixedPrice = region?.fixed_price || 0;
  const calculatedPrice = fixedPrice > 0 ? fixedPrice : (meters * item.unitPrice);  // ❌ Fallback usa unitPrice

  onUpdate({
    ...item,
    regionId: parseInt(regionId),
    regionName: region?.name || "",
    metersUsed: meters,
    totalPrice: calculatedPrice,
  });
};

// DEPOIS:
const handleRegionChange = (regionId: string) => {
  const region = vehicleRegions.find((r) => r.id === parseInt(regionId));
  const meters = calculateMeters(parseInt(regionId), item.category);
  // Usar APENAS o fixed_price do serviço
  const fixedPrice = region?.fixed_price || 0;

  onUpdate({
    ...item,
    regionId: parseInt(regionId),
    regionName: region?.name || "",
    metersUsed: meters,
    totalPrice: fixedPrice,  // Sempre usa o preço do serviço
  });
};
```

#### 2d. Atualizar `handleMetersChange` para não recalcular preço baseado em unitPrice

```tsx
// ANTES (linha 138-145):
const handleMetersChange = (value: string) => {
  const meters = parseFloat(value) || 0;
  onUpdate({
    ...item,
    metersUsed: meters,
    totalPrice: meters * item.unitPrice,  // ❌ Recalcula usando unitPrice
  });
};

// DEPOIS:
const handleMetersChange = (value: string) => {
  const meters = parseFloat(value) || 0;
  onUpdate({
    ...item,
    metersUsed: meters,
    // NÃO altera totalPrice - metros é apenas informativo para baixa de estoque
  });
};
```

### 3. Simplificar Interface `DetailedServiceItem`

**Arquivo**: `src/components/vendas/ServiceItemRow.tsx`

```tsx
// ANTES:
export interface DetailedServiceItem {
  id: string;
  category: ProductCategory;
  regionId: number | null;
  regionName: string;
  productTypeId: number | null;
  productTypeName: string;
  metersUsed: number;
  unitPrice: number;      // ❌ REMOVER
  totalPrice: number;
}

// DEPOIS:
export interface DetailedServiceItem {
  id: string;
  category: ProductCategory;
  regionId: number | null;
  regionName: string;
  productTypeId: number | null;
  productTypeName: string;
  metersUsed: number;
  totalPrice: number;     // Este é o preço do serviço (fixed_price)
}
```

### 4. Atualizar `FillSlotModal.tsx` que usa a interface

**Arquivo**: `src/components/espaco/FillSlotModal.tsx`

Remover `unitPrice` da criação de novos itens detalhados:

```tsx
// ANTES:
const handleAddDetailedItem = () => {
  setDetailedItems([...detailedItems, {
    id: crypto.randomUUID(),
    category: "INSULFILM",
    regionId: null,
    regionName: "",
    productTypeId: null,
    productTypeName: "",
    metersUsed: 0,
    unitPrice: 0,      // ❌ REMOVER
    totalPrice: 0,
  }]);
};

// DEPOIS:
const handleAddDetailedItem = () => {
  setDetailedItems([...detailedItems, {
    id: crypto.randomUUID(),
    category: "INSULFILM",
    regionId: null,
    regionName: "",
    productTypeId: null,
    productTypeName: "",
    metersUsed: 0,
    totalPrice: 0,
  }]);
};
```

### 5. Atualizar `NewSaleModal.tsx` se também usar a interface

Verificar se o modal de nova venda também usa `DetailedServiceItem` e fazer as mesmas correções.

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/components/vendas/ServiceItemRow.tsx` | Remover `unitPrice` da interface e lógica |
| `src/components/espaco/FillSlotModal.tsx` | Remover `unitPrice` na criação de itens |
| `src/components/vendas/NewSaleModal.tsx` | Verificar e ajustar se necessário |
| `src/lib/database.types.ts` | Manter `unit_price` no ProductType pois existe no banco |

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  SELEÇÃO DE SERVIÇO DETALHADO                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. [INSULFILM ▼]  ← Escolhe categoria                                 │
│                                                                         │
│  2. [Parabrisa ▼]  ← fixed_price = R$ 900.00 → DEFINE O PREÇO         │
│                                                                         │
│  3. [3m Ceramic ▼] ← Apenas para baixa de estoque (custo interno)      │
│                                                                         │
│  4. [1.2 m]        ← Metros para consumo de estoque                    │
│                                                                         │
│  5. R$ [900.00]    ← Preço vem do SERVIÇO, pode ser editado manualmente│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

A tabela `product_types` no banco continuará tendo o campo `unit_price`, mas ele não será mais utilizado na lógica de precificação. O campo `cost_per_meter` é usado apenas para cálculo de custo interno e margem de lucro.

O preço exibido ao cliente vem exclusivamente do campo `fixed_price` da tabela `vehicle_regions` (que representa os serviços).
