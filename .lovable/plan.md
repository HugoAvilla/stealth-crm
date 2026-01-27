
# Plano de Correcoes e Novas Funcionalidades do CRM WFE EVOLUTION

## Resumo das Alteracoes

Este plano aborda **12 correcoes e novas funcionalidades** solicitadas, organizadas por modulo.

---

## 1. CORRECAO: Dashboard - Sidebar Duplicada e Dimensoes

**Problema:** O `Dashboard.tsx` possui `<MainLayout>` interno (linha 35), mas o `App.tsx` ja envolve com `<MainLayout>`, causando sidebar duplicada e dimensoes erradas.

**Arquivo:** `src/pages/Dashboard.tsx`

**Alteracoes:**
- Remover wrapper `<MainLayout>` interno (linhas 35 e 149)
- Retornar apenas `<div className="p-6 lg:p-8 space-y-8">...</div>`
- Adicionar estados para modais: `showNewSaleModal`, `showNewClientModal`
- Importar `useNavigate`, `NewSaleModal`, `NewClientModal`
- Modificar callbacks do `QuickActions`:
  - `onNewSale={() => setShowNewSaleModal(true)}` 
  - `onNewSlot={() => navigate('/espaco')}`
  - `onNewClient={() => setShowNewClientModal(true)}`
- Renderizar modais no final do componente

---

## 2. NOVA FUNCIONALIDADE: Logo WFE na Sidebar e Login

**Arquivos:** 
- `src/assets/wfe-logo.png` (copiar logo do usuario)
- `src/components/layout/Sidebar.tsx`
- `src/pages/Login.tsx`

**Alteracoes Sidebar (linhas 61-73):**
- Substituir o icone SVG de aviaoaviazinho pela imagem da logo
- Usar `<img src={wfeLogo} alt="WFE Evolution" className="h-8 w-auto" />`
- Manter texto "WFE EVOLUTION" ao lado quando expandido

**Alteracoes Login (linhas 54-67):**
- Substituir o icone SVG pela imagem da logo
- Ajustar tamanho para `h-12 w-auto` para visibilidade
- Manter texto "WFE EVOLUTION" ao lado

---

## 3. CRUD: Sistema de Contas Bancarias

**Arquivos:**
- `src/pages/Contas.tsx` (modificar)
- `src/components/contas/EditAccountModal.tsx` (criar novo)

**Alteracoes em Contas.tsx:**
- Adicionar estado `localAccounts` inicializado com `accounts` do mockData
- Adicionar estados: `showAddAccountModal`, `editingAccount`
- Adicionar botao "+" ao lado do titulo "Contas" na sidebar
- Adicionar icone de engrenagem em cada card de conta (posicao superior direita)
- Importar e renderizar `AddAccountModal` e `EditAccountModal`
- Callbacks: `handleAccountCreated`, `handleAccountUpdated`, `handleAccountDeleted`

**Novo Componente EditAccountModal.tsx:**
```text
Props:
- open, onOpenChange
- account: Account
- onAccountUpdated: (account) => void
- onAccountDeleted: (accountId) => void

Campos:
- Nome da Conta (Input)
- Tipo (Select: Conta Corrente, Poupanca, Carteira, Investimento)
- Saldo Inicial (Input number)
- Conta Principal (Switch)

Botoes:
- Cancelar
- Excluir Conta (vermelho, com AlertDialog de confirmacao)
- Salvar Alteracoes
```

---

## 4. NOVA FUNCIONALIDADE: Chat Interno de Clientes

**Arquivos:**
- `src/pages/Clientes.tsx` (modificar)
- `src/components/clientes/ClientChatModal.tsx` (criar novo)

**Alteracoes em Clientes.tsx (linhas 203-210):**
- Remover redirecionamento para WhatsApp ao clicar no telefone
- Adicionar estado `showChatModal`, `chatClient`
- Ao clicar no numero, abrir `ClientChatModal` com historico de conversas

**Novo Componente ClientChatModal.tsx:**
```text
Props:
- open, onOpenChange
- client: Client

Layout:
- Header com nome do cliente e foto
- Area de mensagens com scroll (historico mockado)
- Input de nova mensagem + botao enviar
- Mensagens com baloes estilo chat (enviadas vs recebidas)
- Timestamps em cada mensagem

Mock Data:
- Adicionar `clientMessages` ao mockData.ts com conversas de exemplo
```

---

## 5. REMOCAO: Campos Desnecessarios em Novo Servico

**Arquivo:** `src/components/servicos/NewServiceModal.tsx`

**Alteracoes (remover linhas 106-127):**
- Remover campo "Dias para Pos-Venda" (input + label + helper text)
- Remover campo "Auto-Agendamento" (switch + labels)
- Remover estados `postSaleDays` e `autoSchedule`
- Ajustar `resetForm()` para nao incluir esses campos

---

## 6. NOVA FUNCIONALIDADE: Sistema de Garantias de Produtos

**Arquivos:**
- `src/pages/Garantias.tsx` (modificar)
- `src/components/garantias/NewWarrantyTemplateModal.tsx` (criar novo)
- `src/components/garantias/IssueWarrantyModal.tsx` (modificar significativamente)
- `src/lib/mockData.ts` (atualizar warrantyTemplates)

**Alteracoes em Garantias.tsx:**
- Adicionar botao "Criar Garantia Produto" ao lado de "Emitir Garantia"
- Esse botao abre `NewWarrantyTemplateModal` para criar templates pre-salvos
- Botao "Emitir Garantia" (amarelo) abre modal para editar e enviar ao cliente

**Novo Componente NewWarrantyTemplateModal.tsx:**
```text
Props:
- open, onOpenChange
- onTemplateCreated

Campos:
- Nome do Modelo (ex: "ULTRA BLACK 4 Anos")
- Servico Associado (Select)
- Validade em Meses (Input number)
- Termos da Garantia (Textarea com texto extenso)
- Cobertura (Textarea)
- Restricoes (Textarea)

Funcionalidade:
- Salva template pre-configurado para uso futuro
```

**Modificar IssueWarrantyModal.tsx:**
O modal agora funciona como editor de garantia com preview baseado no PDF enviado:

```text
Layout baseado no PDF analisado:
-----------------------------------
CABECALHO:
- Logo da empresa
- Nome da empresa
- CNPJ, WhatsApp, Email, Endereco

NUMERO DA VENDA:
- Venda No X realizada em DD/MM/YYYY

INFORMACOES DO CLIENTE:
- Nome, WhatsApp, Email, CPF/CNPJ

VEICULO E SERVICO:
- Marca, Modelo, Ano
- Tabela de servicos com precos

GARANTIAS (editavel):
- Lista de linhas de produtos com anos de garantia
- COBERTURA DA GARANTIA (texto editavel)
- Instrucoes de cuidado (lista de bullets)
- Observacao sobre intransferibilidade

VALORES FINAIS:
- Forma de pagamento
- Subtotal, Desconto, Total
-----------------------------------

Acoes:
- Preview em tempo real
- Editar campos antes de enviar
- Botao "Enviar para Cliente" (gera PDF + envia por email/whatsapp)
```

---

## 7. NOVA FUNCIONALIDADE: Chat nos Cards do Pipeline

**Arquivo:** `src/pages/Pipeline.tsx`

**Alteracoes (apos linha 150):**
- Adicionar botao de chat (icone `MessageCircle`) em TODOS os cards
- Ao clicar, abre o `ClientChatModal` (mesmo componente da aba Clientes)
- Passar o cliente do card como prop

**Codigo resumido:**
```text
<Button
  size="sm"
  variant="ghost"
  className="absolute top-2 right-2"
  onClick={() => openChat(client)}
>
  <MessageCircle className="h-4 w-4" />
</Button>
```

---

## 8. REMOCAO: Opcao de Tema na aba Perfil

**Arquivo:** `src/pages/Perfil.tsx`

**Alteracoes:**
- Remover estado `darkMode` (linha 17)
- Remover card "Modo Escuro" inteiro (linhas 71-85)
- O sistema permanece apenas em modo escuro

---

## 9. REMOCAO: Personalizacao de Cor na aba Empresa

**Arquivo:** `src/pages/Empresa.tsx`

**Alteracoes:**
- Remover constante `COLORS` (linhas 9-14)
- Remover estado `primaryColor` (linha 18)
- Remover funcao `handleColorChange` (linhas 20-23)
- Remover card "Personalizacao" inteiro (linhas 109-142)

---

## 10. Copiar Logo WFE para o Projeto

**Acao:**
- Copiar `user-uploads://TESTE_PNG_LOGO_WFE_2026.png` para `src/assets/wfe-logo.png`
- A logo sera importada como modulo ES6 nos componentes

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/assets/wfe-logo.png` | Logo WFE Evolution |
| `src/components/contas/EditAccountModal.tsx` | Modal editar/excluir conta |
| `src/components/clientes/ClientChatModal.tsx` | Chat interno do cliente |
| `src/components/garantias/NewWarrantyTemplateModal.tsx` | Criar templates de garantia |

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/pages/Dashboard.tsx` | Remover MainLayout, adicionar modais funcionais |
| `src/components/layout/Sidebar.tsx` | Substituir icone por logo WFE |
| `src/pages/Login.tsx` | Substituir icone por logo WFE |
| `src/pages/Contas.tsx` | CRUD completo de contas bancarias |
| `src/pages/Clientes.tsx` | Chat interno ao clicar no telefone |
| `src/components/servicos/NewServiceModal.tsx` | Remover campos desnecessarios |
| `src/pages/Garantias.tsx` | Botao criar template + fluxo de emissao |
| `src/components/garantias/IssueWarrantyModal.tsx` | Editor completo baseado no PDF |
| `src/pages/Pipeline.tsx` | Botao chat em todos os cards |
| `src/pages/Perfil.tsx` | Remover toggle tema |
| `src/pages/Empresa.tsx` | Remover paleta de cores |
| `src/lib/mockData.ts` | Adicionar `clientMessages` para chat |

---

## Estrutura do Chat Mock Data

```text
// Adicionar ao mockData.ts
export interface ChatMessage {
  id: number;
  client_id: number;
  content: string;
  sender: 'client' | 'company';
  timestamp: string;
  read: boolean;
}

export const clientMessages: ChatMessage[] = [
  {
    id: 1,
    client_id: 1,
    content: "Ola! Gostaria de saber sobre o servico de vitrificacao.",
    sender: 'client',
    timestamp: "2025-01-20T10:30:00",
    read: true
  },
  ...
];
```

---

## Ordem de Implementacao

1. Copiar logo WFE para assets
2. Corrigir Dashboard (sidebar duplicada + botoes funcionais)
3. Atualizar Sidebar e Login com nova logo
4. Implementar CRUD de Contas (Contas.tsx + EditAccountModal)
5. Implementar Chat interno (mockData + ClientChatModal + Clientes.tsx)
6. Limpar NewServiceModal (remover campos)
7. Sistema de Garantias (templates + emissao baseada no PDF)
8. Adicionar chat ao Pipeline
9. Remover tema do Perfil
10. Remover cores da Empresa

---

## Resultado Esperado

- **Dashboard:** Proporcional, uma sidebar, botoes funcionais
- **Logo:** WFE Evolution em sidebar e login
- **Contas:** Adicionar, editar e remover contas bancarias
- **Clientes:** Chat interno ao clicar no telefone
- **Servicos:** Modal limpo sem campos desnecessarios
- **Garantias:** Templates pre-salvos + certificados editaveis no padrao do PDF
- **Pipeline:** Chat rapido em cada card
- **Perfil:** Apenas modo escuro (sem toggle)
- **Empresa:** Sem personalizacao de cor
