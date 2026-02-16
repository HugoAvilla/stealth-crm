
# Plano: Trocar `<a target="_blank">` por `window.location.href` em todos os WhatsApp

## Problema

O `wa.me` redireciona para `api.whatsapp.com`, que bloqueia aberturas em nova aba (`target="_blank"`) com `ERR_BLOCKED_BY_RESPONSE` devido a headers Cross-Origin-Opener-Policy. O print confirma: `api.whatsapp.com esta bloqueado`.

## Solucao

Trocar todos os lugares que usam a tecnica `document.createElement('a')` com `target="_blank"` por `window.location.href = url`. Isso navega na mesma aba, evitando o bloqueio COOP. Os arquivos `Garantias.tsx` e `IssueWarrantyModal.tsx` ja usam `window.location.href` e funcionam corretamente.

## Arquivos a alterar

| Arquivo | De | Para |
|---------|-----|------|
| `src/lib/utils.ts` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |
| `src/pages/Subscription.tsx` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |
| `src/pages/WaitingApproval.tsx` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |
| `src/components/clientes/ClientProfileModal.tsx` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |
| `src/components/vendas/WhatsAppPreviewModal.tsx` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |
| `src/components/espaco/SpaceWhatsAppModal.tsx` | `createElement('a')` + `target="_blank"` + `click()` | `window.location.href = url` |

## Alteracao padrao

Antes (6 linhas):
```text
const link = document.createElement('a');
link.href = url;
link.target = '_blank';
link.rel = 'noopener noreferrer';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

Depois (1 linha):
```text
window.location.href = url;
```

## Nota

Usar `window.location.href` navega a aba atual para o WhatsApp. O usuario pode voltar ao CRM com o botao "Voltar" do navegador. Este e o padrao que ja funciona em `Garantias.tsx` e `IssueWarrantyModal.tsx`.
