

# Plano: Corrigir WhatsApp em TODO o sistema — usar wa.me em vez de web.whatsapp.com

## Problema

O WhatsApp nao abre corretamente porque o sistema usa `web.whatsapp.com/send` em varios lugares. Como o amigo explicou no print: o WhatsApp Web interpreta `web.whatsapp.com/send` como tentativa de chatbot/API, e sem cadastro de API, nao funciona. A solucao correta e usar `https://wa.me/NUMERO?text=MENSAGEM` em todos os lugares.

Alem disso, `window.open()` e bloqueado por navegadores em contextos assincronos. O padrao correto e `window.location.href` ou criar um `<a>` temporario.

## Locais que precisam de correcao

Existem **7 arquivos** usando o padrao errado (`web.whatsapp.com` + `window.open`):

| Arquivo | Situacao atual |
|---------|---------------|
| `src/lib/utils.ts` (openWhatsApp) | `web.whatsapp.com` + `window.open` — funcao reutilizada em Clientes |
| `src/pages/Clientes.tsx` | Usa `openWhatsApp` de utils (herdou o bug) |
| `src/pages/Subscription.tsx` | `web.whatsapp.com` + `window.open` local |
| `src/pages/WaitingApproval.tsx` | `web.whatsapp.com` + `window.open` local |
| `src/components/clientes/ClientProfileModal.tsx` | `web.whatsapp.com` + `window.open` local |
| `src/components/vendas/WhatsAppPreviewModal.tsx` | `web.whatsapp.com` + `window.open` |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | `web.whatsapp.com` + `window.open` |

Os 2 arquivos ja corrigidos (`IssueWarrantyModal.tsx` e `Garantias.tsx`) usam `wa.me` + `window.location.href` — estao corretos.

## Correcao

### 1. `src/lib/utils.ts` — funcao central `openWhatsApp`

Trocar de:
```text
web.whatsapp.com/send?phone=X&text=Y  +  window.open
```
Para:
```text
https://wa.me/NUMERO?text=MENSAGEM  +  window.open (nova aba)
```

Nota: `window.open` funciona para `wa.me` quando chamado diretamente de um clique (sincrono). O problema do `window.open` e apenas quando ha `await` antes. Nos casos de Clientes, o clique e direto, entao `window.open` em nova aba e aceitavel. Mas por seguranca, usar a tecnica do `<a>` temporario com `target="_blank"` e `rel="noopener"`.

### 2. Demais 5 arquivos com implementacao local

Todos serao alterados para usar `https://wa.me/` em vez de `web.whatsapp.com/send`. A tecnica de abertura sera padronizada: criar elemento `<a>` temporario, simular clique, e remover. Isso evita bloqueio de popup em qualquer contexto.

## Resumo de alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/utils.ts` | Trocar URL para `wa.me`, usar tecnica `<a>` temporario |
| `src/pages/Subscription.tsx` | Trocar `web.whatsapp.com` por `wa.me` |
| `src/pages/WaitingApproval.tsx` | Trocar `web.whatsapp.com` por `wa.me` |
| `src/components/clientes/ClientProfileModal.tsx` | Trocar `web.whatsapp.com` por `wa.me`, usar `openWhatsApp` de utils |
| `src/components/vendas/WhatsAppPreviewModal.tsx` | Trocar `web.whatsapp.com` por `wa.me` |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | Trocar `web.whatsapp.com` por `wa.me` |

Nenhuma alteracao nos arquivos ja corrigidos (`IssueWarrantyModal.tsx`, `Garantias.tsx`).

## Padrao final em todo o CRM

```text
URL:    https://wa.me/{telefone}?text={encodeURIComponent(mensagem)}
Metodo: elemento <a> temporario com click() simulado
Nunca:  web.whatsapp.com, window.open em contexto async
```
