# Feature: Upgrade de Planos e Controle de Acessos — Design Técnico

**Spec**: `.specs/features/upgrade-planos/spec.md`
**Status**: Draft

---

## Architecture Overview

O design técnico propõe a unificação das interfaces de precificação no componente `<PlanSelection />` (rota `/planos`), adaptando-o dinamicamente de acordo com o parâmetro `mode=upgrade` na URL. 

A arquitetura de roteamento em `src/App.tsx` será flexibilizada para permitir que usuários ativos no plano Básico Dono/Admin acessem `/planos` e `/assinatura` em modo de upgrade, enquanto o hook `<usePlanGate />` centralizará as regras de negócio para barrar acessos aos módulos de Estoque e Perdas no plano Básico.

```mermaid
graph TD
    User[Usuário Básico Dono/Admin] -->|Acessa /perdas ou /estoque| Gate{usePlanGate}
    Gate -->|Redireciona| UpgRoute[/upgrade alias]
    UpgRoute -->|Navega para| PlanPage[/planos?mode=upgrade]
    
    PlanPage -->|Seleciona Ultra Mensal/Anual| PayPage[/assinatura?mode=upgrade&target=ultra&period=monthly/annual]
    PayPage -->|Já fiz o pagamento| DBUpgrade[(Supabase RPC: request_plan_upgrade)]
    
    PayPage -->|Abre| WhatsAppLink[Suporte WhatsApp: +55 17 992573141]
    
    Master[Painel Master] -->|Aprova Upgrade| DBActive[(subscriptions table: plan_code = ultra)]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| :--- | :--- | :--- |
| `usePlanGate` | `src/hooks/usePlanGate.ts` | Expandir para suportar o módulo `'perdas'` com as mesmas premissas de permissão do Estoque. |
| `PlanSelection` | `src/pages/PlanSelection.tsx` | Adaptar textos, CTAs, desabilitar Básico como plano atual e habilitar toggle de periodicidade sob o modo `mode=upgrade`. |
| `Subscription` | `src/pages/Subscription.tsx` | Ler `period` da URL para suportar upgrades anuais no PIX pro-rata e alterar o modal para integração WhatsApp. |
| `MaterialLosses` | `src/pages/MaterialLosses.tsx` | Integrar o hook `usePlanGate('perdas')` no carregamento para bloquear acessos a usuários Básico. |
| `Upgrade` | `src/pages/Upgrade.tsx` | Converter em redirecionador direto para `/planos?mode=upgrade` (evitando redundância de UI). |

### Integration Points

| System | Integration Method |
| :--- | :--- |
| **Supabase RPC (`calculate_upgrade_prorata`)** | Executado em `Subscription.tsx` no modo upgrade para calcular o abatimento proporcional a cobrar no PIX. |
| **Supabase RPC (`request_plan_upgrade`)** | Executado ao confirmar o pagamento de upgrade para persistir os dados na tabela `upgrade_requests`. |
| **Supabase RLS Policies** | Endurecimento na tabela `material_losses` para negar operações se a assinatura for do plano `basic`. |

---

## Components

### 1. `src/hooks/usePlanGate.ts`
- **Purpose**: Centralizar regras de acessibilidade baseadas em plano e role.
- **Interfaces**:
  - `usePlanGate(moduleName: 'estoque' | 'master' | 'equipe' | 'perdas')`
- **Reuses**: Código de validação do Estoque.
- **Logic**:
  - Para `perdas`: Se o plano for `ultra` ou `premium`, libera (`hasAccess: true`).
  - Se for `basic` e dono/admin: bloqueia (`hasAccess: false`, `redirectTo: '/upgrade'`, `message` apropriado).
  - Se for `basic` e vendedor/produção: bloqueia (`hasAccess: false`, `redirectTo: '/'`, `message` orientando falar com o dono).

### 2. `src/pages/PlanSelection.tsx`
- **Purpose**: Seleção inicial de plano ou de upgrade de periodicidade/plano.
- **Dependencies**: Parâmetro `mode=upgrade` na URL, `useAuth` para identificar o plano atual e permissões, e query no Supabase para buscar solicitações pendentes de upgrade.
- **UI Adaptations in Upgrade Mode**:
  - Título: `"Aprimore seu plano"`.
  - Subtítulo: `"O módulo Estoque e Perdas estão disponíveis a partir do plano Ultra."`
  - Card Básico: Botão `"Seu Plano Atual"` (desabilitado).
  - Card Ultra: Botão `"Fazer Upgrade"` (redireciona para `/assinatura?mode=upgrade&target=ultra&period={period}`). Se houver upgrade pendente, o botão fica desabilitado e exibe o aviso abaixo.
  - Card Premium: Sem menção ao "Painel Master" e desabilitado com o texto `"Em breve"`.

### 3. `src/pages/Subscription.tsx`
- **Purpose**: Tela de pagamento PIX para assinaturas iniciais e upgrades.
- **Dependencies**: Parâmetros `mode`, `target`, `period`.
- **Key Enhancements**:
  - No modo upgrade, obter a periodicidade alvo do parâmetro `period` da URL: `const targetPeriod = searchParams.get('period') || currentSub?.billing_period || 'monthly';` e passar corretamente ao RPC `calculate_upgrade_prorata` e `request_plan_upgrade`.
  - Alterar o modal de confirmação de pagamento:
    - O botão amarelo principal se chamará **"Enviar comprovante"**.
    - O clique no botão abrirá o WhatsApp Web/App em nova aba para o número `+55 17 992573141` com a mensagem: 
      `Olá, realizei o pagamento do WFE Evolution CRM. Segue o comprovante para conferencia.`
    - Chamar a rotina para atualizar a assinatura para `payment_submitted` (assinatura inicial) ou criar o `upgrade_request` (no upgrade).
    - Redirecionar ao final para `/aguardando-liberacao` (assinatura inicial) ou `/` com toast/alerta explicativo de upgrade pendente (no upgrade).

### 4. `src/App.tsx`
- **Purpose**: Ajustar os guards de roteamento em `/planos` e `/assinatura`.
- **Modifications**:
  - Permitir acesso a `/planos` e `/assinatura` mesmo que `user.subscriptionStatus === 'active'` desde que a URL carregue `mode=upgrade`.

---

## Data Models & Database Checks

A tabela `upgrade_requests` deve conter a seguinte estrutura básica no Supabase para rastrear as solicitações enviadas:

```typescript
interface UpgradeRequest {
  id: string;
  company_id: string;
  requested_by: string; // user_id
  plan_code: 'ultra';
  billing_period: 'monthly' | 'annual';
  amount_due: number; // valor calculado pro-rata
  status: 'pending_payment' | 'payment_submitted' | 'approved' | 'rejected';
  created_at: string;
}
```

A liberação real do plano ocorre quando o administrador Master aprova a solicitação, rodando a transação que muda `subscriptions.plan_code = 'ultra'`, `subscriptions.billing_period` para o solicitado, e re-calcula o vencimento `expires_at` (somente em migrações para o ciclo anual, adicionando 12 meses ao vencimento atual).

---

## Error & Validation Handling Strategy

| Error Scenario | Handling | User Impact |
| :--- | :--- | :--- |
| Usuário Ultra tenta acessar upgrade | O sistema detecta plano igual ou superior e redireciona imediatamente para o dashboard (`/`). | Redirecionamento silencioso e seguro para a home. |
| Rota de upgrade sem parâmetros | Se `/assinatura?mode=upgrade` vier sem `target` ou `period`, redirecionar de volta para `/planos?mode=upgrade`. | Exibe a tela de planos com mensagem de orientação. |
| Solicitação duplicada de upgrade | Desabilitar botão de upgrade na tela `/planos` se houver requisição ativa com status `payment_submitted`. | Botão cinza/desabilitado com texto `"Upgrade em análise"`. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Unificação do fluxo de upgrade** | Reutilizar a página `/planos` e redirecionar a rota `/upgrade` para `/planos?mode=upgrade`. | Elimina duplicidade de código de layout, tabelas de recursos e lógica de toggle de periodicidade, centralizando a manutenção de preços e cards. |
| **Integração de WhatsApp no Modal** | CTA do modal de pagamento abre o WhatsApp com mensagem estruturada em vez de acionar liberação automática. | Mitiga fraude e assegura que nenhuma ativação ocorra sem que o comprovante real tenha sido revisado manualmente. |
| **Periodicidade no Upgrade** | Ler `period` diretamente dos query parameters na rota `/assinatura?mode=upgrade`. | Resolve o bug atual onde o período de upgrade fica preso na periodicidade antiga do Básico. |
