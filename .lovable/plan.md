
# Adicionar Botão "Voltar" na Página de Verificação de Pagamento

## Resumo
Adicionar um botão de voltar na página `/aguardando-liberacao` para permitir que o usuário retorne à página de login (`/login`) caso precise revisar ou alterar algo.

## Alteração

### Arquivo: `src/pages/WaitingApproval.tsx`

Adicionar um botão "Voltar" no topo do card, antes do ícone de relógio. O botão seguirá o padrão visual do projeto (dark theme com acentos em lime/amarelo).

**Mudanças:**
1. Importar o ícone `ArrowLeft` do lucide-react
2. Adicionar um botão discreto no topo do CardHeader que navega para `/assinatura`

**Posicionamento:**
- O botão ficará no topo esquerdo do card, acima do ícone do relógio
- Terá estilo `ghost` para não competir visualmente com os botões de ação principais
- Texto: "Voltar para login"

```text
┌────────────────────────────────┐
│ ← Voltar para login       │
│                                │
│           (relógio)            │
│   Verificando seu pagamento... │
│   ...resto do conteúdo...      │
└────────────────────────────────┘
```

## Comportamento
- Ao clicar, o usuário será redirecionado para `/login`
- Isso permite que ele revise os dados do PIX ou cancele a confirmação de pagamento
