
# Plano: Corrigir Erro de Consumo Automatico de Estoque

## Problema Identificado

Ao registrar uma venda, o sistema tenta dar baixa automatica no estoque, mas o registro falha com o erro:

```
"Erro ao registrar consumo de Oringe Ultra BLACK"
```

### Causa Raiz

O arquivo `src/lib/stockConsumption.ts` envia o valor `movement_type: "saida"` (minusculo), mas o banco de dados possui um **CHECK constraint** que aceita apenas:
- `'Entrada'` (com E maiusculo)
- `'Saida'` (com S maiusculo)

Este e o mesmo problema que foi corrigido nos modais `StockEntryModal` e `StockExitModal`, mas as funcoes de consumo automatico nao foram atualizadas.

---

## Locais do Erro

| Arquivo | Linha | Valor Atual | Valor Correto |
|---------|-------|-------------|---------------|
| `src/lib/stockConsumption.ts` | 129 | `"saida"` | `"Saida"` |
| `src/lib/stockConsumption.ts` | 263 | `"saida"` | `"Saida"` |

---

## Funcoes Afetadas

1. **consumeStockForSale** (linha 129)
   - Usada pelo sistema legado de consumo por regras de tamanho de veiculo

2. **consumeStockForDetailedSale** (linha 263)
   - Usada pelo novo sistema de servicos detalhados (INSULFILM/PPF)
   - **Esta e a funcao chamada quando voce registra uma venda com produtos**

---

## Correcao Necessaria

### Antes (linhas 129 e 263):
```typescript
movement_type: "saida",
```

### Depois:
```typescript
movement_type: "Saida",
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/stockConsumption.ts` | Corrigir `movement_type` em 2 locais |

---

## Resultado Esperado

Apos a correcao:
1. A venda sera registrada com sucesso
2. O estoque sera automaticamente atualizado (baixa em metros)
3. O toast de sucesso mostrara: "Estoque atualizado: X metros de Material Y"
4. Nenhum erro de consumo sera exibido
