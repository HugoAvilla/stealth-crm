

# Diagnosticar e Corrigir Erro no Botao "Emitir Garantia"

## Problema Identificado

Apos analise detalhada do codigo, identifiquei os seguintes problemas potenciais no `IssueWarrantyModal.tsx`:

1. **`generateWarrantyPDF` e sincrona mas chama `saveAndUploadPDF` que e async**: Qualquer erro no upload do PDF e silenciosamente ignorado (a funcao nao retorna Promise). Pior: se `saveAndUploadPDF` lanca erro internamente, ele nao e capturado pelo `try/catch` do `handleIssue`.

2. **Falta de logs detalhados**: O `catch` apenas faz `console.error('Error issuing warranty:', error)` sem mostrar a mensagem especifica do erro ao usuario.

3. **O `storagePath` e calculado APOS o `generateWarrantyPDF`**: Mas o PDF ja foi gerado e salvo localmente dentro da funcao - o `storagePath` que aparece no `issuedData.pdfLink` pode nao corresponder ao arquivo realmente uploadado.

## Solucao

### Arquivo: `src/components/garantias/IssueWarrantyModal.tsx`

Mudancas na funcao `handleIssue`:

1. **Melhorar tratamento de erros**: Mostrar a mensagem de erro especifica no toast para facilitar debug
2. **Adicionar console.log detalhados**: Em cada etapa (antes do insert, apos insert, antes do PDF) para rastrear onde o erro ocorre
3. **Tratar caso de `companyId` nulo**: Verificar se `companyId` esta definido antes de tentar o insert
4. **Tratar caso de template/client/vehicle undefined**: Adicionar guards explicitos
5. **Separar a geracao do PDF do insert**: Garantir que o insert no banco e bem-sucedido antes de tentar gerar o PDF

### Detalhes Tecnicos

```
handleIssue:
  1. Verificar companyId != null (guard)
  2. Verificar selectedTemplate, selectedClient, selectedVehicle (guards)
  3. Insert no Supabase com try/catch especifico
  4. Se insert OK -> gerar PDF com try/catch separado
  5. Se PDF falhar -> ainda mostrar sucesso do insert (garantia foi salva)
  6. Montar issuedData com dados corretos
  7. Toast de sucesso com detalhes
```

No `catch`, mostrar o erro real: `toast.error("Erro: " + (error as any)?.message || "Erro desconhecido")`.

Tambem adicionar `console.log` estrategicos para capturar o erro exato na proxima tentativa do usuario, caso o problema persista.

