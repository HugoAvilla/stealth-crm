
# Plano: Correcoes de Bugs e Remocao de Funcionalidades Redundantes

## Resumo das Alteracoes

Este plano aborda seis problemas identificados:

1. **Financeiro** - Corrigir criacao de categorias (erro de RLS)
2. **Clientes** - Adicionar rolagem no modal Editar Cliente
3. **Garantias** - Remover sub-aba "Servicos"
4. **Garantias** - Remover card "Servico Associado" do modal "Criar Garantia Produto"
5. **Garantias** - Alterar modal "Emitir Garantia" para selecionar modelos de garantia em vez de vendas
6. **Sidebar/Admin** - Remover aba Admin (redundante com Solicitacoes e Empresa)

---

## 1. Corrigir Criacao de Categorias no Financeiro

### Problema Identificado
A politica RLS da tabela `categories` permite apenas usuarios com role `ADMIN` inserir categorias. Porem, a verificacao usa a funcao `has_role()` que depende da tabela `user_roles`. 

Analisando os dados:
- As categorias existentes tem `company_id: null` (categorias padrao do sistema)
- A politica exige `company_id = get_user_company_id(auth.uid())`

**Causa provavel**: A politica atual permite apenas `ALL` (SELECT, INSERT, UPDATE, DELETE) para ADMIN, mas nao inclui INSERT explicito. Precisamos criar uma politica separada para INSERT.

### Solucao

Criar politica RLS especifica para INSERT que permita ADMIN e VENDEDOR criarem categorias:

```sql
CREATE POLICY "Users can insert categories in their company"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
  );
```

**Arquivo afetado**: Nova migracao SQL

---

## 2. Adicionar Rolagem no Modal Editar Cliente

### Problema
O conteudo do modal ultrapassa a tela e nao ha como visualizar campos adicionais (CPF, Email, Origem) quando expandidos.

### Analise
O arquivo `src/components/clientes/EditClientModal.tsx` ja usa `ScrollArea` na linha 114, mas com `className="flex-1 pr-4"`. O problema e que o container pai (`DialogContent`) tem `max-h-[90vh]` mas o ScrollArea precisa de uma altura fixa.

### Solucao
Ajustar o ScrollArea para ter uma altura maxima explicita:

```tsx
<ScrollArea className="flex-1 pr-4 max-h-[60vh]">
```

**Arquivo afetado**: `src/components/clientes/EditClientModal.tsx`

---

## 3. Remover Sub-aba "Servicos" da Aba Garantias

### Problema
O usuario solicitou a remocao da sub-aba "Servicos" que foi criada anteriormente.

### Solucao
1. Remover o componente `TabsList` e `TabsTrigger` do arquivo `Garantias.tsx`
2. Manter apenas o conteudo da aba "Garantias"
3. Remover import e uso de `WarrantyServicesTab`

**Arquivo afetado**: `src/pages/Garantias.tsx`

---

## 4. Remover Card "Servico Associado" do Modal Criar Garantia Produto

### Problema
No modal `NewWarrantyTemplateModal.tsx`, existe um campo "Servico Associado" que usa dados mock (`services` de mockData). Este campo deve ser removido.

### Solucao
1. Remover o campo `serviceId` e seu estado
2. Remover o Select de "Servico Associado"
3. Ajustar a validacao para nao exigir `serviceId`

**Arquivo afetado**: `src/components/garantias/NewWarrantyTemplateModal.tsx`

---

## 5. Alterar Modal "Emitir Garantia" para Selecionar Modelos de Garantia

### Problema Atual
O modal `IssueWarrantyModal.tsx` atualmente:
1. Seleciona uma venda primeiro
2. Depois mostra modelos de garantia baseados nos servicos da venda

### Nova Logica
O modal deve:
1. Buscar modelos de garantia (`warranty_templates`) direto do banco de dados
2. Permitir selecionar um modelo
3. Preencher os dados do cliente/veiculo baseado em vendas existentes OU input manual

### Solucao
Reescrever o modal para:
1. Buscar `warranty_templates` do Supabase em vez de usar mock data
2. Primeiro selecionar o modelo de garantia
3. Permitir selecionar cliente/veiculo ou inserir dados manualmente
4. Manter a funcionalidade de pre-visualizacao

**Arquivo afetado**: `src/components/garantias/IssueWarrantyModal.tsx`

---

## 6. Verificar e Manter Botao "Desvincular" + Remover Aba Admin

### Botao Desvincular
Analisando `TeamRequests.tsx`:
- Linhas 179-217 implementam `handleUnlinkMember`
- A funcao atualiza `profiles.company_id = null` e `user_roles.role = 'NENHUM'`
- O botao esta presente nas linhas 378-387

O botao esta implementado corretamente. Recomendo apenas verificar se funciona no ambiente de producao.

### Remocao da Aba Admin
A aba Admin (`src/pages/Admin.tsx`) e redundante porque:
- Gerenciamento de usuarios: ja existe em "Solicitacoes" (aprovar/rejeitar/desvincular)
- Permissoes: sao definidas no momento da solicitacao de entrada

**Solucao**:
1. Remover a rota `/admin` de `App.tsx`
2. Remover o item de navegacao do `Sidebar.tsx`
3. Manter os arquivos para backup (podem ser uteis futuramente)

**Arquivos afetados**: 
- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Adicionar politica INSERT para categories |
| `src/components/clientes/EditClientModal.tsx` | Ajustar altura do ScrollArea |
| `src/pages/Garantias.tsx` | Remover sub-aba Servicos e Tabs |
| `src/components/garantias/NewWarrantyTemplateModal.tsx` | Remover campo Servico Associado |
| `src/components/garantias/IssueWarrantyModal.tsx` | Mudar de selecionar venda para selecionar modelo |
| `src/App.tsx` | Remover rota /admin |
| `src/components/layout/Sidebar.tsx` | Remover link Admin do menu |

---

## Secao Tecnica: Detalhes da Migracao SQL

```sql
-- Permitir ADMIN e VENDEDOR criarem categorias na sua empresa
CREATE POLICY "Users can create categories in their company"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'VENDEDOR'::app_role])
  );
```

---

## Secao Tecnica: Alteracao do IssueWarrantyModal

O modal sera reescrito para:

1. **Estado**:
   - `templateId` - ID do modelo selecionado
   - `templates` - Lista de modelos do banco
   - `clientData` - Dados do cliente (nome, telefone, email)
   - `vehicleData` - Dados do veiculo (marca, modelo, placa, ano)

2. **useEffect**:
   - Buscar modelos de garantia do Supabase ao abrir

3. **Interface**:
   - Dropdown para selecionar modelo de garantia (em vez de venda)
   - Campos editaveis para cliente e veiculo
   - Manter a aba de pre-visualizacao

---

## Ordem de Implementacao

1. Criar migracao SQL para politica INSERT em categories
2. Corrigir ScrollArea no EditClientModal
3. Remover sub-aba Servicos de Garantias.tsx
4. Remover Servico Associado de NewWarrantyTemplateModal
5. Reescrever IssueWarrantyModal para usar modelos do banco
6. Remover aba Admin do Sidebar e App.tsx

---

## Resumo Visual

```text
FINANCEIRO
+-----------------------------------+
| Criar Categoria -> FUNCIONA!      |
| (RLS ajustada para INSERT)        |
+-----------------------------------+

CLIENTES > EDITAR CLIENTE
+-----------------------------------+
| Modal com SCROLL funcionando      |
| max-h-[60vh] no ScrollArea        |
+-----------------------------------+

GARANTIAS
+-----------------------------------+
| [Garantias] (sem sub-abas)        |
|                                   |
| Criar Garantia Produto:           |
| - Sem "Servico Associado"         |
|                                   |
| Emitir Garantia:                  |
| - Selecionar Modelo (nao Venda)   |
+-----------------------------------+

SIDEBAR
+-----------------------------------+
| Painel                            |
| Vendas                            |
| ...                               |
| Solicitacoes                      |
| [Admin REMOVIDO]                  |
| Painel Master                     |
+-----------------------------------+
```
