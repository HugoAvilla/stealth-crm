
# Plano: Remover Sidebar Vertical do Menu Mobile

## Problema Identificado

Atualmente, no **mobile** (telas menores que `lg`), a navegação está escondida num menu hambúrguer (Sheet) que abre uma sidebar vertical à esquerda (conforme imagem enviada). O usuário deseja que a navegação fique **sempre visível no topo em formato horizontal**, igual no desktop.

### Layout Atual (Mobile)
```text
┌─────────────────────────────────────┐
│ [Logo]              [☰]    [Usuário]│  ← Clica no ☰ para abrir sidebar
└─────────────────────────────────────┘
```

### Layout Desejado (Mobile e Desktop)
```text
┌───────────────────────────────────────────────────────────────┐
│ [Logo] [Painel] [Vendas] [Espaço] ... ← scroll →   [Usuário] │
└───────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Arquivo: `src/components/layout/TopNavigation.tsx`

#### 1. Remover o Menu Hambúrguer (Sheet)

Deletar completamente:
- O import do `Sheet` (linha 35)
- O state `mobileOpen` (linha 49)
- Todo o bloco `<Sheet>` (linhas 163-231)

#### 2. Tornar a Navegação Horizontal Sempre Visível

Alterar a nav desktop para aparecer em **todas** as telas:

```tsx
// ANTES (linha 156):
<nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">

// DEPOIS:
<nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
```

#### 3. Ajustar o NavLink para Mobile

Os links devem ficar menores em telas pequenas:

```tsx
const NavLink = ({ item }: { item: NavItem }) => {
  const isActive = location.pathname === item.path;
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{item.label}</span>
      {item.badge && item.badge > 0 && (
        <Badge variant="destructive" className="h-4 min-w-4 sm:h-5 sm:min-w-5 text-[10px] sm:text-xs">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
};
```

Em telas muito pequenas, os labels ficarão ocultos e aparecerão apenas os ícones. O usuário pode dar scroll horizontal para ver todos os itens.

#### 4. Ajustar o Dropdown do Usuário para Mobile

Alterar o dropdown para aparecer em todas as telas:

```tsx
// ANTES (linha 236):
<Button variant="ghost" className="hidden lg:flex items-center gap-2 ml-auto">

// DEPOIS:
<Button variant="ghost" className="flex items-center gap-1 sm:gap-2 ml-auto">
```

#### 5. Adicionar Perfil e Empresa no NavItems

Atualmente "Perfil" e "Sua Empresa" só aparecem no dropdown. Para manter consistência, adicionar esses itens na lista `navItems`:

```tsx
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/' },
  { icon: DollarSign, label: 'Vendas', path: '/vendas' },
  // ... outros itens ...
  { icon: User, label: 'Perfil', path: '/perfil' },
  { icon: Building, label: 'Empresa', path: '/empresa', adminOnly: true },
];
```

---

## Resultado Final

### Desktop (telas grandes)
```text
┌───────────────────────────────────────────────────────────────────────┐
│ [Logo] [Painel] [Vendas] [Espaço] [Financ.] [...] ←scroll→ [H User ▼] │
└───────────────────────────────────────────────────────────────────────┘
```

### Mobile (telas pequenas)
```text
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [🏠] [💵] [🏢] [💳] [🏛] [...] ←scroll→     [H ▼]   │
└─────────────────────────────────────────────────────────────┘
```

- Apenas ícones visíveis em telas muito pequenas
- Scroll horizontal para acessar todos os itens
- Dropdown do usuário sempre visível (compacto)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/TopNavigation.tsx` | Remover Sheet mobile, tornar nav horizontal sempre visível, adicionar Perfil e Empresa nos navItems |

---

## Detalhes Técnicos

1. Remover imports não utilizados: `Sheet`, `SheetContent`, `SheetTrigger`, `Menu`, `X`
2. Remover state `mobileOpen`
3. A navegação usará `overflow-x-auto scrollbar-hide` para permitir scroll horizontal
4. Em telas `< sm`, apenas ícones aparecerão (`hidden sm:inline` no label)
5. O usuário poderá ver todos os módulos arrastando horizontalmente a barra de navegação
