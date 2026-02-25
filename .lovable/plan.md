

# Adicionar Exportação em Excel (XLS) nos Relatórios

## Situação Atual

Todos os relatórios só exportam em PDF. O tipo `ReportType` define `formats: ('pdf')[]` e o modal só tem um botão "Gerar PDF".

## Solução

Adicionar opção de download em Excel (.xlsx) para todos os relatórios, mantendo o PDF. Como todos os relatórios já geram dados estruturados (`ReportPDFData` com `columns` e `rows`), basta reutilizar esses mesmos dados para gerar o arquivo Excel.

### Abordagem: Gerar Excel sem dependência externa

Em vez de instalar uma biblioteca pesada como SheetJS (~500KB), vou gerar um arquivo `.xls` usando HTML table format — que o Excel, Google Sheets e LibreOffice abrem nativamente. Isso é uma técnica consolidada e não requer nenhuma dependência nova.

### Arquivos a modificar

**1. `src/lib/mockData.ts`**
- Alterar o tipo `formats` para `('pdf' | 'xlsx')[]`
- Adicionar `'xlsx'` ao array de formatos de todos os relatórios

**2. `src/components/relatorios/ReportConfigModal.tsx`**
- Adicionar estado `exportFormat` (`'pdf' | 'xlsx'`)
- Adicionar seletor de formato no modal (dois botões ou radio: PDF / Excel)
- Criar função `generateExcel(data: ReportPDFData)` que:
  - Monta uma tabela HTML com os headers (`columns`) e dados (`rows`)
  - Inclui o `summary` no final
  - Converte para Blob com tipo `application/vnd.ms-excel`
  - Faz download como `.xls`
- Modificar `handleGenerate` para chamar `generateExcel` ou `generateReportPDF` conforme o formato selecionado

**3. `src/lib/pdfGenerator.ts`** (opcional, apenas exportar tipo)
- Garantir que `ReportPDFData` está exportado (já está)

### UI do seletor de formato no modal

Dois botões lado a lado antes do botão de gerar:

```
[📄 PDF]  [📊 Excel]     ← toggle buttons, um ativo por vez
```

O botão principal muda o texto conforme o formato:
- "Gerar PDF" ou "Gerar Excel"

### Função de geração Excel

```typescript
const generateExcel = (data: ReportPDFData) => {
  let html = '<html><head><meta charset="utf-8"></head><body>';
  html += `<h2>${data.title}</h2>`;
  if (data.period) html += `<p>Período: ${format(...)} a ${format(...)}</p>`;
  html += '<table border="1">';
  html += '<tr>' + data.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
  data.rows.forEach(row => {
    html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  if (data.summary) {
    html += '<br/><table border="1">';
    data.summary.forEach(s => {
      html += `<tr><td><b>${s.label}</b></td><td>${s.value}</td></tr>`;
    });
    html += '</table>';
  }
  html += '</body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.title}.xls`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Resultado

- Todos os relatórios terão badges "PDF" e "XLS" na listagem
- O modal permite escolher o formato antes de gerar
- Nenhuma dependência nova é adicionada ao projeto
- Os mesmos dados são reutilizados para ambos os formatos

