

# Plano: Redirecionamento Direto para WhatsApp Web

## Resumo da Mudança

Substituir o modal de chat interno por redirecionamento direto ao WhatsApp Web, tanto no Pipeline quanto na aba Clientes.

---

## Alterações Necessárias

### 1. Página Pipeline (`src/pages/Pipeline.tsx`)

**Antes:**
- Botão de chat (MessageCircle) abre `ClientChatModal`

**Depois:**
- Ao clicar no card do cliente → abre `https://wa.me/{telefone}` em nova aba
- Remover import e uso do `ClientChatModal`
- Remover estados `showChatModal` e `chatClient`
- Manter informações no card: nome, telefone, veículo

**Mudanças específicas:**
```tsx
// Remover:
- import { ClientChatModal }
- const [showChatModal, setShowChatModal] = useState(false)
- const [chatClient, setChatClient] = useState<Client | null>(null)
- função openChat()
- componente <ClientChatModal />

// Adicionar função helper:
const openWhatsApp = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Adiciona código do Brasil se não tiver
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  window.open(`https://wa.me/${formattedPhone}`, '_blank');
};

// No card, ao clicar no botão de chat:
onClick={() => client && openWhatsApp(client.phone)}
```

---

### 2. Página Clientes (`src/pages/Clientes.tsx`)

**Antes:**
- Clicar no telefone abre `ClientChatModal`

**Depois:**
- Clicar no telefone → abre `https://wa.me/{telefone}` em nova aba
- Remover import e uso do `ClientChatModal`
- Remover estados `showChatModal` e `chatClient`

**Mudanças específicas:**
```tsx
// Remover:
- import { ClientChatModal }
- const [showChatModal, setShowChatModal] = useState(false)
- const [chatClient, setChatClient] = useState<Client | null>(null)
- função openChat()
- componente <ClientChatModal />

// Na coluna Contato da tabela:
<button
  onClick={() => openWhatsApp(client.phone)}
  className="text-primary hover:underline flex items-center gap-1"
>
  <MessageCircle className="h-3 w-3" />
  {client.phone}
</button>
```

---

### 3. Função Helper Reutilizável (Opcional)

Criar em `src/lib/utils.ts`:

```tsx
export const openWhatsApp = (phone: string, message?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const url = message 
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${formattedPhone}`;
  window.open(url, '_blank');
};
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/Pipeline.tsx` | Modificar: remover modal, adicionar openWhatsApp |
| `src/pages/Clientes.tsx` | Modificar: remover modal, adicionar openWhatsApp |
| `src/lib/utils.ts` | Modificar: adicionar função openWhatsApp |
| `src/components/clientes/ClientChatModal.tsx` | Pode ser removido (não será mais usado) |

---

## Resultado Esperado

### Pipeline:
- Card mostra: veículo, placa, nome do cliente
- Ao clicar no ícone de chat → abre WhatsApp Web direto na conversa

### Clientes:
- Tabela mostra telefone com ícone de WhatsApp
- Ao clicar no telefone → abre WhatsApp Web direto na conversa

---

## Vantagens

1. **Simplicidade** - Sem chat interno para manter
2. **WhatsApp real** - Conversa acontece no app oficial
3. **Histórico preservado** - Mensagens ficam no WhatsApp do usuário
4. **Sem dependência de API** - Funciona imediatamente

