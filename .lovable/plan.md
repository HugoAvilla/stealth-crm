
# Plano: Reestruturação Completa do CRM WFE

## Resumo das 7 Alterações Solicitadas

Este plano abrange uma reorganização significativa do fluxo de trabalho, navegação e estrutura de módulos do CRM.

---

## 1. Remover Texto "WFE EVOLUTION"

**Arquivo**: `src/components/layout/Sidebar.tsx` (linha 132)

Remover o `<span>` com "WFE EVOLUTION" mantendo apenas o logo:

```tsx
// ANTES
<div className="flex items-center gap-2">
  <img src={wfeLogo} alt="WFE Evolution" className="h-8 w-auto object-contain" />
  <span className="font-semibold text-sm tracking-tight">WFE EVOLUTION</span>
</div>

// DEPOIS
<img src={wfeLogo} alt="WFE" className="h-10 w-auto object-contain" />
```

---

## 2. Navegação Horizontal no Topo (Substituir Sidebar)

**Arquivos a modificar**:
- `src/components/layout/MainLayout.tsx`
- Criar: `src/components/layout/TopNavigation.tsx`
- Ajustar: `src/components/layout/Sidebar.tsx` (remover ou manter para mobile)

### TopNavigation.tsx (Novo Componente)

Barra horizontal fixa no topo com:
- Logo WFE à esquerda
- Menu horizontal com todos os módulos
- Avatar do usuário com dropdown à direita (perfil, logout)
- Menu "hambúrguer" em mobile que abre drawer lateral

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]  Painel  Vendas  Espaço  Financeiro  Clientes  ...  [Avatar ▼]     │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│                          CONTEÚDO DA PÁGINA                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### MainLayout.tsx (Atualizado)

```tsx
// Remove sidebar lateral, adiciona TopNavigation
<div className="min-h-screen bg-background">
  <TopNavigation />
  <main className="pt-16"> {/* padding-top para compensar navbar fixa */}
    {children}
  </main>
</div>
```

---

## 3. Dashboard - Alterar Botões de Ação Rápida

**Arquivos**:
- `src/components/dashboard/QuickActions.tsx`
- `src/pages/Dashboard.tsx`

### Mudanças:
1. Remover botão "Nova Venda" (verde)
2. Remover botão "Preencher Vaga" (azul) 
3. Manter apenas **um botão**: "Preencher Vaga" (cor principal)

```tsx
// QuickActions - versão simplificada
const actions: QuickAction[] = [
  { label: 'Preencher Vaga', icon: Car, onClick: onNewSlot, variant: 'primary' },
  { label: 'Novo Cliente', icon: UserPlus, onClick: onNewClient, variant: 'accent' },
];
```

---

## 4. Novo Fluxo: Cliente → Vaga (com serviços) → Venda

### 4a. FillSlotModal - Adicionar Serviços Detalhados

**Arquivo**: `src/components/espaco/FillSlotModal.tsx`

Atualmente o modal requer uma **venda existente**. O novo fluxo inverte isso:

**Novo comportamento**:
1. Usuário seleciona Cliente
2. Seleciona ou cadastra Veículo (novo botão "Novo Veículo")
3. Adiciona Serviços Detalhados (igual ao modal de vendas)
   - Categoria (INSULFILM/PPF)
   - Região do veículo
   - Produto
   - Metros
   - **Preço editável** (campo de input em vez de somente leitura)
4. Define entrada/saída
5. Salva a vaga **SEM criar venda ainda**

O pagamento/venda será criado **depois** quando o serviço for concluído.

### 4b. Adicionar Botão "Novo Veículo" na Seleção

Dentro do FillSlotModal e NewSaleModal, ao selecionar veículo:

```tsx
<div className="flex gap-2">
  <Select ...>...</Select>
  <Button variant="outline" onClick={() => setShowNewVehicleModal(true)}>
    <Plus className="h-4 w-4" /> Novo
  </Button>
</div>
```

### 4c. Preço Editável nos Serviços Detalhados

**Arquivo**: `src/components/vendas/ServiceItemRow.tsx`

Mudar o display do preço de texto estático para Input editável:

```tsx
// ANTES (somente leitura)
<div className="text-right font-medium text-success">
  R$ {item.totalPrice.toFixed(2)}
</div>

// DEPOIS (editável)
<Input
  type="number"
  step="0.01"
  className="w-[100px] text-right font-medium text-success"
  value={item.totalPrice || ""}
  onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
/>
```

---

## 5. Nova Aba "Serviços" (Mover de Estoque)

### 5a. Criar Página de Serviços

**Criar**: `src/pages/Servicos.tsx`

Esta nova página terá 2 sub-abas (movidas de Estoque):
- **Serviços** (antiga "Regiões do Veículo") - renomeado
- **Regras de Consumo**

### 5b. Atualizar Estoque

**Arquivo**: `src/pages/Estoque.tsx`

Remover as abas "Regiões do Veículo" e "Regras de Consumo":

```tsx
// ANTES: 4 abas
<TabsList className="grid grid-cols-4">
  <TabsTrigger value="materials">Materiais</TabsTrigger>
  <TabsTrigger value="product-types">Tipos de Produtos</TabsTrigger>
  <TabsTrigger value="vehicle-regions">Regiões do Veículo</TabsTrigger>  // REMOVER
  <TabsTrigger value="consumption-rules">Regras de Consumo</TabsTrigger> // REMOVER
</TabsList>

// DEPOIS: 2 abas
<TabsList className="grid grid-cols-2">
  <TabsTrigger value="product-types">Tipos de Produtos</TabsTrigger>
  <TabsTrigger value="materials">Materiais</TabsTrigger>
</TabsList>
```

### 5c. Atualizar App.tsx e Navegação

Adicionar rota `/servicos` e link na navegação:

```tsx
// App.tsx
<Route path="/servicos" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR', 'PRODUCAO']}>
    <MainLayout><Servicos /></MainLayout>
  </ProtectedRoute>
} />

// TopNavigation ou Sidebar
{ icon: Wrench, label: 'Serviços', path: '/servicos' }
```

---

## 6. Reorganização: Serviços Linkados a Materiais

### 6a. Atualizar VehicleRegionsTab (renomear para ServicesTab)

**Renomear**: `VehicleRegionsTab.tsx` → `ServicesTab.tsx`

Mudanças:
- "Nova Região" → "Novo Serviço"
- "Regiões do Veículo" → "Serviços"
- Adicionar campo de **Preço Pré-fixado** no formulário de criação
- Adicionar link para **Material/Produto** do estoque

```tsx
// Novo formulário de serviço
<div className="space-y-2">
  <Label>Nome do Serviço *</Label>
  <Input placeholder="Ex: Insulfilm Parabrisa, PPF Capô" />
</div>

<div className="space-y-2">
  <Label>Material/Produto Vinculado</Label>
  <Select>
    {productTypes.map(p => (
      <SelectItem key={p.id} value={p.id.toString()}>
        {p.brand} {p.name}
      </SelectItem>
    ))}
  </Select>
</div>

<div className="space-y-2">
  <Label>Preço Pré-fixado (R$)</Label>
  <Input type="number" step="0.01" placeholder="0.00" />
</div>
```

### 6b. Atualizar Banco de Dados

Adicionar campos à tabela `vehicle_regions`:
- `product_type_id` (FK → product_types)
- `fixed_price` (decimal)

**Migração SQL**:
```sql
ALTER TABLE vehicle_regions 
ADD COLUMN product_type_id INTEGER REFERENCES product_types(id),
ADD COLUMN fixed_price DECIMAL(10,2) DEFAULT 0;
```

---

## 7. Janelas de Ajuda Flutuante por Aba

### 7a. Criar Componente HelpOverlay

**Criar**: `src/components/help/HelpOverlay.tsx`

Componente modal/drawer que exibe:
- Imagem ilustrativa
- Texto explicativo
- Botão "Fechar"
- Checkbox "Não mostrar novamente nesta aba"

```tsx
interface HelpOverlayProps {
  tabId: string; // identificador único da aba (ex: "dashboard", "vendas", "estoque")
  title: string;
  description: string;
  imageUrl?: string;
  steps?: { title: string; description: string }[];
}

export function HelpOverlay({ tabId, title, description, steps }: HelpOverlayProps) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Verificar localStorage se deve mostrar
    const dismissed = localStorage.getItem(`help-dismissed-${tabId}`);
    if (!dismissed) {
      setShow(true);
    }
  }, [tabId]);

  const handleDismiss = (permanent: boolean) => {
    if (permanent) {
      localStorage.setItem(`help-dismissed-${tabId}`, 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {imageUrl && <img src={imageUrl} alt="Help" className="rounded-lg" />}
        
        <p className="text-muted-foreground">{description}</p>
        
        {steps && (
          <ol className="list-decimal pl-4 space-y-2">
            {steps.map((step, i) => (
              <li key={i}>
                <strong>{step.title}</strong>: {step.description}
              </li>
            ))}
          </ol>
        )}
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Checkbox id="dismiss" onCheckedChange={(v) => handleDismiss(!!v)} />
            <Label htmlFor="dismiss" className="text-sm">
              Não mostrar novamente
            </Label>
          </div>
          <Button onClick={() => setShow(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 7b. Integrar nas Páginas

Adicionar `<HelpOverlay>` em cada página principal:

```tsx
// Dashboard.tsx
<HelpOverlay 
  tabId="dashboard"
  title="Bem-vindo ao Painel"
  description="Aqui você pode ver um resumo das suas vendas, clientes e vagas."
  steps={[
    { title: "Preencher Vaga", description: "Clique para registrar um novo veículo no espaço" },
    { title: "Novo Cliente", description: "Cadastre novos clientes rapidamente" },
  ]}
/>
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/layout/TopNavigation.tsx` | Nova barra de navegação horizontal |
| `src/pages/Servicos.tsx` | Nova página de gerenciamento de serviços |
| `src/components/help/HelpOverlay.tsx` | Componente de ajuda flutuante |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/MainLayout.tsx` | Trocar Sidebar por TopNavigation |
| `src/components/layout/Sidebar.tsx` | Remover texto "WFE EVOLUTION" |
| `src/components/dashboard/QuickActions.tsx` | Manter apenas 2 botões |
| `src/pages/Dashboard.tsx` | Atualizar ações rápidas |
| `src/components/espaco/FillSlotModal.tsx` | Adicionar serviços detalhados, botão novo veículo |
| `src/components/vendas/ServiceItemRow.tsx` | Tornar preço editável |
| `src/components/vendas/NewSaleModal.tsx` | Adicionar botão novo veículo |
| `src/pages/Estoque.tsx` | Remover abas de regiões e regras |
| `src/components/estoque/VehicleRegionsTab.tsx` | Renomear e adicionar campos |
| `src/App.tsx` | Adicionar rota /servicos |

---

## Fluxo Atualizado

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  FLUXO ANTIGO                                                              │
│  Cliente → Venda (com serviços) → Preencher Vaga (vincula venda)           │
└────────────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────────────┐
│  FLUXO NOVO                                                                │
│  1. Cadastrar Cliente                                                      │
│  2. Cadastrar Veículo (ou selecionar existente)                            │
│  3. Preencher Vaga (com serviços detalhados e preços)                      │
│  4. Quando serviço finalizado → Cadastrar Venda (pagamento)                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação Sugerida

1. **Fase 1**: Navegação (itens 1 e 2)
   - Remover "WFE EVOLUTION"
   - Criar TopNavigation horizontal
   
2. **Fase 2**: Dashboard e Fluxo (itens 3 e 4)
   - Simplificar QuickActions
   - Atualizar FillSlotModal com serviços detalhados
   - Preço editável no ServiceItemRow
   - Botão "Novo Veículo"

3. **Fase 3**: Reorganização de Módulos (itens 5 e 6)
   - Criar página Serviços
   - Mover abas de Estoque
   - Atualizar banco de dados

4. **Fase 4**: Sistema de Ajuda (item 7)
   - Criar HelpOverlay
   - Integrar em todas as páginas

---

## Detalhes Técnicos da Navegação Horizontal

### Comportamento Responsivo

- **Desktop (>1024px)**: Menu horizontal completo
- **Tablet (768-1024px)**: Menu com ícones + labels abreviados
- **Mobile (<768px)**: Hambúrguer que abre drawer lateral

### Estrutura do TopNavigation

```tsx
<header className="fixed top-0 left-0 right-0 h-16 bg-background border-b z-50">
  <div className="h-full flex items-center px-4 gap-6">
    {/* Logo */}
    <Link to="/">
      <img src={wfeLogo} alt="WFE" className="h-10" />
    </Link>

    {/* Desktop Menu */}
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>

    {/* Mobile Menu Toggle */}
    <Button variant="ghost" className="lg:hidden ml-auto" onClick={toggleMobile}>
      <Menu className="w-5 h-5" />
    </Button>

    {/* User Avatar */}
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden lg:flex ml-auto">
        <Avatar>...</Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Perfil</DropdownMenuItem>
        <DropdownMenuItem>Empresa</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</header>
```
