

# Plano: Remover Pagina Servicos, Corrigir Erro de Estoque e Adicionar Botao Excluir

## Resumo

Este plano aborda tres correcoes solicitadas:
1. Remocao completa da pagina Servicos do sistema
2. Correcao do erro ao registrar entrada/saida de estoque (problema de case-sensitivity)
3. Adicao de botao de excluir em cada item de material na aba Gestao de Estoque

---

## 1. Causa do Erro no Estoque

### Problema Identificado

O banco de dados possui um **CHECK constraint** na tabela `stock_movements` que aceita apenas os valores exatos:
- `'Entrada'` (com E maiusculo)
- `'Saida'` (com S maiusculo)

Porem, o codigo nos modais `StockEntryModal.tsx` e `StockExitModal.tsx` esta enviando:
- `'entrada'` (minusculo) - INCORRETO
- `'saida'` (minusculo) - INCORRETO

### Erro no Log do Banco
```
new row for relation "stock_movements" violates check constraint "stock_movements_movement_type_check"
```

### Solucao

Corrigir os valores enviados para `'Entrada'` e `'Saida'` com a primeira letra maiuscula.

---

## 2. Remocao da Pagina Servicos

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Remover import e rota `/servicos` |
| `src/components/layout/Sidebar.tsx` | Remover item "Servicos" da navegacao |

### Arquivo a Deletar

| Arquivo | Motivo |
|---------|--------|
| `src/pages/Servicos.tsx` | Funcionalidade agora esta no modulo Estoque |

---

## 3. Botao Excluir nos Cards de Material

### Funcionalidade

Adicionar um botao de "Excluir" (icone lixeira) em cada linha da tabela de materiais, ao lado dos botoes de Entrada e Saida.

### Comportamento

1. Ao clicar, exibe confirmacao (AlertDialog)
2. Verifica se existem movimentacoes de estoque para o material
3. Se existirem movimentacoes: Faz soft delete (is_active = false)
4. Se nao existirem: Pode fazer hard delete
5. Atualiza a lista apos exclusao

### Estrutura na Tabela

```text
| Material | Tipo | Estoque | Min | Status | Valor | Acoes        |
|----------|------|---------|-----|--------|-------|--------------|
| PPF 3M   | PPF  | 50m     | 10  | OK     | R$500 | [↓] [↑] [🗑] |
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Remover rota e import de Servicos |
| `src/components/layout/Sidebar.tsx` | Remover item de menu Servicos |
| `src/components/estoque/StockEntryModal.tsx` | Corrigir `movement_type: "Entrada"` |
| `src/components/estoque/StockExitModal.tsx` | Corrigir `movement_type: "Saida"` |
| `src/pages/Estoque.tsx` | Adicionar botao excluir e funcao de exclusao |

---

## Detalhes Tecnicos

### Correcao no StockEntryModal.tsx (linha 59)

```typescript
// ANTES (incorreto)
movement_type: "entrada",

// DEPOIS (correto)
movement_type: "Entrada",
```

### Correcao no StockExitModal.tsx (linha 80)

```typescript
// ANTES (incorreto)
movement_type: "saida",

// DEPOIS (correto)
movement_type: "Saida",
```

### Funcao de Exclusao no Estoque.tsx

```typescript
const handleDelete = async (material: Material) => {
  if (!confirm(`Tem certeza que deseja excluir "${material.name}"?`)) return;
  
  try {
    // Verifica se existem movimentacoes
    const { count } = await supabase
      .from("stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("material_id", material.id);
    
    if (count && count > 0) {
      // Soft delete - apenas desativa
      await supabase
        .from("materials")
        .update({ is_active: false })
        .eq("id", material.id);
    } else {
      // Hard delete - remove completamente
      await supabase
        .from("materials")
        .delete()
        .eq("id", material.id);
    }
    
    toast.success("Material excluído com sucesso");
    fetchMaterials();
  } catch (error) {
    toast.error("Erro ao excluir material");
  }
};
```

### Botao na Tabela

```tsx
<Button 
  variant="ghost" 
  size="icon" 
  onClick={() => handleDelete(material)} 
  title="Excluir"
  className="text-muted-foreground hover:text-destructive"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## Fluxo Visual da Exclusao

```text
Usuario clica em [🗑]
        │
        ▼
┌─────────────────────────┐
│ Confirma exclusao?      │
│ [Cancelar] [Confirmar]  │
└─────────────────────────┘
        │
        ▼
   Tem movimentacoes?
        │
    ┌───┴───┐
    Sim     Nao
    │       │
    ▼       ▼
 Soft    Hard
 Delete  Delete
    │       │
    └───┬───┘
        ▼
   Lista atualizada
```

---

## Ordem de Implementacao

1. Corrigir `StockEntryModal.tsx` - movement_type para "Entrada"
2. Corrigir `StockExitModal.tsx` - movement_type para "Saida"
3. Adicionar botao excluir e funcao em `Estoque.tsx`
4. Remover import e rota de Servicos em `App.tsx`
5. Remover item Servicos do menu em `Sidebar.tsx`
6. Deletar arquivo `src/pages/Servicos.tsx`

---

## Resultado Final

Apos implementacao:
- Entrada e saida de estoque funcionarao corretamente
- Cada material tera botao de exclusao com confirmacao
- A pagina Servicos sera removida do sistema
- A navegacao ficara mais limpa e consistente

