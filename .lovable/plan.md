
# Plano: Correções no Fluxo de Vagas e Serviços

## Resumo das Alterações

Duas correções principais:
1. **FillSlotModal**: Remover dependência de "venda em aberto" - cliente pode preencher vaga diretamente selecionando cliente, veículo e serviços detalhados
2. **VehicleRegionsTab (Serviços)**: Mudar "Nova Região" para "Novo Serviço" e adicionar campo/coluna de preço pré-determinado

---

## Item 1: FillSlotModal - Novo Fluxo Independente de Vendas

### Mudanças na Lógica

**ANTES:**
- Cliente → Venda em aberto → Vaga

**DEPOIS:**
- Cliente → Veículo → Serviços detalhados → Vaga

### Alterações no Arquivo `src/components/espaco/FillSlotModal.tsx`

1. **Remover** a seção "Venda em aberto" completamente (linhas 274-308)

2. **Adicionar** busca de veículos do cliente (igual ao NewSaleModal):
```tsx
// Fetch client's vehicles
const { data: clientVehicles } = useQuery({
  queryKey: ['client-vehicles', selectedClientId, companyId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, plate, year, size')
      .eq('client_id', parseInt(selectedClientId))
      .eq('company_id', companyId);
    if (error) throw error;
    return data;
  },
  enabled: !!selectedClientId && !!companyId,
});
```

3. **Adicionar** seletor de veículo + botão "Novo Veículo":
```tsx
<div className="space-y-2">
  <Label>Veículo *</Label>
  <div className="flex gap-2">
    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
      <SelectTrigger className="flex-1">
        <SelectValue placeholder="Selecione um veículo" />
      </SelectTrigger>
      <SelectContent>
        {clientVehicles?.map(vehicle => (
          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
            {vehicle.brand} {vehicle.model} - {vehicle.plate}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button variant="outline" onClick={() => setShowNewVehicleModal(true)}>
      <Plus className="h-4 w-4" /> Novo
    </Button>
  </div>
</div>
```

4. **Adicionar** busca de dados para serviços detalhados:
```tsx
// Fetch product types, vehicle regions, consumption rules
const { data: productTypes } = useQuery({...});
const { data: vehicleRegions } = useQuery({
  queryKey: ['vehicle-regions', companyId],
  queryFn: async () => {
    // Inclui fixed_price na seleção
    const { data } = await supabase
      .from('vehicle_regions')
      .select('id, category, name, description, fixed_price')
      .eq('company_id', companyId)
      .eq('is_active', true);
    return data;
  },
});
const { data: consumptionRules } = useQuery({...});
```

5. **Adicionar** seção de serviços detalhados (reutilizando `ServiceItemRow`):
```tsx
{/* Serviços Detalhados */}
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <Label>Serviços *</Label>
    <Button variant="outline" size="sm" onClick={handleAddDetailedItem}>
      <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
    </Button>
  </div>
  
  {detailedItems.map(item => (
    <ServiceItemRow
      key={item.id}
      item={item}
      vehicleSize={selectedVehicle?.size || null}
      productTypes={productTypes || []}
      vehicleRegions={vehicleRegions || []}
      consumptionRules={consumptionRules || []}
      onUpdate={handleUpdateDetailedItem}
      onRemove={handleRemoveDetailedItem}
    />
  ))}
</div>
```

6. **Atualizar** lógica de preço com base no `fixed_price`:
```tsx
// Ao selecionar região, usar fixed_price se disponível
const handleRegionChange = (regionId: string) => {
  const region = vehicleRegions.find(r => r.id === parseInt(regionId));
  const meters = calculateMeters(parseInt(regionId), item.category);
  const fixedPrice = region?.fixed_price || 0;
  
  onUpdate({
    ...item,
    regionId: parseInt(regionId),
    regionName: region?.name || "",
    metersUsed: meters,
    totalPrice: fixedPrice > 0 ? fixedPrice : (meters * item.unitPrice),
  });
};
```

7. **Atualizar** mutação para salvar sem `sale_id`:
```tsx
const { data, error } = await supabase
  .from('spaces')
  .insert({
    name: slotName || `Vaga de ${selectedClient?.name}`,
    client_id: parseInt(selectedClientId),
    vehicle_id: parseInt(selectedVehicleId),
    sale_id: null, // Venda será criada depois
    company_id: companyId,
    // ... resto dos campos
  });
```

8. **Salvar** os serviços detalhados na tabela `service_items_detailed` (ou em uma nova tabela `space_services`):
```tsx
// Salvar serviços detalhados vinculados ao espaço
const detailedInserts = detailedItems.map(item => ({
  space_id: createdSpace.id, // Novo campo
  category: item.category,
  region_id: item.regionId,
  product_type_id: item.productTypeId,
  meters_used: item.metersUsed,
  total_price: item.totalPrice,
  company_id: companyId,
}));
```

### Novo State Necessário

```tsx
const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
```

---

## Item 2: VehicleRegionsTab - Renomear e Adicionar Preço

### Alterações no Arquivo `src/components/estoque/VehicleRegionsTab.tsx`

### 2a. Renomear Textos

| Antes | Depois |
|-------|--------|
| "Nova Região" | "Novo Serviço" |
| "Editar Região" | "Editar Serviço" |
| "Criar Região" | "Criar Serviço" |
| "Nome da Região *" | "Nome do Serviço *" |
| "Descrição da região..." | "Descrição do serviço..." |
| "Nenhuma região cadastrada" | "Nenhum serviço cadastrado" |
| "Cadastrar Primeira Região" | "Cadastrar Primeiro Serviço" |

### 2b. Adicionar Coluna de Preço na Lista

Atualizar o `SortableRegionCard` para mostrar o preço:

```tsx
function SortableRegionCard({ region, onEdit, onDelete }: SortableRegionCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border...">
      <button {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <p className="font-medium">{region.name}</p>
        {region.description && (
          <p className="text-sm text-muted-foreground">{region.description}</p>
        )}
      </div>

      {/* NOVO: Coluna de preço */}
      <div className="text-right min-w-[100px]">
        <p className="text-sm text-muted-foreground">Preço</p>
        <p className="font-medium text-success">
          {region.fixed_price 
            ? `R$ ${region.fixed_price.toFixed(2)}` 
            : "-"}
        </p>
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(region)}>
          <Pencil className="h-4 w-4" />
        </Button>
        ...
      </div>
    </div>
  );
}
```

### 2c. Adicionar Campo de Preço no Modal

Atualizar o formulário do modal:

```tsx
// Adicionar ao formData state
const [formData, setFormData] = useState({
  category: "INSULFILM" as ProductCategory,
  name: "",
  description: "",
  fixed_price: 0, // NOVO
});

// No modal, adicionar campo:
<div className="space-y-2">
  <Label>Preço Pré-determinado (R$)</Label>
  <Input
    type="number"
    step="0.01"
    placeholder="0.00"
    value={formData.fixed_price || ""}
    onChange={(e) => setFormData({ 
      ...formData, 
      fixed_price: parseFloat(e.target.value) || 0 
    })}
  />
  <p className="text-xs text-muted-foreground">
    Este preço aparecerá automaticamente ao preencher vagas
  </p>
</div>
```

### 2d. Atualizar Interface VehicleRegion

Em `src/lib/database.types.ts`:

```tsx
export interface VehicleRegion {
  id: number;
  category: ProductCategory;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  company_id: number;
  fixed_price: number | null;      // NOVO
  product_type_id: number | null;  // NOVO
}
```

### 2e. Incluir `fixed_price` nas Queries e Mutations

```tsx
// Na query
const { data: regions } = useQuery({
  queryFn: async () => {
    const { data } = await supabase
      .from("vehicle_regions")
      .select("*, fixed_price, product_type_id")  // Incluir novos campos
      ...
  },
});

// Na createMutation
const { data: result } = await supabase
  .from("vehicle_regions")
  .insert({
    ...data,
    fixed_price: data.fixed_price || null,  // NOVO
    company_id: companyId,
  });

// Na updateMutation
const { data: result } = await supabase
  .from("vehicle_regions")
  .update({
    name: formData.name, 
    description: formData.description,
    fixed_price: formData.fixed_price || null,  // NOVO
  });
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/espaco/FillSlotModal.tsx` | Remover dependência de venda, adicionar seleção de veículo + serviços detalhados |
| `src/components/estoque/VehicleRegionsTab.tsx` | Renomear "Região" → "Serviço", adicionar campo/coluna de preço |
| `src/lib/database.types.ts` | Adicionar `fixed_price` e `product_type_id` à interface `VehicleRegion` |
| `src/components/vendas/ServiceItemRow.tsx` | Atualizar interface `VehicleRegion` para incluir `fixed_price` |

---

## Fluxo Visual Atualizado

```text
┌──────────────────────────────────────────────────────────────────────┐
│  PREENCHER VAGA (FillSlotModal)                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Nome da vaga (opcional): [_______________]                          │
│                                                                      │
│  Cliente *: [Hugo Luz ▼]                         [🔄 Atualizar]      │
│                                                                      │
│  Veículo *: [Civic 2022 - ABC-1234 ▼]            [+ Novo]           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  Serviços *                                        [+ Adicionar]     │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [INSULFILM ▼] [Parabrisa ▼] [Película X ▼] [1.2m] R$ [85.00] │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [PPF ▼]       [Capô ▼]       [PPF Y ▼]     [2.5m] R$ [350.00]│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Entrada: [08/02/2026] [15:50]    Saída: [__/__/____] [--:--]       │
│                                                                      │
│  [ Desconto ] [ Observações ] [ Tag ]                                │
│                                                                      │
│                        [✓ Adicionar vaga]                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Resultado na Aba de Serviços

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Gestão de Serviços                                                  │
│  Gerencie serviços e regras de consumo de materiais                 │
├──────────────────────────────────────────────────────────────────────┤
│  [🔧 Serviços] [📊 Regras de Consumo]                                │
│                                                                      │
│  [INSULFILM] [PPF]                            [+ Novo Serviço]       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ ⋮⋮  Parabrisa                          Preço        ✏️  🗑️ │     │
│  │                                     R$ 85.00              │     │
│  └────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ ⋮⋮  Vidros Laterais                    Preço        ✏️  🗑️ │     │
│  │                                     R$ 120.00             │     │
│  └────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ ⋮⋮  Vigia Traseiro                     Preço        ✏️  🗑️ │     │
│  │                                        -                  │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```
