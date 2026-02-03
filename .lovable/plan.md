

# Plano: Adicionar Gerenciamento de Categorias no Financeiro

## Resumo

Criar funcionalidade para gerenciar categorias financeiras isoladas por empresa, incluindo um modal para criar novas categorias e um botão de gerenciamento integrado ao modal de transacoes.

---

## Problema Atual

As categorias existentes no banco de dados tem `company_id = NULL`, tornando-as globais. Porem, as policies RLS filtram por `company_id = get_user_company_id(auth.uid())`, o que significa que:

1. Empresas nao conseguem ver as categorias globais (NULL nao passa no filtro)
2. Empresas nao podem criar suas proprias categorias (sem modal)
3. O dropdown de categorias pode aparecer vazio

---

## Solucao Proposta

### 1. Criar Modal de Gerenciamento de Categorias

Novo componente `ManageCategoriesModal.tsx` que permite:
- Listar categorias da empresa
- Criar novas categorias (entrada ou saida)
- Editar categorias existentes
- Excluir categorias (com validacao se nao tem transacoes)

### 2. Integrar Botao no Modal de Transacao

No `AddTransactionModal.tsx`, adicionar um botao de "+" ao lado do select de categoria que abre o modal de criar categoria rapidamente.

### 3. Adicionar Menu de Categorias no Financeiro

No dropdown "Adicionar" da pagina Financeiro, incluir opcao para gerenciar categorias.

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/financeiro/ManageCategoriesModal.tsx` | Modal principal de gerenciamento |
| `src/components/financeiro/NewCategoryModal.tsx` | Modal simplificado para criar categoria rapida |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Financeiro.tsx` | Adicionar item "Gerenciar Categorias" no dropdown |
| `src/components/financeiro/AddTransactionModal.tsx` | Adicionar botao "+" ao lado do select de categoria |

---

## Estrutura do ManageCategoriesModal

```text
┌──────────────────────────────────────────────────────────────────┐
│  Gerenciar Categorias                                    [X]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [+ Nova Categoria]                                              │
│                                                                  │
│  Entradas                                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ● Vendas                              [Editar] [Excluir]  │  │
│  │ ● Servicos                            [Editar] [Excluir]  │  │
│  │ ● Comissoes                           [Editar] [Excluir]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Saidas                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ● Custos Fixos                        [Editar] [Excluir]  │  │
│  │ ● Fornecedores                        [Editar] [Excluir]  │  │
│  │ ● Marketing                           [Editar] [Excluir]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Estrutura do NewCategoryModal

Modal simplificado para criar categoria rapidamente:

```text
┌──────────────────────────────────────────────────────────────────┐
│  Nova Categoria                                          [X]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nome *                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Ex: Vendas Online                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Tipo *                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ [●] Entrada    [○] Saida                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Cor (opcional)                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ [🟢] [🔵] [🟡] [🔴] [🟣] [⚫]                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Cancelar]                             [Criar Categoria]        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Integracao no AddTransactionModal

Adicionar botao "+" ao lado do select de categorias:

```text
Categoria *
┌────────────────────────────────────┐  ┌───┐
│ Selecione...                    ▼  │  │ + │
└────────────────────────────────────┘  └───┘
```

Ao clicar no "+":
1. Abre `NewCategoryModal` com o tipo ja pre-selecionado (entrada/saida)
2. Apos criar, atualiza a lista de categorias e seleciona a nova

---

## Detalhes Tecnicos

### Query para listar categorias da empresa
```typescript
const { data } = await supabase
  .from('categories')
  .select('*')
  .eq('company_id', companyId)
  .order('name');
```

### Insert de nova categoria
```typescript
await supabase.from('categories').insert({
  name: categoryName,
  type: categoryType, // 'entrada' ou 'saida'
  color: selectedColor,
  company_id: companyId
});
```

### Validacao antes de excluir
```typescript
// Verificar se existem transacoes usando esta categoria
const { count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('category_id', categoryId);

if (count > 0) {
  toast.error(`Esta categoria possui ${count} transacao(oes). Nao pode ser excluida.`);
  return;
}
```

---

## Alteracoes no Financeiro.tsx

Adicionar no dropdown de acoes:

```tsx
<DropdownMenuItem onClick={() => setCategoryModalOpen(true)}>
  <Tag className="h-4 w-4 mr-2" /> Gerenciar Categorias
</DropdownMenuItem>
```

---

## Isolamento por Empresa (Seguranca)

As policies RLS ja garantem o isolamento:

```sql
-- Usuarios so veem categorias da sua empresa
CREATE POLICY "Users can view categories in their company"
ON public.categories FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- Apenas admins podem gerenciar
CREATE POLICY "Admin can manage categories in their company"
ON public.categories FOR ALL TO authenticated
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);
```

Cada categoria tera `company_id` preenchido, garantindo que:
- Empresa A ve apenas suas categorias
- Empresa B ve apenas suas categorias
- Nenhuma informacao e compartilhada entre empresas

---

## Ordem de Implementacao

1. Criar `NewCategoryModal.tsx` (modal simplificado)
2. Criar `ManageCategoriesModal.tsx` (modal completo de gerenciamento)
3. Modificar `AddTransactionModal.tsx` (adicionar botao "+")
4. Modificar `Financeiro.tsx` (adicionar menu de gerenciamento)
5. Testar criacao e listagem de categorias

---

## Resultado Final

Apos implementacao:
- Empresas podem criar suas proprias categorias
- Categorias sao 100% isoladas por empresa (via `company_id`)
- Usuarios podem criar categorias rapidamente ao registrar transacoes
- Administradores podem gerenciar todas as categorias da empresa

