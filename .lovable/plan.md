

# Refazer o botao "Enviar WhatsApp" no modal Emitir Garantia

## Problema
O `window.open()` apos uma operacao assincrona (salvar no banco + gerar PDF) e bloqueado pelo navegador como popup. O modelo correto ja funciona na aba Clientes: um link nativo `<a href={openWhatsApp(phone)}>` com `target="_blank"`.

## Solucao: Fluxo em 2 etapas

Como a garantia precisa ser salva no banco antes de montar a mensagem (para obter o numero do certificado e o link do PDF), o fluxo sera dividido:

1. **Etapa 1 - Botao "Enviar WhatsApp"**: Salva a garantia no Supabase, gera o PDF, e armazena a URL do WhatsApp em um state.
2. **Etapa 2 - Link nativo aparece**: Apos salvar com sucesso, o botao muda para um `<a href="https://wa.me/...">` nativo (igual ao modelo da aba Clientes), que o usuario clica para abrir o WhatsApp sem bloqueio.

## Mudancas no arquivo `src/components/garantias/IssueWarrantyModal.tsx`

### 1. Novo state para a URL do WhatsApp
```typescript
const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
```

### 2. Funcao `handleSend` atualizada
- Remove `window.open()`
- Apos salvar a garantia e gerar o PDF, monta a URL e salva no state `whatsappUrl`
- A mensagem inclui os dados do certificado e o link do PDF proxy

### 3. Botao na interface
- Antes de salvar: `<Button onClick={handleSend}>Enviar WhatsApp</Button>` (salva a garantia)
- Apos salvar: `<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">` como botao verde "Abrir WhatsApp" (link nativo, sem bloqueio)
- Usa `openWhatsApp()` de `src/lib/utils.ts` para formatar o telefone com +55

### 4. Mensagem formatada no WhatsApp
```
CERTIFICADO DE GARANTIA

N. WFE-0001
Servico: PPF Completo
Veiculo: Toyota Corolla - Placa: ABC1234
Emissao: 16/02/2026
Validade: 16/02/2027

Termos:
[texto dos termos]

Baixe o PDF:
[link do proxy]

WFE EVOLUTION - Garantia Intransferivel
```

### 5. Reset
- Ao fechar o modal ou cancelar, limpa o state `whatsappUrl` para voltar ao estado inicial

## Resultado
O fluxo fica identico ao da aba Clientes: link nativo `<a>` usando `https://wa.me/55...?text=...`, sem `window.open`, sem `window.location.href`, sem bloqueio de popup.

