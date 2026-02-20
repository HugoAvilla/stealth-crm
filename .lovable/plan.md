
# Correção: Ajuda Individual por Página + Botão "?" para Reabrir

## Diagnóstico do Bug de Persistência

O `HelpOverlay` usa `help-dismissed-${tabId}` como chave no localStorage — o que é correto e individual por página. Porém o componente atual tem um fluxo com falha:

```
useEffect roda → lê localStorage → SE não dispensado → abre modal
```

O problema é que o componente renderiza `null` quando `show = false` e só muda para `true` no `useEffect`. Se a página é aberta pela primeira vez, o modal aparece. Mas ao navegar entre abas e voltar, o React pode **não remontar** o componente (mantém em memória), então o `useEffect` não roda novamente e o modal nunca mais aparece — mesmo que o usuário **não tenha dispensado aquela página**.

Além disso, o usuário relatou que ao dispensar em uma página a outra não apareceu. Isso pode ocorrer se o componente foi montado antes da navegação completar, ou se o React reutilizou a mesma instância do componente com `tabId` diferente mas o `useEffect` não re-executou corretamente com a lógica atual.

## Solução

### Refatorar `HelpOverlay` para separar em 2 responsabilidades:

1. **Modal de ajuda** — o conteúdo exibido (sempre igual)
2. **Botão flutuante "?"** — visível o tempo todo no canto superior direito da página

O componente `HelpOverlay` passará a:
- Ao montar, verificar o localStorage com a chave `help-dismissed-${tabId}`
- Se não dispensado ainda → abrir o modal automaticamente (comportamento atual)
- Se já dispensado → NÃO abrir automaticamente, mas mostrar o botão `?`
- **Sempre** mostrar o botão `?` no canto superior direito da área de conteúdo
- O botão `?` permite reabrir o modal a qualquer momento

### Layout do Botão `?`

O botão será `fixed` posicionado no canto superior direito, abaixo da `TopNavigation` (que ocupa `h-16`):

```
position: fixed
top: 72px (abaixo do header de 64px)
right: 16px
z-index: 40 (abaixo do header z-50)
```

Será um botão circular pequeno e discreto (32x32px), com ícone `HelpCircle`, usando `variant="outline"` com fundo semi-transparente para não obstruir o conteúdo.

### Correção do `useEffect` para garantir individualidade

O `useEffect` será corrigido para ter dependência no `tabId` e sempre re-checar o localStorage quando o `tabId` mudar — garantindo que cada página seja avaliada de forma independente:

```typescript
const [show, setShow] = useState(false);
const [dismissed, setDismissed] = useState(false);

useEffect(() => {
  // Reseta estado ao trocar de página
  const isDismissed = !!localStorage.getItem(`help-dismissed-${tabId}`);
  setDismissed(isDismissed);
  if (!isDismissed) {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }
}, [tabId]); // re-executa quando tabId muda
```

### Comportamento Final

| Situação | Comportamento |
|---|---|
| Primeira visita na página | Modal abre automaticamente |
| Clicou "Entendi" nessa página | Modal não abre mais nessa página |
| Outra página não dispensada | Modal abre normalmente nessa página |
| Qualquer página | Botão `?` visível para reabrir |
| Clica no `?` | Modal abre (mesmo que já dispensado) |
| Fecha pelo `?` | Salva no localStorage (não abre mais automaticamente) |

## Arquivo a Modificar

**`src/components/help/HelpOverlay.tsx`** — único arquivo a alterar:

- Adicionar estado `dismissed` separado de `show`
- Corrigir o `useEffect` para resetar estado ao trocar de `tabId`
- Adicionar botão fixo `?` no canto superior direito (sempre visível)
- O botão `?` ao ser clicado define `setShow(true)` para reabrir o modal
- Ao fechar o modal (por qualquer meio): salva no localStorage + atualiza `dismissed`

Nenhuma das páginas (`Vendas.tsx`, `Clientes.tsx`, etc.) precisa ser alterada — o botão `?` será renderizado automaticamente dentro do `HelpOverlay` que já está em cada página.

## Código da Solução

```typescript
export function HelpOverlay({ tabId, title, description, imageUrl, steps }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Re-executa toda vez que a página muda (tabId diferente)
    const isDismissed = !!localStorage.getItem(`help-dismissed-${tabId}`);
    setDismissed(isDismissed);
    setShow(false); // reseta antes de checar
    if (!isDismissed) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [tabId]);

  const handleClose = () => {
    localStorage.setItem(`help-dismissed-${tabId}`, 'true');
    setDismissed(true);
    setShow(false);
  };

  return (
    <>
      {/* Botão fixo ? sempre visível */}
      <button
        onClick={() => setShow(true)}
        className="fixed top-[72px] right-4 z-40 w-8 h-8 rounded-full ..."
      >
        ?
      </button>

      {/* Modal de ajuda */}
      <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
        ...
      </Dialog>
    </>
  );
}
```
