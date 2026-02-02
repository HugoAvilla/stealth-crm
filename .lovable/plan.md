
# Plano: Sistema Completo de Gestão de Produtos INSULFILM/PPF

## Resumo Executivo

Este plano implementa um sistema completo de gestão de tipos de produtos, regioes de veiculos e regras de consumo para servicos de INSULFILM e PPF. A implementacao sera dividida em duas fases principais: criacao das tabelas no banco de dados e refatoracao do frontend.

---

## Fase 1: Criacao das Tabelas no Supabase

### 1.1 Tabela `product_types`

Armazena os tipos de produtos disponiveis (INSULFILM e PPF).

**Estrutura:**
- `id` (bigint, PK, auto increment)
- `category` (text, NOT NULL, CHECK IN ('INSULFILM', 'PPF'))
- `brand` (text, NOT NULL) - Marca (3M, UltraBlack, XPEL)
- `name` (text, NOT NULL) - Nome/Modelo (G5, G20, Ultimate)
- `model` (text, nullable) - Modelo especifico
- `light_transmission` (text, nullable) - Transmissao de luz (5%, 20%, 70%)
- `description` (text, nullable)
- `unit_price` (numeric, default 0) - Preco de venda por metro
- `cost_per_meter` (numeric, default 0) - Custo por metro
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- `company_id` (bigint, NOT NULL, FK para companies)

**Indices:** `idx_product_types_category`, `idx_product_types_company`

**RLS Policies:**
- SELECT: usuarios podem ver product_types da sua empresa
- ALL: usuarios podem gerenciar product_types da sua empresa

---

### 1.2 Tabela `vehicle_regions`

Armazena as regioes do veiculo onde os produtos sao aplicados.

**Estrutura:**
- `id` (bigint, PK, auto increment)
- `category` (text, NOT NULL, CHECK IN ('INSULFILM', 'PPF'))
- `name` (text, NOT NULL) - Nome da regiao (Para-brisa, Capo)
- `description` (text, nullable)
- `sort_order` (integer, default 0) - Ordem de exibicao
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())
- `company_id` (bigint, NOT NULL, FK para companies)

**Indices:** `idx_vehicle_regions_category`, `idx_vehicle_regions_company`

**RLS Policies:**
- SELECT: usuarios podem ver regioes da sua empresa
- ALL: usuarios podem gerenciar regioes da sua empresa

---

### 1.3 Tabela `region_consumption_rules`

Armazena as regras de consumo por regiao e tamanho do veiculo.

**Estrutura:**
- `id` (bigint, PK, auto increment)
- `category` (text, NOT NULL, CHECK IN ('INSULFILM', 'PPF'))
- `region_id` (bigint, NOT NULL, FK para vehicle_regions)
- `vehicle_size` (text, NOT NULL, CHECK IN ('P', 'M', 'G'))
- `meters_consumed` (numeric, NOT NULL, default 0)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- `company_id` (bigint, NOT NULL, FK para companies)

**UNIQUE constraint:** (region_id, vehicle_size, company_id)

**Indices:** `idx_region_consumption_category`, `idx_region_consumption_region`, `idx_region_consumption_company`

**RLS Policies:**
- SELECT: usuarios podem ver regras da sua empresa
- ALL: usuarios podem gerenciar regras da sua empresa

---

### 1.4 Tabela `service_items_detailed`

Armazena itens detalhados de servico para vendas.

**Estrutura:**
- `id` (bigint, PK, auto increment)
- `sale_id` (bigint, NOT NULL, FK para sales ON DELETE CASCADE)
- `category` (text, NOT NULL, CHECK IN ('INSULFILM', 'PPF'))
- `product_type_id` (bigint, NOT NULL, FK para product_types)
- `region_id` (bigint, NOT NULL, FK para vehicle_regions)
- `meters_used` (numeric, NOT NULL, default 0)
- `unit_price` (numeric, NOT NULL)
- `total_price` (numeric, NOT NULL)
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `company_id` (bigint, NOT NULL, FK para companies ON DELETE CASCADE)

**Indices:** `idx_service_items_sale`, `idx_service_items_product`, `idx_service_items_company`

**RLS Policies:**
- SELECT: usuarios podem ver items da sua empresa
- ALL: usuarios podem gerenciar items da sua empresa

---

### 1.5 Atualizacao da Tabela `materials`

Adicionar coluna para vincular material a tipo de produto:
- `product_type_id` (bigint, nullable, FK para product_types)

**Indice:** `idx_materials_product_type`

---

### 1.6 Dados de Exemplo

**Product Types:**
| Categoria | Marca | Nome | Modelo | Transmissao | Custo |
|-----------|-------|------|--------|-------------|-------|
| INSULFILM | 3M | G70 | Crystalline | 70% | R$ 200,00 |
| INSULFILM | UltraBlack | G5 | Premium | 5% | R$ 120,00 |
| INSULFILM | UltraBlack | G20 | Premium | 20% | R$ 110,00 |
| PPF | XPEL | Ultimate | - | - | R$ 450,00 |
| PPF | 3M | Scotchgard | Pro | - | R$ 380,00 |

**Vehicle Regions (INSULFILM):**
1. Para-brisa (Vidro frontal)
2. Laterais (Vidros laterais dianteiros)
3. Traseiras (Vidros laterais traseiros)
4. Vigia (Vidro traseiro)

**Vehicle Regions (PPF):**
1. Capo (Capo completo)
2. Para-choque Dianteiro
3. Para-choque Traseiro
4. Retrovisores
5. Laterais (Portas)
6. Farois

**Consumption Rules (exemplo):**
| Regiao | P | M | G |
|--------|---|---|---|
| Para-brisa | 1.2m | 1.5m | 1.8m |
| Laterais | 2.0m | 2.5m | 3.0m |
| Vigia | 1.0m | 1.3m | 1.6m |
| Capo (PPF) | 1.5m | 2.0m | 2.5m |

---

## Fase 2: Atualizacao dos Tipos TypeScript

### 2.1 Arquivo `src/lib/database.types.ts`

Adicionar interfaces:

```typescript
export type ProductCategory = 'INSULFILM' | 'PPF';
export type VehicleSize = 'P' | 'M' | 'G';

export interface ProductType {
  id: number;
  category: ProductCategory;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  description: string | null;
  unit_price: number;
  cost_per_meter: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id: number;
}

export interface VehicleRegion {
  id: number;
  category: ProductCategory;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  company_id: number;
}

export interface RegionConsumptionRule {
  id: number;
  category: ProductCategory;
  region_id: number;
  vehicle_size: VehicleSize;
  meters_consumed: number;
  created_at: string;
  updated_at: string;
  company_id: number;
}

export interface ServiceItemDetailed {
  id: number;
  sale_id: number;
  category: ProductCategory;
  product_type_id: number;
  region_id: number;
  meters_used: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  company_id: number;
}
```

Atualizar interface `Material`:
```typescript
export interface Material {
  // ... campos existentes ...
  product_type_id: number | null;
}
```

---

## Fase 3: Refatoracao da Pagina Estoque

### 3.1 Sistema de Abas Principal

Estrutura com 4 abas usando shadcn/ui Tabs:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Gestao de Estoque                            │
├─────────────┬──────────────────┬─────────────────┬─────────────┤
│ Materiais   │ Tipos de         │ Regioes do      │ Regras de   │
│ (Package)   │ Produtos (Tag)   │ Veiculo (Car)   │ Consumo     │
│             │                  │                 │ (Calculator)│
├─────────────┴──────────────────┴─────────────────┴─────────────┤
│                                                                 │
│  [Conteudo da aba selecionada]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Aba "Tipos de Produtos"

**Layout:**
- Sub-tabs: [INSULFILM] [PPF]
- Botao [+ Novo Tipo de Produto]
- Tabela com colunas: Marca | Nome | Transmissao | Custo | Preco | Status | Acoes

**Modal de Criar/Editar:**
- category (Select INSULFILM/PPF)
- brand (Input text obrigatorio)
- name (Input text obrigatorio)
- model (Input text opcional)
- light_transmission (Input - visivel apenas se INSULFILM)
- description (Textarea)
- cost_per_meter (Input number)
- unit_price (Input number)

**Funcionalidades:**
- CRUD completo com mutations do React Query
- Toggle ativo/inativo com Switch
- Validacao com zod

---

### 3.3 Aba "Regioes do Veiculo"

**Layout:**
- Sub-tabs: [INSULFILM] [PPF]
- Botao [+ Nova Regiao]
- Lista de Cards ordenavel com drag-and-drop

**Card de Regiao:**
```text
┌────────────────────────────────────────────┐
│ ☰  Nome da Regiao             [✏️] [🗑️]  │
│     Descricao em texto menor               │
└────────────────────────────────────────────┘
```

**Funcionalidades:**
- CRUD completo
- Drag-and-drop para reordenar (usando @dnd-kit)
- Atualizacao de sort_order automatica
- AlertDialog para confirmacao de exclusao

---

### 3.4 Aba "Regras de Consumo"

**Layout:**
- Sub-tabs: [INSULFILM] [PPF]
- Botao [Salvar Todas as Regras]
- Tabela editavel em formato matriz

**Estrutura da Tabela:**
```text
┌──────────────────┬───────────────┬─────────────┬─────────────┐
│ Regiao           │ P (Pequeno)   │ M (Medio)   │ G (Grande)  │
├──────────────────┼───────────────┼─────────────┼─────────────┤
│ Para-brisa       │ [1.2] metros  │ [1.5] metros│ [1.8] metros│
│ Vidro frontal    │               │             │             │
└──────────────────┴───────────────┴─────────────┴─────────────┘
```

**Funcionalidades:**
- Inputs editaveis em tempo real
- Botao salvar faz UPSERT de todas as regras
- Estado "dirty" para controlar habilitacao do botao

---

### 3.5 Atualizacao da Aba "Materiais"

**Adicoes:**
- Nova coluna "Tipo de Produto" na tabela
- Select agrupado no modal para vincular material a tipo de produto
- Filtros por categoria (Todos | INSULFILM | PPF | Genericos)

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/XXXX_create_product_types.sql` | Criar |
| `supabase/migrations/XXXX_create_vehicle_regions.sql` | Criar |
| `supabase/migrations/XXXX_create_region_consumption_rules.sql` | Criar |
| `supabase/migrations/XXXX_create_service_items_detailed.sql` | Criar |
| `supabase/migrations/XXXX_update_materials_add_product_type.sql` | Criar |
| `src/lib/database.types.ts` | Modificar |
| `src/integrations/supabase/types.ts` | Sera gerado automaticamente |
| `src/pages/Estoque.tsx` | Refatorar completamente |
| `src/components/estoque/ProductTypesTab.tsx` | Criar |
| `src/components/estoque/VehicleRegionsTab.tsx` | Criar |
| `src/components/estoque/ConsumptionRulesTab.tsx` | Criar |
| `src/components/estoque/MaterialsTab.tsx` | Criar (extrair de Estoque.tsx) |
| `src/components/estoque/NewMaterialModal.tsx` | Modificar |

---

## Dependencias a Instalar

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Ordem de Implementacao

1. Criar todas as migrations SQL (5 arquivos)
2. Atualizar tipos TypeScript
3. Refatorar Estoque.tsx com sistema de abas
4. Extrair aba Materiais para componente separado
5. Implementar aba Tipos de Produtos (com modal CRUD)
6. Implementar aba Regioes do Veiculo (com drag-and-drop)
7. Implementar aba Regras de Consumo (tabela editavel)
8. Atualizar modal de Materiais para vincular com tipos de produtos

---

## Consideracoes Tecnicas

- Todas as tabelas seguem padrao `int8` (bigint) para IDs
- RLS policies garantem isolamento multi-tenant
- Queries usam React Query para cache e estado
- Mutations incluem tratamento de erro e toast feedback
- Componentes usam shadcn/ui para consistencia visual
- Drag-and-drop implementado com @dnd-kit (biblioteca leve e moderna)
