
# Plano: Simplificar Integração entre Tipos de Produtos e Materiais

## Resumo das Alterações Solicitadas

O usuário quer simplificar a gestão de estoque, fazendo com que:
1. Ao cadastrar um "Tipo de Produto", ele já crie automaticamente um registro na aba "Materiais"
2. O modal "Novo Material" deve mostrar uma lista dos produtos cadastrados em vez de campo de texto livre
3. Remover campos desnecessários do modal de novo material (Tipo, Marca, Custo Unitário)
4. Remover botão "Regras Antigas" e coluna "Custo Unit." da tela de materiais

---

## Mudanças Detalhadas

### 1. ProductTypesTab.tsx - Criar Material Automaticamente

Quando um novo tipo de produto for criado, o sistema também criará automaticamente um registro na tabela `materials` vinculado a esse produto.

**Alteração na mutation `createMutation`:**

```typescript
// Após inserir o product_type, criar material automaticamente
const { data: result, error } = await supabase
  .from("product_types")
  .insert({ ... })
  .select()
  .single();

// Criar material vinculado
await supabase.from("materials").insert({
  name: `${data.brand} ${data.name}${data.model ? ` - ${data.model}` : ''}`,
  type: data.category,
  brand: data.brand,
  unit: "Metros",
  minimum_stock: 0,
  current_stock: 0,
  average_cost: data.cost_per_meter,
  company_id: companyId,
  product_type_id: result.id,
  is_active: true,
});
```

---

### 2. NewMaterialModal.tsx - Usar Select com Produtos Cadastrados

**Antes:**
- Campo "Nome do Material" era um Input de texto livre
- Campos: Tipo, Marca, Custo Unitário

**Depois:**
- Campo "Tipo de Produto" será um Select com lista de produtos da tabela `product_types`
- Remover campos: Tipo, Marca, Custo Unitário
- A aba será exclusivamente para contagem de estoque

**Novo layout do modal:**

```text
┌──────────────────────────────────────────────┐
│             Novo Material                     │
├──────────────────────────────────────────────┤
│  Tipo de Produto *                           │
│  [Select com lista de product_types]         │
│    - 3M G70 - Crystalline (INSULFILM)        │
│    - UltraBlack G5 - Premium (INSULFILM)     │
│    - XPEL Ultimate (PPF)                     │
│                                              │
│  Unidade *                                   │
│  [Metros ▼]                                  │
│                                              │
│  ┌───────────────┬───────────────┐          │
│  │ Estoque       │ Estoque       │          │
│  │ Inicial       │ Mínimo        │          │
│  │ [0]           │ [0]           │          │
│  └───────────────┴───────────────┘          │
│                                              │
│  [Cancelar]              [Cadastrar]         │
└──────────────────────────────────────────────┘
```

**Campos removidos:**
- Tipo (Select PPF/Insulfilm/etc)
- Marca (Input)
- Custo Unitário (Input)

**Comportamento:**
- Ao selecionar um produto, o nome do material será preenchido automaticamente com "Marca Nome - Modelo"
- O `product_type_id` será vinculado ao material

---

### 3. Estoque.tsx - Remover Elementos da Aba Materiais

**Remover:**
- Botão "Regras Antigas" (linha 187-189)
- Coluna "Custo Unit." da tabela (TableHead linha 292 e TableCell linhas 326-328)

**Manter:**
- Todas as outras funcionalidades de entrada/saída de estoque
- Valor Total (calculado como estoque x custo médio do produto vinculado)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/estoque/ProductTypesTab.tsx` | Adicionar criação automática de material ao criar produto |
| `src/components/estoque/NewMaterialModal.tsx` | Substituir campo nome por Select de produtos, remover campos tipo/marca/custo |
| `src/pages/Estoque.tsx` | Remover botão "Regras Antigas" e coluna "Custo Unit." |

---

## Fluxo Após Alterações

1. **Usuário cadastra Tipo de Produto** (ex: 3M G70 Crystalline)
   - Sistema cria registro em `product_types`
   - Sistema cria automaticamente registro em `materials` vinculado

2. **Usuário adiciona material manualmente** (se necessário)
   - Abre modal "Novo Material"
   - Seleciona produto da lista (3M G70, UltraBlack G5, etc)
   - Define estoque inicial e mínimo
   - Sistema cria material vinculado ao produto

3. **Baixa de estoque na venda**
   - Sistema identifica material pelo `product_type_id`
   - Deduz metros do `current_stock`
   - Registra movimento em `stock_movements`

---

## Detalhes Técnicos da Implementação

### Query para listar produtos no Select:

```typescript
const { data: productTypes } = useQuery({
  queryKey: ['product-types-for-select', companyId],
  queryFn: async () => {
    const { data } = await supabase
      .from('product_types')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('category')
      .order('brand')
      .order('name');
    return data;
  }
});
```

### Estrutura do Select agrupado:

```tsx
<Select value={selectedProductTypeId} onValueChange={setSelectedProductTypeId}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione um produto..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>INSULFILM</SelectLabel>
      {productTypes?.filter(p => p.category === 'INSULFILM').map(p => (
        <SelectItem key={p.id} value={p.id.toString()}>
          {p.brand} {p.name} {p.model && `- ${p.model}`}
        </SelectItem>
      ))}
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>PPF</SelectLabel>
      {productTypes?.filter(p => p.category === 'PPF').map(p => (
        <SelectItem key={p.id} value={p.id.toString()}>
          {p.brand} {p.name} {p.model && `- ${p.model}`}
        </SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

---

## Benefícios das Alterações

1. **Integração automática**: Não precisa cadastrar manualmente em duas abas
2. **Consistência de dados**: Material sempre vinculado a um tipo de produto
3. **Simplicidade**: Modal de material focado apenas em contagem de estoque
4. **Rastreabilidade**: Fácil identificar qual produto está vinculado a cada material
