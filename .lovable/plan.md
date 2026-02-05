
# Plano: Sub-aba Servicos em Garantias e Remover Configuracao de Equipe

## Resumo das Alteracoes

Este plano aborda duas solicitacoes:

1. **Aba Garantias** - Criar sub-aba "Servicos" para gerenciar servicos associados a garantias
2. **Aba Sua Empresa** - Remover botao "Configurar" do card de Equipe (limite de membros so pode ser alterado pelo Master)

---

## 1. Sub-aba Servicos na Aba Garantias

### Objetivo
Criar um sistema de abas dentro da pagina Garantias, permitindo gerenciar servicos associados que podem ser enviados para clientes junto com as garantias.

### Estrutura de Abas

```text
+------------------------------------------+
|  [Garantias] | [Servicos]                |
+------------------------------------------+
```

### Sub-aba Garantias (conteudo atual)
Mantem todo o conteudo existente:
- Stats (Total Emitidos, Ativas, Modelos)
- Busca
- Tabela de garantias
- Botoes: Criar Garantia Produto, Emitir Garantia

### Nova Sub-aba Servicos
Nova interface para gerenciar servicos associados a garantias:

**Componentes:**
- Botao "Criar Servico" no header
- Tabela com lista de servicos associados
- Cada servico exibe: Nome, Descricao, Garantia Associada, Acoes (Editar/Excluir/Enviar)

**Modal "Criar Servico Associado":**
- Campo: Nome do servico
- Campo: Descricao
- Campo: Selecionar garantia associada (dropdown com modelos de garantia)
- Campo: Instrucoes para o cliente (textarea)
- Botoes: Cancelar / Criar

### Nova Tabela no Banco de Dados

Sera necessario criar uma tabela `warranty_services` para armazenar os servicos associados:

```sql
CREATE TABLE warranty_services (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  warranty_template_id INTEGER REFERENCES warranty_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Garantias.tsx` | Adicionar sistema de Tabs com duas sub-abas |
| Novo: `src/components/garantias/WarrantyServicesTab.tsx` | Componente da sub-aba Servicos |
| Novo: `src/components/garantias/NewWarrantyServiceModal.tsx` | Modal para criar servico associado |

---

## 2. Remover Configuracao de Equipe na Aba Empresa

### Objetivo
O botao "Configurar" no card de Equipe permite alterar o limite de membros. Esta funcionalidade deve ser exclusiva do Painel Master, entao o botao sera removido da pagina "Sua Empresa".

### Alteracoes Visuais

**Antes:**
```text
+-----------------------------------+
| Equipe               [Configurar] |
| Membros              1 de 12      |
| ================================  |
| Codigo da Empresa...              |
+-----------------------------------+
```

**Depois:**
```text
+-----------------------------------+
| Equipe                            |
| Membros              1 de 12      |
| ================================  |
| Codigo da Empresa...              |
+-----------------------------------+
```

### Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Empresa.tsx` | Remover botao "Configurar", remover estado `showTeamSettings`, remover import e uso do `TeamSettingsModal` |

---

## Resumo Visual

```text
GARANTIAS
+------------------------------------------+
|  [Garantias] | [Servicos]                |
+------------------------------------------+
|                                          |
|  Aba Garantias: Conteudo atual           |
|                                          |
|  Aba Servicos:                           |
|  [+ Criar Servico]                       |
|  +------------------------------------+  |
|  | Nome | Descricao | Garantia | Acoes|  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+

SUA EMPRESA - CARD EQUIPE
+-----------------------------------+
| Equipe                            |
| Membros              1 de 12      |
| ================================  |
| Codigo da Empresa...              |
+-----------------------------------+
(Sem botao Configurar - alteracao apenas no Master)
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/garantias/WarrantyServicesTab.tsx` | Componente para listar e gerenciar servicos associados |
| `src/components/garantias/NewWarrantyServiceModal.tsx` | Modal para criar novo servico associado a garantia |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Garantias.tsx` | Adicionar Tabs (Garantias / Servicos) |
| `src/pages/Empresa.tsx` | Remover botao Configurar e TeamSettingsModal |

## Migracao SQL

```sql
-- Criar tabela de servicos associados a garantias
CREATE TABLE warranty_services (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  warranty_template_id INTEGER REFERENCES warranty_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE warranty_services ENABLE ROW LEVEL SECURITY;

-- Politica para empresas verem seus proprios servicos
CREATE POLICY "Users can view their company warranty services"
  ON warranty_services FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para inserir
CREATE POLICY "Users can insert warranty services for their company"
  ON warranty_services FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para atualizar
CREATE POLICY "Users can update their company warranty services"
  ON warranty_services FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Politica para deletar
CREATE POLICY "Users can delete their company warranty services"
  ON warranty_services FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );
```

---

## Ordem de Implementacao

1. Criar migracao SQL para tabela `warranty_services`
2. Atualizar types do Supabase
3. Criar componente `WarrantyServicesTab.tsx`
4. Criar componente `NewWarrantyServiceModal.tsx`
5. Modificar `Garantias.tsx` para usar Tabs
6. Modificar `Empresa.tsx` para remover configuracao de equipe
