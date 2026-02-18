

# Refazer "Enviar WhatsApp" na aba Emitir Garantia

## Problema
O botao "Enviar WhatsApp" no modal de emissao de garantias continua falhando. A abordagem atual (salvar + gerar URL no mesmo clique) tem problemas de timing e estado.

## Solucao: Seguir o modelo exato da aba Espaco

Criar um modal dedicado `WarrantyWhatsAppModal` identico ao `SpaceWhatsAppModal`, com:
- Pre-visualizacao estilo chat WhatsApp
- Edicao de mensagem com variaveis
- Link nativo `<a>` para enviar (sem async, sem popup blocker)

O fluxo sera dividido em duas acoes separadas:
1. **Botao "Emitir Garantia"**: Salva no banco + gera PDF (sem WhatsApp)
2. **Botao "Enviar WhatsApp"**: Aparece APOS a emissao, abre o modal de preview com link nativo

## Arquivos a criar/modificar

### 1. CRIAR: `src/components/garantias/WarrantyWhatsAppModal.tsx`
- Copia do modelo `SpaceWhatsAppModal.tsx` adaptado para garantias
- Recebe os dados da garantia emitida (cliente, veiculo, template, datas, link PDF)
- Mensagem padrao com dados do certificado
- Variaveis editaveis: {cliente}, {veiculo}, {servico}, {emissao}, {validade}, {termos}
- Link nativo `<a href="https://wa.me/...">` para enviar
- Preview estilo chat WhatsApp com formatacao

### 2. MODIFICAR: `src/components/garantias/IssueWarrantyModal.tsx`
- Remover toda a logica de `whatsappUrl` e `window.open`
- Separar em dois botoes:
  - "Emitir Garantia": salva no banco e gera PDF
  - "Enviar WhatsApp": aparece apos emissao, abre o `WarrantyWhatsAppModal`
- Adicionar state para controlar se a garantia ja foi emitida
- Adicionar state para abrir/fechar o `WarrantyWhatsAppModal`

## Fluxo do usuario

```text
[Seleciona modelo, cliente, veiculo]
         |
         v
[Clica "Emitir Garantia"]
   -> Salva no banco
   -> Gera PDF
   -> Mostra toast de sucesso
   -> Botoes mudam para:
      "Enviar WhatsApp" (verde) + "Fechar"
         |
         v
[Clica "Enviar WhatsApp"]
   -> Abre WarrantyWhatsAppModal
   -> Preview da mensagem estilo chat
   -> Link nativo <a> para abrir WhatsApp
```

## Mensagem padrao da garantia

```
CERTIFICADO DE GARANTIA

N. WFE-0001
Servico: PPF Completo
Veiculo: Toyota Corolla (ABC1234)
Emissao: 18/02/2026
Validade: 18/02/2027

Termos:
[texto dos termos]

Baixe o PDF:
[link do proxy]

WFE EVOLUTION - Garantia Intransferivel
```

## Detalhes tecnicos

O `WarrantyWhatsAppModal` usara a mesma estrutura do `SpaceWhatsAppModal`:
- Funcao `getWhatsAppUrl()` que retorna `https://wa.me/{phone}?text={message}` (sincrona, sem async)
- Link `<a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">` nativo
- Formatacao WhatsApp (negrito com *, italico com _)
- Toolbar de edicao com variaveis e formatacao

No `IssueWarrantyModal`, a funcao `handleSend` sera renomeada para `handleIssue` e nao tera mais nenhuma logica de WhatsApp - apenas salva a garantia e gera o PDF.
