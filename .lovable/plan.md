
# Plano: 4 Correções no Módulo Espaço (Preencher Vaga + Detalhes da Vaga)

## Item 1: Trocar "Atualizar" por "+Novo" no seletor de cliente

**Arquivo:** `src/components/espaco/FillSlotModal.tsx`

No card de seleção de cliente (linhas 360-390), o botao "Atualizar" (com icone RefreshCw) sera substituido por um botao "+Novo" que abre o modal `NewClientModal` para cadastrar novos clientes diretamente no fluxo de preenchimento.

**Alteracoes:**
- Importar `NewClientModal` de `@/components/vendas/NewClientModal`
- Adicionar estado `showNewClientModal`
- Trocar o botao "Atualizar" por "+Novo" com icone `Plus`
- Ao criar cliente com sucesso, fazer `refetchClients()` e selecionar o novo cliente automaticamente
- Renderizar o `NewClientModal` no final do componente

---

## Item 2: Corrigir "Nenhum servico vinculado" no Drawer de Detalhes

**Problema raiz:** Quando a vaga e criada no `FillSlotModal`, os servicos adicionados pelo usuario **nao sao salvos no banco de dados**. O codigo atual (linhas 294-306) apenas concatena os nomes dos servicos no campo `observations` como texto. Porem, o `SlotDetailsDrawer` tenta ler servicos de `space.sale?.sale_items` (linha 328), que e sempre `null` porque nenhuma venda e criada nesse momento.

**Solucao:** Adicionar uma coluna JSONB `services_data` na tabela `spaces` para armazenar os servicos diretamente na vaga, independente de uma venda vinculada.

**Alteracoes:**

1. **Migracao SQL:** Adicionar coluna `services_data` (JSONB) na tabela `spaces`
```sql
ALTER TABLE spaces ADD COLUMN services_data jsonb DEFAULT '[]';
```

2. **`FillSlotModal.tsx`** (linhas 267-307): Ao criar a vaga, salvar `services_data` com os dados dos servicos:
```json
[
  {"regionName": "Para-brisa", "productTypeName": "Insulfilm G5", "totalPrice": 150.00, "metersUsed": 2.5},
  {"regionName": "Laterais", "productTypeName": "Insulfilm G5", "totalPrice": 200.00, "metersUsed": 3.0}
]
```

3. **`SlotDetailsDrawer.tsx`** (linhas 328-341): Alterar a exibicao de servicos para ler de `space.services_data` (JSONB) quando `sale_items` nao existir:
```tsx
const services = space.sale?.sale_items?.length > 0
  ? space.sale.sale_items.map(item => ({ name: item.service?.name, price: item.total_price }))
  : (space.services_data || []).map(s => ({ name: s.regionName, price: s.totalPrice }));
```

4. **`SlotDetailsDrawer.tsx`**: Atualizar o calculo de `subtotal` e `serviceCount` para considerar `services_data`

5. **`Espaco.tsx`**: A query ja usa `select(*)` para spaces, entao `services_data` sera incluida automaticamente

---

## Item 3: Ativar botoes de "Comprovantes em PDF" e "Mais opcoes"

**Arquivo:** `src/components/espaco/SlotDetailsDrawer.tsx`

Todos os botoes atualmente estao `disabled`. Alteracoes:

| Botao | Acao |
|-------|------|
| Baixar PDF em formato A4 | Gerar PDF A4 usando `jsPDF` com dados da vaga |
| Baixar PDF em formato Notinha | Gerar PDF notinha (80mm) com dados da vaga |
| Baixar PDF em formato Notinha Mini | Gerar PDF notinha mini (58mm) com dados da vaga |
| Enviar mensagem de entrada | Abrir novo modal WhatsApp (Item 4) |
| Enviar mensagem de saida | Abrir novo modal WhatsApp (Item 4) |
| **Exportar para agenda** | **REMOVER** este botao |
| Ver cliente da vaga | Navegar para pagina de Clientes ou abrir perfil do cliente |

**Para PDFs:** Criar funcao `generateSpacePDF()` em `src/lib/pdfGenerator.ts` que recebe os dados da vaga e gera o comprovante de ocupacao, similar ao que ja existe para vendas.

**Para "Ver cliente da vaga":** Usar `useNavigate` para redirecionar para `/clientes` ou abrir o `ClientProfileModal`.

---

## Item 4: Criar modal de mensagem WhatsApp para entrada/saida

**Novo arquivo:** `src/components/espaco/SpaceWhatsAppModal.tsx`

Baseado nas imagens de referencia fornecidas, o modal tera:

### Modo Visualizacao (padrao):
- 3 botoes no topo: **"Enviar WhatsApp"** (verde), **"Editar mensagem"** (azul), **"Fechar"** (vermelho)
- Preview da mensagem em estilo WhatsApp (fundo bege com padrao, balao verde claro)
- Mensagem pre-preenchida com dados da vaga (nome do cliente, veiculo, placa, data entrada, data saida prevista, observacao)

### Modo Edicao (ao clicar "Editar mensagem"):
- 2 botoes no topo: **"Salvar"** (verde), **"Fechar"** (vermelho)
- Textarea editavel dentro do balao WhatsApp
- Barra inferior com botoes de formatacao e variaveis:
  - **Negrito**, **Italico** (formatacao WhatsApp com `*texto*` e `_texto_`)
  - **+ Nome Empresa**, **+ Veiculo**, **+ Cliente**, **+ Servicos**, **+ Data entrada**, **+ Data saida**, **+ Descricao**, **+ Subtotal**, **+ Desconto**, **+ Total**
  - (Excluindo "Produtos" e "Estofados" conforme solicitado)

### Mensagem padrao de ENTRADA:
```
Ola {cliente}!
O seu veiculo {veiculo} ja esta sob os cuidados da nossa equipe. Agradecemos pela confianca em nosso trabalho.

*Entrada:*
{dataEntrada}

*Saida prevista:*
{dataSaida}

_Obs.: Uma mensagem sera enviada assim que o servico estiver pronto!_
```

### Mensagem padrao de SAIDA:
```
Ola {cliente}!
Seu veiculo {veiculo} esta pronto para retirada!

*Servicos realizados:*
{servicos}

*Total:* R$ {total}

Agradecemos a preferencia! Qualquer duvida estamos a disposicao.
```

### Variaveis disponiveis (botoes na barra inferior):
- `{cliente}` - Nome do cliente
- `{veiculo}` - Marca + Modelo + Placa do veiculo
- `{nomeEmpresa}` - Nome da empresa
- `{servicos}` - Lista de servicos
- `{dataEntrada}` - Data/hora de entrada
- `{dataSaida}` - Data/hora de saida
- `{descricao}` - Observacoes da vaga
- `{subtotal}` - Subtotal dos servicos
- `{desconto}` - Valor do desconto
- `{total}` - Valor total

---

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/espaco/FillSlotModal.tsx` | Trocar "Atualizar" por "+Novo" cliente; salvar `services_data` como JSONB |
| `src/components/espaco/SlotDetailsDrawer.tsx` | Ler servicos de `services_data`; ativar botoes PDF/WhatsApp/cliente; remover "Exportar agenda" |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | **NOVO** - Modal WhatsApp com preview, edicao e variaveis |
| `src/lib/pdfGenerator.ts` | Adicionar funcao `generateSpacePDF()` para comprovantes de vaga |
| Migracao SQL | Adicionar coluna `services_data jsonb` na tabela `spaces` |
| `src/integrations/supabase/types.ts` | Atualizar tipos para incluir `services_data` |
