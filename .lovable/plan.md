# Plano: Edge Function Proxy para PDFs + Correcoes WhatsApp

## Problema Central

O frontend esta usando Signed URLs do Supabase (`/storage/v1/object/sign/...`) diretamente. Browsers e extensoes (AdBlock, uBlock, Brave Shields) bloqueiam essas URLs com `ERR_BLOCKED_BY_CLIENT`. Isso quebra:

- Visualizacao de PDFs na aba "PDFs Baixados"
- Links de PDF enviados via WhatsApp
- Preview de documentos

## Solucao: Edge Function Proxy

Criar uma Edge Function que recebe o `storagePath`, gera o signed URL internamente (no backend), faz fetch do PDF, e retorna o binario com headers corretos. O frontend nunca ve o signed URL.

---

## 1. Criar Edge Function `serve-pdf`

**Arquivo:** `supabase/functions/serve-pdf/index.ts`

Fluxo:

1. Frontend chama: `GET /serve-pdf?path=42/garantias/garantia-WFE-0001.pdf`
2. Edge Function valida autenticacao (JWT do header Authorization)
3. Gera signed URL internamente
4. Faz fetch do PDF usando o signed URL
5. Retorna o binario com `Content-Type: application/pdf` e `Content-Disposition: inline`

O frontend recebe um PDF puro, sem URL de storage exposta.

**Config:** `supabase/config.toml` - adicionar `[functions.serve-pdf]` com `verify_jwt = false` (validacao manual no codigo)

---

## 2. Refatorar `pdfStorage.ts`

- Remover a funcao `getPDFSignedUrl` (nao sera mais usada no frontend)
- Criar funcao `getPDFProxyUrl(storagePath)` que retorna a URL da Edge Function:
  ```
  https://{project}.supabase.co/functions/v1/serve-pdf?path={encodedPath}
  ```
- Manter `uploadPDFToStorage` como esta (funciona corretamente)
- Manter metadados no localStorage com `storagePath`

---

## 3. Refatorar `DownloadedPDFsTab.tsx`

- Em vez de gerar signed URL e abrir com `window.open(signedUrl)`, usar a URL do proxy
- A URL do proxy e um link HTTPS normal que retorna PDF inline - nao e bloqueada
- Continuar usando `window.open(proxyUrl, '_blank')` (funciona porque e URL normal)

---

## 4. Corrigir WhatsApp no `IssueWarrantyModal.tsx`

O fluxo de "Enviar WhatsApp" atualmente:

1. Gera PDF e faz upload
2. Espera 1.5s
3. Gera signed URL (7 dias)
4. Inclui signed URL na mensagem WhatsApp

**Problema:** O signed URL na mensagem sera bloqueado pelo browser do destinatario tambem.

**Correcao:** Usar a URL do proxy na mensagem. Como a Edge Function valida JWT, o link so funciona para usuarios logados. Para o cliente final (sem login), ha duas opcoes:

- **Opcao escolhida:** A Edge Function `serve-pdf` tera um modo "public token" - aceita um token curto (hash) como query param em vez de JWT, permitindo acesso temporario sem login. Isso e mais simples que tornar o bucket publico.

Na pratica: ao gerar o link para WhatsApp, o sistema cria um signed URL de 7 dias no backend e salva o token no localStorage. A Edge Function aceita `?token=SIGNED_URL_TOKEN` como alternativa ao JWT.

**Simplificacao:** Na verdade, a forma mais simples e: a Edge Function gera o signed URL internamente e redireciona (302) para ele. O signed URL so aparece no redirect final, nao na barra de endereco original. Isso evita bloqueio porque a URL que o usuario/cliente ve e `/functions/v1/serve-pdf?path=...`.

---

## 5. Corrigir WhatsApp no `Garantias.tsx`

O `handleSendWhatsApp` na lista de garantias nao inclui link do PDF. Para manter consistencia:

- Adicionar o link do proxy na mensagem (se o PDF existir no storage)
- Usar `window.location.href` em vez de criar elemento `<a>` para garantir que funciona

---

---

## Resumo de Arquivos


| Arquivo                                           | Alteracao                                     |
| ------------------------------------------------- | --------------------------------------------- |
| `supabase/functions/serve-pdf/index.ts`           | **NOVO** - Edge Function proxy para PDFs      |
| `supabase/config.toml`                            | Adicionar config da nova funcao               |
| `src/lib/pdfStorage.ts`                           | Trocar `getPDFSignedUrl` por `getPDFProxyUrl` |
| `src/components/shared/DownloadedPDFsTab.tsx`     | Usar URL do proxy em vez de signed URL        |
| `src/components/garantias/IssueWarrantyModal.tsx` | Usar URL do proxy na mensagem WhatsApp        |
| `src/pages/Garantias.tsx`                         | Adicionar link do proxy na mensagem WhatsApp  |


## Detalhes Tecnicos

- A Edge Function usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (variaveis de ambiente automaticas do Supabase) para gerar signed URLs no backend
- O proxy retorna o PDF com `Content-Type: application/pdf` - browsers renderizam nativamente
- URLs do tipo `/functions/v1/serve-pdf?path=...` nao sao bloqueadas por AdBlock
- Para links enviados via WhatsApp ao cliente final (sem JWT), a Edge Function fara redirect 302 para o signed URL - o redirect acontece server-side, entao o browser do cliente nao bloqueia
- Timeout da Edge Function: padrao (60s) e suficiente para PDFs pequenos