

# Corrigir Erro "warranties_status_check" na Emissao de Garantia

## Problema
O banco de dados tem uma constraint CHECK na coluna `status` da tabela `warranties` que so permite dois valores: **'Pendente'** e **'Enviado'**. O codigo esta tentando inserir `'Ativa'`, que nao e permitido.

## Solucao
Alterar o valor de `status` no insert de `'Ativa'` para `'Pendente'` no arquivo `src/components/garantias/IssueWarrantyModal.tsx` (linha 170).

## Detalhe tecnico
- Arquivo: `src/components/garantias/IssueWarrantyModal.tsx`
- Linha 170: trocar `status: 'Ativa'` por `status: 'Pendente'`
- Apos o envio pelo WhatsApp, o status podera ser atualizado para `'Enviado'` futuramente se desejado
