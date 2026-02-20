
# Correção: Janela de Ajuda + Atualização Automática do PWA

---

## Problema 1 — Janela de ajuda continua aparecendo após "Não mostrar novamente"

### Diagnóstico

O código atual tem uma lógica frágil: ele só salva no localStorage **se** o checkbox estiver marcado no momento do fechamento. Existem dois caminhos para fechar o modal:

1. Botão "Entendi" → chama `handleClose()` diretamente
2. Clicar fora do modal ou no X → o Radix Dialog chama `onOpenChange(false)` → que também chama `handleClose()`

O bug é que o **estado do checkbox (`dontShowAgain`) é resgatado via React state**, que pode ser `false` em algumas situações de remontagem de componente (ex: atualização do PWA faz reload → React remonta tudo → o checkbox volta para `false`). Se o usuário marcou o checkbox mas o componente foi remontado antes de confirmar, o estado é perdido.

Além disso, a **experiência atual não é intuitiva**: o usuário deve lembrar de marcar um checkbox antes de clicar no botão. Na prática, muitos clicam direto em "Entendi" sem marcar.

### Solução

Mudança de comportamento: **clicar em "Entendi" SEMPRE salva no localStorage**, eliminando o checkbox completamente. A janela de ajuda só reaparece se o usuário nunca interagiu com ela.

Para páginas que o usuário **quer ver novamente**, ele pode clicar no ícone de ajuda (?) na interface.

Isso elimina o bug e simplifica a UX.

**Arquivo: `src/components/help/HelpOverlay.tsx`**
- Remover o estado `dontShowAgain` e o `Checkbox`
- Modificar `handleClose()` para **sempre** salvar `help-dismissed-${tabId}` no localStorage
- Renomear o botão de "Entendi" para deixar claro que é permanente
- O `onOpenChange` (fechar pelo X ou clicar fora) também salva permanentemente

---

## Problema 2 — PWA não atualiza automaticamente

### Diagnóstico

O `vite.config.ts` tem `skipWaiting: true` e `clientsClaim: true` configurados corretamente. O hook `usePWAUpdate` escuta o evento `controllerchange`. 

**O problema:** O `controllerchange` só dispara quando o Service Worker **muda de controller** — o que só ocorre quando um novo SW é instalado E ativado. Com `skipWaiting`, isso acontece imediatamente. Porém há um gap:

- Se o app já estiver aberto no celular (em background), o SW novo instala em background
- O evento `controllerchange` dispara
- O hook faz reload ✅

**Mas o que falha:** Se o app não estava aberto quando a atualização foi publicada, ao abrir o app o novo SW já está ativo (sem `controllerchange` disparar), mas o cache ainda serve arquivos antigos porque o Workbox faz cache de todos os arquivos estáticos com hash. Quando o hash muda, o Workbox deveria buscar os novos arquivos — mas se o cache anterior ainda está válido para as URLs antigas, o app carrega versão antiga.

A solução correta é usar o **`useRegisterSW`** do `vite-plugin-pwa/react`, que é a API oficial do plugin. Ela fornece:
- `needRefresh`: indica que há update disponível
- `updateServiceWorker()`: força a atualização e reload

### Solução

**Arquivo: `src/hooks/use-pwa-update.ts`**

Reescrever o hook usando `useRegisterSW` do `virtual:pwa-register/react`, que é a forma correta e suportada pelo `vite-plugin-pwa`. Quando `needRefresh` for `true`, chamar `updateServiceWorker(true)` imediatamente para forçar o reload com a nova versão.

```
1. useRegisterSW detecta novo SW disponível → needRefresh = true
2. Hook chama updateServiceWorker(true) automaticamente
3. O novo SW ativa (skipWaiting já configurado)
4. Página recarrega com nova versão
```

**Arquivo: `vite.config.ts`**

Adicionar `devOptions` para testar PWA em desenvolvimento, e garantir que o `registerType` está como `"autoUpdate"` (já está).

---

## Arquivos a modificar

1. `src/components/help/HelpOverlay.tsx` — sempre salvar ao fechar, remover checkbox
2. `src/hooks/use-pwa-update.ts` — usar `useRegisterSW` do vite-plugin-pwa

---

## Resultado Final

- **Janela de ajuda:** Após clicar "Entendi" uma vez, nunca mais reaparece — independente de reload, atualização do PWA ou fechar/abrir o app
- **Atualização automática:** Quando uma nova versão for publicada, o app detecta e recarrega automaticamente em até 60 segundos (tempo do check padrão do SW), sem precisar desinstalar
