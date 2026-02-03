
# Plano: Adicionar Sub-aba de Veiculos Nao Pagos e Alerta de Liberacao

## Resumo

Adicionar uma nova sub-aba "Veiculos Nao Pagos (Saida)" ao lado de "Veiculos Pagos (Saida)" na aba Espaco, criando um alerta quando um veiculo for liberado da vaga sem pagamento, e integrando com o modulo de vendas marcando a venda como nao paga.

---

## Componentes a Criar

### 1. UnpaidExitedVehicles.tsx

Novo componente similar ao `PaidExitedVehicles.tsx`, mas filtrando por veiculos que sairam SEM pagamento.

**Estrutura:**
```text
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ Veiculos Nao Pagos (Saida)                                   │
│  {count} registro(s)                    [🔍 Buscar...]           │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 👤 Nome do Cliente                                        │  │
│  │ 🚗 Marca Modelo - Placa                                   │  │
│  │ 📅 Entrada: dd/mm/yyyy  🕐 Saida: dd/mm/yyyy              │  │
│  │                                                            │  │
│  │                              [⚠️ Nao Pago]  R$ XXX,XX     │  │
│  │                              [Marcar como Pago]            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Diferencas do PaidExitedVehicles:**
- Query: `has_exited = true` E (`payment_status != 'paid'` OU `payment_status IS NULL`)
- Badge: Vermelho/Amarelo com icone de alerta
- Botao "Marcar como Pago" em cada card para permitir pagamento posterior

**Query Supabase:**
```typescript
const { data } = await supabase
  .from('spaces')
  .select(`
    *,
    client:clients(*),
    vehicle:vehicles(*),
    sale:sales(id, total, is_open)
  `)
  .eq('company_id', companyId)
  .eq('has_exited', true)
  .or('payment_status.neq.paid,payment_status.is.null')
  .order('exit_date', { ascending: false });
```

---

### 2. UnpaidExitAlertDialog.tsx

Dialog de alerta que aparece quando o usuario tenta liberar uma vaga SEM ter confirmado o pagamento.

**Layout do Alert:**
```text
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ Atencao: Veiculo Nao Pago!                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  O veiculo de [Nome do Cliente] sera liberado sem pagamento.     │
│                                                                  │
│  Valor pendente: R$ XXX,XX                                       │
│                                                                  │
│  O que deseja fazer?                                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [Confirmar Pagamento e Liberar]   ← verde                │  │
│  │  [Liberar Sem Pagamento]           ← amarelo/warning      │  │
│  │  [Cancelar]                        ← outline              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Disparado quando `completeMutation` e chamado com `has_exited = true` e `payment_status != 'paid'`
- Opcao 1: Confirma pagamento E libera vaga (atualiza `payment_status = 'paid'` junto)
- Opcao 2: Libera vaga SEM pagamento (mantem `payment_status` como pendente)
- Opcao 3: Cancela a operacao

---

## Alteracoes em Arquivos Existentes

### 1. Espaco.tsx

**Adicionar nova tab "nao-pagos-saida":**

```tsx
<TabsList>
  <TabsTrigger value="vagas" className="gap-2">
    <Car className="h-4 w-4" />
    Vagas Ativas
  </TabsTrigger>
  <TabsTrigger value="pagos-saida" className="gap-2">
    <CheckCircle className="h-4 w-4" />
    Veiculos Pagos (Saida)
  </TabsTrigger>
  {/* NOVA TAB */}
  <TabsTrigger value="nao-pagos-saida" className="gap-2">
    <AlertCircle className="h-4 w-4" />
    Nao Pagos (Saida)
  </TabsTrigger>
</TabsList>

{/* NOVO TABCONTENT */}
<TabsContent value="nao-pagos-saida" className="mt-6">
  <UnpaidExitedVehicles refreshTrigger={refreshTrigger} />
</TabsContent>
```

---

### 2. SlotDetailsDrawer.tsx

**Adicionar logica de alerta antes de liberar vaga nao paga:**

1. Criar estado para controlar o dialog de alerta
2. Modificar `handleCompleteToggle` para verificar status do pagamento
3. Se nao pago, abrir alert dialog em vez de completar direto
4. Integrar com vendas atualizando `is_open` da venda vinculada

**Novo fluxo de liberacao:**
```typescript
const handleCompleteToggle = (checked: boolean) => {
  if (checked && space.payment_status !== 'paid') {
    // Mostrar alerta de veiculo nao pago
    setShowUnpaidAlert(true);
  } else {
    // Liberar normalmente
    setIsCompleting(checked);
    completeMutation.mutate(checked);
  }
};

// Funcao para liberar com pagamento
const handleReleaseWithPayment = async () => {
  await supabase
    .from('spaces')
    .update({ 
      has_exited: true,
      payment_status: 'paid',
      exit_date: format(new Date(), 'yyyy-MM-dd'),
      exit_time: format(new Date(), 'HH:mm'),
    })
    .eq('id', space.id);
  
  // Fechar a venda vinculada
  if (space.sale_id) {
    await supabase
      .from('sales')
      .update({ is_open: false, status: 'Fechada' })
      .eq('id', space.sale_id);
  }
};

// Funcao para liberar SEM pagamento
const handleReleaseWithoutPayment = async () => {
  await supabase
    .from('spaces')
    .update({ 
      has_exited: true,
      payment_status: 'pending', // ou 'unpaid'
      exit_date: format(new Date(), 'yyyy-MM-dd'),
      exit_time: format(new Date(), 'HH:mm'),
    })
    .eq('id', space.id);
  
  // Manter a venda como aberta (is_open = true)
  // Nao atualiza a venda
};
```

---

## Integracao com Vendas

**Quando veiculo SAI PAGO:**
1. `spaces.has_exited = true`
2. `spaces.payment_status = 'paid'`
3. `sales.is_open = false` (venda fechada)
4. `sales.status = 'Fechada'`
5. Veiculo aparece em "Veiculos Pagos (Saida)"

**Quando veiculo SAI NAO PAGO:**
1. `spaces.has_exited = true`
2. `spaces.payment_status = 'pending'`
3. `sales.is_open = true` (venda permanece aberta)
4. `sales.status = 'Aberta'`
5. Veiculo aparece em "Nao Pagos (Saida)"

**Quando pagamento e confirmado depois (na aba Nao Pagos):**
1. `spaces.payment_status = 'paid'`
2. `sales.is_open = false` (fecha a venda)
3. `sales.status = 'Fechada'`
4. Veiculo move de "Nao Pagos" para "Pagos"

---

## Estrutura de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/espaco/UnpaidExitedVehicles.tsx` | Criar |
| `src/components/espaco/UnpaidExitAlertDialog.tsx` | Criar |
| `src/pages/Espaco.tsx` | Adicionar nova tab |
| `src/components/espaco/SlotDetailsDrawer.tsx` | Adicionar logica de alerta e integracao vendas |

---

## Fluxo Visual

```text
Usuario clica em "Concluir vaga"
         │
         ▼
    Veiculo esta pago?
         │
    ┌────┴────┐
    ▼         ▼
   SIM       NAO
    │         │
    ▼         ▼
 Libera    Abre Alert Dialog
 direto    ┌──────────────────┐
           │ ⚠️ Veiculo Nao  │
           │    Pago!        │
           │                 │
           │ [Pagar+Liberar] │
           │ [Liberar s/pag] │
           │ [Cancelar]      │
           └────────┬────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  Paga+Libera   Libera s/pag   Cancela
      │             │             │
      ▼             ▼             ▼
  Tab: Pagos    Tab: Nao      Fica na
  (venda        Pagos         vaga ativa
   fechada)     (venda aberta)
```

---

## Detalhes Tecnicos

### Estados no SlotDetailsDrawer:
```typescript
const [showUnpaidAlert, setShowUnpaidAlert] = useState(false);
```

### Props do UnpaidExitAlertDialog:
```typescript
interface UnpaidExitAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceDetails;
  onReleaseWithPayment: () => void;
  onReleaseWithoutPayment: () => void;
}
```

### Funcionalidade "Marcar como Pago" no UnpaidExitedVehicles:
```typescript
const handleMarkAsPaid = async (spaceId: number, saleId: number | null) => {
  // Atualiza o space
  await supabase
    .from('spaces')
    .update({ payment_status: 'paid' })
    .eq('id', spaceId);
  
  // Fecha a venda vinculada
  if (saleId) {
    await supabase
      .from('sales')
      .update({ is_open: false, status: 'Fechada' })
      .eq('id', saleId);
  }
  
  // Atualiza a lista
  refetch();
};
```

---

## Ordem de Implementacao

1. Criar `UnpaidExitedVehicles.tsx` (similar ao PaidExitedVehicles)
2. Criar `UnpaidExitAlertDialog.tsx` (dialog de confirmacao)
3. Atualizar `SlotDetailsDrawer.tsx` (adicionar logica de alerta e integracao vendas)
4. Atualizar `Espaco.tsx` (adicionar nova tab)
5. Testar fluxo completo de saida paga/nao paga
