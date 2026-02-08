
# Plano: Adicionar Desconto em % e Corrigir Erro ao Preencher Vaga

## Problemas Identificados

### Problema 1: Falta opção de Desconto em Porcentagem
Atualmente existe apenas o campo "Desconto (R$)" para valor fixo. O usuário precisa de um card adicional para aplicar desconto em percentual.

### Problema 2: Erro ao Preencher Vaga
O erro ocorre porque o código está enviando `status: 'ocupada'` (linha 275), mas o banco de dados tem um **check constraint** que aceita apenas:
- `'disponivel'`
- `'ocupado'` (sem o "a" no final)

**Mensagem do erro:** `new row for relation "spaces" violates check constraint "spaces_status_check"`

---

## Alterações Necessárias

### Arquivo: `src/components/espaco/FillSlotModal.tsx`

#### Correção 1: Corrigir o Status da Vaga

Alterar o valor de `status` de `'ocupada'` para `'ocupado'`:

```tsx
// ANTES (linha 275):
status: 'ocupada',

// DEPOIS:
status: 'ocupado',
```

#### Correção 2: Adicionar Estado e Lógica para Desconto em %

Adicionar novos estados para controlar o tipo de desconto:

```tsx
// Novos estados (após linha 58):
const [discount, setDiscount] = useState<number>(0);
const [discountPercent, setDiscountPercent] = useState<number>(0);
const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
```

#### Correção 3: Atualizar Cálculo do Total

Modificar a lógica de cálculo para considerar ambos os tipos de desconto:

```tsx
// ANTES (linha 154):
const finalTotal = subtotal - (discount || 0);

// DEPOIS:
const calculatedDiscount = discountType === 'percent' 
  ? (subtotal * (discountPercent / 100)) 
  : (discount || 0);
const finalTotal = subtotal - calculatedDiscount;
```

#### Correção 4: Adicionar UI de Seleção de Tipo de Desconto

Quando o usuário clicar em "Desconto", mostrar duas opções em cards lado a lado:

```tsx
{showDiscount && (
  <div className="space-y-3">
    {/* Seleção do tipo de desconto */}
    <div className="flex gap-2">
      <Card 
        className={cn(
          "flex-1 cursor-pointer transition-all",
          discountType === 'fixed' 
            ? "border-primary bg-primary/10" 
            : "border-border/50 hover:border-muted-foreground"
        )}
        onClick={() => setDiscountType('fixed')}
      >
        <CardContent className="p-3 text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1" />
          <span className="text-sm font-medium">Valor (R$)</span>
        </CardContent>
      </Card>
      
      <Card 
        className={cn(
          "flex-1 cursor-pointer transition-all",
          discountType === 'percent' 
            ? "border-primary bg-primary/10" 
            : "border-border/50 hover:border-muted-foreground"
        )}
        onClick={() => setDiscountType('percent')}
      >
        <CardContent className="p-3 text-center">
          <Percent className="h-5 w-5 mx-auto mb-1" />
          <span className="text-sm font-medium">Percentual (%)</span>
        </CardContent>
      </Card>
    </div>
    
    {/* Input baseado no tipo selecionado */}
    {discountType === 'fixed' ? (
      <div className="space-y-2">
        <Label>Desconto (R$)</Label>
        <Input 
          type="number" 
          value={discount || ""} 
          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
      </div>
    ) : (
      <div className="space-y-2">
        <Label>Desconto (%)</Label>
        <Input 
          type="number" 
          value={discountPercent || ""} 
          onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
          placeholder="0"
          max={100}
        />
        {discountPercent > 0 && subtotal > 0 && (
          <p className="text-xs text-muted-foreground">
            = R$ {(subtotal * (discountPercent / 100)).toFixed(2)} de desconto
          </p>
        )}
      </div>
    )}
  </div>
)}
```

#### Correção 5: Adicionar Import do Ícone Percent

```tsx
// Adicionar na linha 14:
import { ..., Percent, ... } from "lucide-react";
```

#### Correção 6: Atualizar o Reset do Modal

Incluir os novos estados no reset:

```tsx
// Na função useEffect de reset (linhas 158-175):
setDiscount(0);
setDiscountPercent(0);
setDiscountType('fixed');
```

#### Correção 7: Atualizar o Resumo da Vaga

Mostrar o desconto aplicado de forma clara:

```tsx
{calculatedDiscount > 0 && (
  <p className="flex items-center gap-2">
    <Tag className="h-4 w-4 text-muted-foreground" />
    <span>
      Desconto: R$ {calculatedDiscount.toFixed(2)}
      {discountType === 'percent' && ` (${discountPercent}%)`}
    </span>
  </p>
)}
```

#### Correção 8: Atualizar o Insert para Usar o Desconto Correto

```tsx
// Na mutation (linha 272):
discount: calculatedDiscount || null,
```

---

## Resumo das Mudanças

| Problema | Causa | Solução |
|----------|-------|---------|
| Erro ao preencher vaga | `status: 'ocupada'` inválido | Alterar para `'ocupado'` |
| Falta desconto em % | Campo não existe | Adicionar cards de seleção e lógica de cálculo |

---

## Resultado Visual Esperado

```text
Campos opcionais
[$ Desconto]  [📝 Observações]  [🏷 Tag]

↓ Ao clicar em "Desconto":

┌─────────────────┐  ┌─────────────────┐
│       $         │  │       %         │
│   Valor (R$)    │  │  Percentual (%)  │
└─────────────────┘  └─────────────────┘
       ▲ selecionado

Desconto (R$)
[  50.00  ]

---

Ou se selecionar Percentual:

┌─────────────────┐  ┌─────────────────┐
│       $         │  │       %         │
│   Valor (R$)    │  │  Percentual (%)  │
└─────────────────┘  └─────────────────┘
                           ▲ selecionado

Desconto (%)
[  10  ]
= R$ 90.00 de desconto
```

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/espaco/FillSlotModal.tsx` | Corrigir status `'ocupado'`, adicionar lógica de desconto em % |
