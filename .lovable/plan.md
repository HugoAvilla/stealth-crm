
# Correção: PWA Install Prompt + PDF da Garantia

## Problema 1 - Banner PWA sobrepõe a barra de navegação no mobile

O componente `PWAInstallPrompt` usa `fixed top-0 z-50`, mesma posição do `TopNavigation` (que também é `fixed top-0 z-50`). No mobile, o banner aparece **por cima** da barra de ícones, empurrando o conteúdo da tela para baixo e ficando sobreposto visualmente.

**Solução:** Mover o banner para **baixo da tela** (`fixed bottom-0`) ao invés de `top-0`. Isso é o padrão adotado por apps como YouTube, Twitter e Instagram no mobile — o prompt de instalação aparece na parte inferior, sem interferir com a navegação.

**Arquivo:** `src/components/pwa/PWAInstallPrompt.tsx`
- Trocar `fixed top-0` por `fixed bottom-0`
- Trocar `border-b` por `border-t`
- Trocar `slide-in-from-top` por `slide-in-from-bottom`

---

## Problema 2 - PDF da Garantia retorna "PDF not found" no WhatsApp

**Diagnóstico passo a passo:**

1. O usuário clica em "Emitir Garantia"
2. O código salva a garantia no banco (`supabase.from('warranties').insert(...)`) ✅
3. Chama `generateWarrantyPDF(pdfData, companyId)` **sem `await`** — o upload começa em background mas o código não espera
4. Imediatamente constrói o `storagePath` e o `pdfLink` com o link do proxy
5. Mostra o botão "Enviar WhatsApp" com o link já montado
6. Usuário clica em WhatsApp → o link vai para o cliente
7. O cliente abre o link → a Edge Function `serve-pdf` tenta encontrar o arquivo no Storage
8. O arquivo ainda **não terminou de fazer upload** (ou nunca fez, pois o `await` foi omitido) → `"Object not found"` ❌

**O log da Edge Function confirma:** `Error creating signed URL: StorageApiError: Object not found`

**Solução:** Adicionar `await` na chamada de `generateWarrantyPDF` dentro do `handleIssue` em `IssueWarrantyModal.tsx`. O botão "Enviar WhatsApp" só deve aparecer **após** o upload estar 100% concluído.

**Arquivo:** `src/components/garantias/IssueWarrantyModal.tsx`
- Linha 201: trocar `generateWarrantyPDF(pdfData, companyId)` por `await generateWarrantyPDF(pdfData, companyId)`
- Adicionar feedback visual enquanto o PDF está sendo gerado/enviado ao storage (o `isSubmitting` já existe, então o botão ficará como "Salvando..." durante todo o processo)

---

## Arquivos que serão modificados

1. `src/components/pwa/PWAInstallPrompt.tsx` — mover banner para baixo da tela
2. `src/components/garantias/IssueWarrantyModal.tsx` — adicionar `await` no upload do PDF
