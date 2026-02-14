
# Plano: PDFs no Supabase Storage + WhatsApp via wa.me + Barra de Navegacao

## Visao Geral

Migrar toda a arquitetura de PDFs de localStorage (base64) para Supabase Storage com signed URLs, corrigir o WhatsApp para usar `wa.me`, e ajustar a barra de navegacao desktop.

---

## 1. Criar bucket privado no Supabase Storage

Criar um bucket `pdfs` privado com politicas RLS para:
- Upload: usuarios autenticados podem fazer upload no caminho do seu company_id
- Download: usuarios autenticados podem ler arquivos do seu company_id

**Migracao SQL:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

CREATE POLICY "Users can upload PDFs to their company folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Users can read PDFs from their company folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs');
```

---

## 2. Refatorar pdfStorage.ts

Remover o campo `dataUrl` (base64) do localStorage. Passar a armazenar apenas metadados + `storagePath` (caminho no Supabase Storage).

**Novo fluxo de savePDFRecord:**
- Recebe o `Blob` do PDF (via `doc.output('blob')`)
- Faz upload para Supabase Storage no caminho `{companyId}/{module}/{filename}`
- Salva metadados no localStorage com `storagePath` em vez de `dataUrl`

**Arquivo:** `src/lib/pdfStorage.ts`
- Remover campo `dataUrl`
- Adicionar campo `storagePath`
- Criar funcao `uploadPDFToStorage(blob, path)` que faz o upload
- Criar funcao `getPDFSignedUrl(storagePath)` que gera signed URL (10 min)

---

## 3. Refatorar pdfGenerator.ts

Todas as funcoes de geracao (`generateSalePDFA4`, `generateSalePDFReceipt`, `generateWarrantyPDF`, `generateReportPDF`, `generateSpacePDF*`) serao alteradas para:
- Usar `doc.output('blob')` em vez de `doc.output('datauristring')`
- Chamar `doc.save()` para download local (mantido)
- Chamar `uploadPDFToStorage()` para enviar ao Supabase
- Salvar metadados com `storagePath` no localStorage

Essas funcoes precisarao receber `companyId` como parametro para definir o caminho de storage.

**Arquivo:** `src/lib/pdfGenerator.ts`

---

## 4. Refatorar DownloadedPDFsTab.tsx

Ao clicar num PDF:
- Buscar `storagePath` do registro
- Gerar signed URL via `supabase.storage.from('pdfs').createSignedUrl(storagePath, 600)`
- Abrir em nova aba via `window.open(signedUrl, '_blank')`

**Arquivo:** `src/components/shared/DownloadedPDFsTab.tsx`

---

## 5. WhatsApp via wa.me com link do PDF

No `IssueWarrantyModal.tsx`, o fluxo de "Enviar WhatsApp":
- Gerar o PDF
- Upload para Supabase Storage
- Gerar signed URL com validade de 7 dias (604800 segundos)
- Montar mensagem com template + link do PDF
- Abrir `https://wa.me/55NUMERO?text=MENSAGEM` (nao `web.whatsapp.com`)

A mesma correcao sera aplicada em `Garantias.tsx` (handleSendWhatsApp na lista).

**Arquivos:** `src/components/garantias/IssueWarrantyModal.tsx`, `src/pages/Garantias.tsx`

---

## 6. Barra de navegacao desktop - linha unica

O label atualmente usa `whitespace-nowrap sm:inline` sem `hidden`, entao aparece em todas as telas. No desktop, com muitos itens, nao cabe em uma linha.

**Correcao:** Restaurar `hidden sm:inline` no span do label para que no mobile aparecam apenas icones (com scroll horizontal), e no desktop aparecam icone + label (tambem com scroll horizontal se necessario). A scrollbar fina ja esta implementada via `.nav-scrollbar`.

**Arquivo:** `src/components/layout/TopNavigation.tsx`
- Linha 134: trocar `whitespace-nowrap sm:inline` por `hidden sm:inline`

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Criar bucket `pdfs` privado + politicas RLS |
| `src/lib/pdfStorage.ts` | Remover dataUrl, adicionar storagePath, funcoes de upload/signed URL |
| `src/lib/pdfGenerator.ts` | Usar blob + upload ao Supabase em todas as funcoes de geracao |
| `src/components/shared/DownloadedPDFsTab.tsx` | Abrir PDF via signed URL |
| `src/components/garantias/IssueWarrantyModal.tsx` | WhatsApp via wa.me + link signed URL do PDF |
| `src/pages/Garantias.tsx` | WhatsApp via wa.me + link signed URL |
| `src/components/layout/TopNavigation.tsx` | Restaurar `hidden sm:inline` no label |
| `src/components/vendas/PdfA4Modal.tsx` | Passar companyId para funcoes de geracao |
| `src/components/vendas/PdfNotinhaModal.tsx` | Passar companyId para funcoes de geracao |

## Detalhes Tecnicos

- O bucket sera **privado** - PDFs so acessiveis via signed URL
- Signed URL para preview interno: 600 segundos (10 min)
- Signed URL para envio ao cliente via WhatsApp: 604800 segundos (7 dias)
- Path no storage: `{companyId}/{module}/{filename}` (ex: `42/garantias/garantia-WFE-0001.pdf`)
- localStorage continuara guardando metadados (sem base64), mantendo o historico leve
- `wa.me` e o unico dominio usado para WhatsApp - nunca `web.whatsapp.com`
- Content-Type sera `application/pdf` automaticamente pelo Supabase Storage ao fazer upload de blob PDF
