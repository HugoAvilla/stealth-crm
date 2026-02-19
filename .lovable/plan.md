
# Corrigir Atualizacao Automatica do PWA

## Problema
Ao publicar uma nova versao, o Service Worker antigo continua servindo arquivos em cache. O usuario precisa remover o app da tela inicial e reinstalar para ver as mudancas.

## Solucao
Forcar o novo Service Worker a assumir imediatamente (`skipWaiting`) e recarregar a pagina automaticamente quando uma atualizacao for detectada. O usuario vera as novidades sem precisar desinstalar/reinstalar o app.

## Alteracoes

### 1. Adicionar `skipWaiting` no Workbox (`vite.config.ts`)

Adicionar `skipWaiting: true` e `clientsClaim: true` na configuracao do workbox. Isso faz com que o novo Service Worker assuma imediatamente sem esperar o usuario fechar todas as abas.

```typescript
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  navigateFallbackDenylist: [/^\/~oauth/],
  // ... resto da config existente
}
```

### 2. Criar hook de deteccao de atualizacao (`src/hooks/use-pwa-update.ts`)

Um hook que escuta o evento `controllerchange` do Service Worker. Quando o novo SW assumir, recarrega a pagina **uma unica vez** (usando flag `sessionStorage` para nao ficar em loop).

```
- Escuta navigator.serviceWorker.controllerchange
- Ao detectar mudanca, seta flag "pwa-reloading" no sessionStorage
- Recarrega a pagina com window.location.reload()
- Na proxima carga, limpa o flag
```

### 3. Usar o hook no App (`src/App.tsx`)

Chamar o `usePWAUpdate()` no componente App para que a deteccao funcione globalmente.

## Resultado Final
- Quando voce publicar uma atualizacao, o usuario ao abrir o app vera um reload rapido automatico
- Nao precisa mais desinstalar e reinstalar
- Funciona tanto no celular quanto no computador
- Transparente para o usuario (acontece em menos de 1 segundo)

## Detalhes Tecnicos

### Arquivos a modificar:
1. `vite.config.ts` - adicionar `skipWaiting` e `clientsClaim`
2. `src/hooks/use-pwa-update.ts` - novo hook de deteccao
3. `src/App.tsx` - integrar o hook

### Como funciona tecnicamente:
1. Ao publicar, um novo Service Worker e gerado com hash diferente
2. O navegador detecta o novo SW e o instala em background
3. `skipWaiting: true` faz o novo SW ativar imediatamente (sem esperar fechar abas)
4. `clientsClaim: true` faz o novo SW assumir o controle da pagina atual
5. O hook detecta a troca de controller e faz reload uma unica vez
6. A pagina recarrega com os novos arquivos ja servidos pelo novo SW
