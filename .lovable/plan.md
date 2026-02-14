

# Plano: 4 Melhorias no CRM

## Item 1 - Remover Email e Enviar Garantia via WhatsApp

Remover toda a funcionalidade de envio por Gmail (SendEmailModal, edge function send-email) e substituir por envio do certificado de garantia via WhatsApp, reutilizando o padrao ja existente no modulo de Vendas (WhatsAppPreviewModal).

**Arquivos afetados:**
- `src/pages/Garantias.tsx` - Remover import do SendEmailModal, trocar botao "Enviar por Email" por "Enviar WhatsApp", adicionar logica de redirecionamento WhatsApp com mensagem da garantia
- `src/components/garantias/SendEmailModal.tsx` - Deletar arquivo
- `supabase/functions/send-email/index.ts` - Deletar edge function (e remover deploy)

A mensagem WhatsApp incluira dados do certificado (numero, tipo, validade, veiculo) formatados similar ao padrao do WhatsAppPreviewModal de vendas.

---

## Item 2 - Labels + Scroll Horizontal na Barra de Navegacao Mobile

Atualmente, em telas < 640px (sm), os labels ficam ocultos (`hidden sm:inline`). A alteracao mostrara os labels sempre visiveis e a barra ja possui `overflow-x-auto`.

**Arquivo afetado:**
- `src/components/layout/TopNavigation.tsx` - Remover `hidden sm:inline` do `<span>` dos labels para que aparecam em todas as telas. Adicionar CSS `scrollbar-hide` se necessario.

---

## Item 3 - Correcao da Aba Contas no Mobile

O layout atual usa `flex` com sidebar fixa de `w-72` e conteudo `flex-1`. No mobile, a sidebar ocupa grande parte da tela e o conteudo fica cortado (como mostra o screenshot). A solucao e tornar o layout responsivo: no mobile, empilhar verticalmente com a lista de contas em scroll horizontal e o conteudo abaixo em largura total.

**Arquivo afetado:**
- `src/pages/Contas.tsx` - Alterar o layout de `flex` horizontal fixo para responsivo:
  - Mobile: layout vertical (`flex-col`), lista de contas em scroll horizontal no topo
  - Desktop: manter layout atual com sidebar lateral `w-72`

---

## Item 4 - Sub-aba de PDFs Baixados

Criar um sistema de armazenamento local (localStorage) para registrar metadados dos PDFs gerados em cada modulo. Adicionar uma sub-aba "PDFs Baixados" nos modulos que geram PDFs (Vendas, Garantias, Relatorios, Espaco).

**Arquivos afetados:**
- `src/lib/pdfStorage.ts` - Novo arquivo com funcoes para salvar/listar/remover registros de PDFs no localStorage (tipo, nome, data, modulo)
- `src/components/shared/DownloadedPDFsTab.tsx` - Novo componente reutilizavel que lista PDFs baixados com filtros por tipo
- `src/pages/Vendas.tsx` - Adicionar sub-aba "PDFs" e registrar downloads
- `src/pages/Garantias.tsx` - Adicionar sub-aba "PDFs" e registrar downloads  
- `src/pages/Relatorios.tsx` - Adicionar sub-aba "PDFs" e registrar downloads
- `src/pages/Espaco.tsx` - Adicionar sub-aba "PDFs" e registrar downloads
- `src/lib/pdfGenerator.ts` - Interceptar funcoes de geracao para registrar automaticamente no storage
- `src/components/vendas/PdfA4Modal.tsx` e `PdfNotinhaModal.tsx` - Registrar PDF ao gerar

Cada registro salvara: nome do arquivo, tipo (Recibo A4, Notinha, Garantia, Relatorio), data/hora, e dados associados (nome do cliente, placa, etc).

---

## Detalhes Tecnicos

- **Item 1**: O WhatsApp sera aberto via `window.open` com `web.whatsapp.com/send?phone=...&text=...`, mesmo padrao usado em Vendas
- **Item 2**: Apenas remocao de classe CSS `hidden sm:inline` no span de label
- **Item 3**: Uso de classes Tailwind responsivas (`flex-col md:flex-row`, `w-full md:w-72`)
- **Item 4**: localStorage com chave `wfe_downloaded_pdfs` armazenando array JSON de metadados. Sem necessidade de tabela no banco de dados

