

# Plano: 4 Correcoes

## 1. PDFs nao abrem na aba "PDFs Baixados" (Garantias e Relatorios)

**Causa raiz:** No `IssueWarrantyModal.tsx`, o `handleDownload` (linha 218-224) chama `generateWarrantyPDF()` que internamente ja salva o registro com `dataUrl` (pdfGenerator.ts linha 381-389), e DEPOIS chama `savePDFRecord()` novamente SEM `dataUrl`. Isso cria um registro duplicado - um com dataUrl (funciona) e outro sem (mostra "PDF nao disponivel").

**Correcao:**
- `src/components/garantias/IssueWarrantyModal.tsx` - Remover a chamada duplicada de `savePDFRecord` no `handleDownload` (linhas 219-224), pois `generateWarrantyPDF` ja faz isso internamente com o dataUrl incluso.

## 2. WhatsApp nao envia garantia

**Causa raiz:** O codigo do `handleSend` abre o WhatsApp via `window.open()`. Em muitos navegadores e no PWA, popups sao bloqueados quando nao sao resultado direto de um clique (o `await` da insercao no banco torna o `window.open` assincrono). 

**Correcao:**
- `src/components/garantias/IssueWarrantyModal.tsx` - Trocar `window.open(url, '_blank')` por `window.location.href = url` para evitar bloqueio de popup. Alternativamente, criar um link `<a>` temporario e simular o clique, ou usar a abordagem de abrir a janela antes do await e redirecionar depois.

A abordagem mais confiavel: abrir a janela do WhatsApp ANTES do await (salvar referencia), depois redirecionar. Ou usar `window.location.href` que nao e bloqueado.

## 3. Barra de navegacao desktop em duas linhas

**Causa raiz:** Na ultima edicao, a nav recebeu `sm:flex-wrap sm:overflow-x-visible` (linha 153 do TopNavigation.tsx). O `flex-wrap` faz os itens quebrarem em duas linhas no desktop quando nao cabem.

**Correcao:**
- `src/components/layout/TopNavigation.tsx` - Remover `sm:flex-wrap sm:overflow-x-visible` da nav. Manter `overflow-x-auto` para ambos (mobile e desktop). Adicionar CSS para mostrar uma scrollbar fina e visivel (estilo `scrollbar-thin`) para que o usuario saiba que pode rolar horizontalmente.
- O header pode precisar de altura auto (`min-h-16` em vez de `h-16`) ou manter `h-16` com scroll.

## 4. HelpOverlay - verificacao

O codigo ja foi corrigido anteriormente (linha 50 usa `handleClose` no `onOpenChange`). Se o problema persistir, a causa pode ser que o usuario espera que marcar "nao mostrar novamente" em UMA aba desative TODAS as ajudas. Caso o usuario confirme esse comportamento, a correcao seria usar uma unica chave localStorage (`help-dismissed-all`) em vez de por tabId.

Sem confirmacao adicional do usuario, vou manter o comportamento atual (por tabId) que ja esta funcional.

---

## Resumo tecnico de alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/garantias/IssueWarrantyModal.tsx` | Remover `savePDFRecord` duplicado no handleDownload; corrigir popup bloqueado no WhatsApp |
| `src/components/layout/TopNavigation.tsx` | Remover `sm:flex-wrap sm:overflow-x-visible`, manter `overflow-x-auto` com scrollbar visivel |
| `src/index.css` | Adicionar estilo de scrollbar fina para a nav |

