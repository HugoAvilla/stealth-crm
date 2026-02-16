

# Corrigir botao "Enviar WhatsApp" no modal Emitir Garantia

## Problema
O botao "Enviar WhatsApp" no modal de emissao de garantias (`IssueWarrantyModal.tsx`) usa `window.location.href` (linha 192), que e bloqueado pelo navegador. Alem disso, o link do PDF proxy na mensagem pode nao funcionar corretamente.

## Solucao

### Arquivo: `src/components/garantias/IssueWarrantyModal.tsx`

**1. Separar a logica em duas etapas:**
- O botao "Enviar WhatsApp" primeiro salva a garantia no banco de dados, gera o PDF, e depois abre o WhatsApp via link nativo `<a>`.
- Como a garantia precisa ser salva antes de gerar a URL do WhatsApp, o fluxo sera:
  1. Clicar no botao "Enviar WhatsApp"
  2. Salvar garantia no Supabase e gerar PDF
  3. Montar a URL `https://wa.me/...` com a mensagem formatada incluindo o link do PDF
  4. Abrir em nova aba usando `window.open` apos o processo assincrono (ou melhor: mudar o fluxo)

**Problema tecnico:** Como a garantia precisa ser salva primeiro (operacao assincrona) para obter o ID e gerar o PDF, nao e possivel usar um `<a>` puro. A solucao sera:
- Salvar a garantia no banco
- Gerar o PDF
- Montar a URL do WhatsApp com `https://wa.me/`
- Usar `window.open()` imediatamente apos o await (dentro do mesmo clique do usuario, para evitar bloqueio de popup)

**2. Mudancas especificas:**

- **Remover** `window.location.href = url` (linha 192)
- **Substituir** por `window.open(url, '_blank', 'noopener,noreferrer')` logo apos o insert e geracao do PDF
- Garantir que o `+55` seja adicionado ao numero
- O link do PDF na mensagem usara a URL do proxy (`getPDFProxyUrl`)
- Formato da URL: `https://wa.me/5517992573141?text=...`

**3. Mensagem WhatsApp formatada:**

```
🛡️ *CERTIFICADO DE GARANTIA*

📋 N WFE-0001
🔧 Servico: PPF Completo
🚗 Veiculo: Toyota Corolla - Placa: ABC1234
📅 Emissao: 16/02/2026
📅 Validade: 16/02/2027

📄 Termos:
[texto dos termos]

👉 Baixe o PDF:
[link do proxy]

_WFE EVOLUTION - Garantia Intransferivel_
```

**4. Correcao do botao na interface (linha 346-348):**
- Manter como `<Button>` pois o processo e assincrono (precisa salvar no banco antes)
- Mas usar `window.open` ao inves de `window.location.href` para abrir em nova aba

## Detalhes Tecnicos

Arquivo modificado: `src/components/garantias/IssueWarrantyModal.tsx`

Mudancas na funcao `handleSend` (linhas 123-204):
- Linha 190-192: Trocar `window.location.href = url` por `window.open(url, '_blank', 'noopener,noreferrer')`
- Linha 191: Adicionar logica de `+55` automatico: `const phoneWithCountryCode = phone.startsWith("55") ? phone : "55" + phone`
- A URL final sera: `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`

Nenhum outro arquivo precisa ser alterado - as correcoes dos outros 4 arquivos ja estao aplicadas.

