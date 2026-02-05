

# Plano: Adicionar Contagem e Alerta na Aba "Não Pagos (Saída)"

## Objetivo

Adicionar um indicador visual na aba "Não Pagos (Saída)" que mostra:
- A quantidade de veículos com saída não paga
- Um ícone de alerta quando houver pendências

## Exemplo Visual

```text
ANTES:
┌─────────────────────────────────────────────────────┐
│ ⚠️ Não Pagos (Saída)                                │
└─────────────────────────────────────────────────────┘

DEPOIS (com 2 carros não pagos):
┌─────────────────────────────────────────────────────┐
│ ⚠️ Não Pagos (Saída)  ⚠️ 2                          │
└─────────────────────────────────────────────────────┘
```

## Implementação

### Arquivo a Modificar
- `src/pages/Espaco.tsx`

### Alterações

1. **Adicionar nova query para contagem de não pagos**

Criar uma query usando `useQuery` que busca a contagem de veículos com `has_exited = true` e `payment_status != 'paid'`:

```tsx
const { data: unpaidCount } = useQuery({
  queryKey: ['unpaid-exited-count', companyId],
  queryFn: async () => {
    const { count, error } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('has_exited', true)
      .or('payment_status.neq.paid,payment_status.is.null');

    if (error) throw error;
    return count || 0;
  },
  enabled: !!companyId,
});
```

2. **Modificar o TabsTrigger da aba "Não Pagos (Saída)"**

Adicionar um badge condicional com a contagem e estilização de alerta:

```tsx
<TabsTrigger value="nao-pagos-saida" className="gap-2">
  <AlertTriangle className="h-4 w-4" />
  Não Pagos (Saída)
  {unpaidCount !== undefined && unpaidCount > 0 && (
    <Badge 
      variant="destructive" 
      className="ml-1 px-1.5 py-0.5 text-xs bg-warning text-warning-foreground animate-pulse"
    >
      <AlertTriangle className="h-3 w-3 mr-0.5" />
      {unpaidCount}
    </Badge>
  )}
</TabsTrigger>
```

### Detalhes Técnicos

- A query usa `{ count: 'exact', head: true }` para obter apenas a contagem sem baixar todos os dados
- O badge só aparece quando `unpaidCount > 0`
- Estilização usa cores de warning (amarelo/laranja) para chamar atenção
- Animação `animate-pulse` sutil para destacar pendências
- A contagem é invalidada automaticamente quando `handleSlotFilled` é chamado

### Resultado Esperado

| Cenário | Exibição |
|---------|----------|
| 0 carros não pagos | `⚠️ Não Pagos (Saída)` (sem badge) |
| 2 carros não pagos | `⚠️ Não Pagos (Saída) ⚠️ 2` (com badge pulsante) |
| 5 carros não pagos | `⚠️ Não Pagos (Saída) ⚠️ 5` (com badge pulsante) |

