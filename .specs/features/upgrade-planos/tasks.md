# Feature: Upgrade de Planos e Controle de Acessos — Lista de Tarefas

Este documento descreve as tarefas físicas e atômicas necessárias para implementar e validar a especificação.

---

## Kanban / Lista de Tarefas

### [x] Fase 1: Ajuste de Roteamento e Acessos
- [x] **TSK-01 (App.tsx):** Atualizar guards de roteamento para liberar `/planos` e `/assinatura` em modo upgrade. Mapear `/upgrade` para redirecionar diretamente para `/planos?mode=upgrade`.
- [x] **TSK-02 (usePlanGate.ts):** Implementar o módulo `'perdas'` no hook de permissões de plano, adotando a mesma política de redirecionamento aplicada ao Estoque.
- [x] **TSK-03 (MaterialLosses.tsx):** Integrar o hook `usePlanGate('perdas')` na página de perdas para aplicar o bloqueio seguro e exibir feedback ao usuário.

### [x] Fase 2: Unificação da Tela de Planos
- [x] **TSK-04 (PlanSelection.tsx - Estrutura e Interface):**
  - Detectar o parâmetro `mode=upgrade` na URL.
  - Personalizar o título e o subtítulo no modo upgrade.
  - Remover a feature "Acesso ao Painel Master" do plano Premium.
  - Mostrar o plano Básico como `"Seu Plano Atual"` (desabilitado) se o plano ativo for Básico.
- [x] **TSK-05 (PlanSelection.tsx - Integração de Estados e Supabase):**
  - Buscar na tabela `upgrade_requests` solicitações pendentes (`pending_payment` ou `payment_submitted`) do usuário/empresa logada.
  - Se houver solicitação pendente, desabilitar o botão do Ultra e exibir o texto `"Upgrade em análise"`.
  - Direcionar o botão de upgrade para `/assinatura?mode=upgrade&target=ultra&period={isAnnual ? 'annual' : 'monthly'}`.

### [x] Fase 3: Conclusão do Pagamento e Integração WhatsApp
- [x] **TSK-06 (Subscription.tsx - Correção de Periodicidade):**
  - Ler o parâmetro `period` da URL para suportar upgrades anuais ou mensais.
  - Passar o período correto para os RPCs `calculate_upgrade_prorata` e `request_plan_upgrade`.
- [x] **TSK-07 (Subscription.tsx - Modal de Pagamento & WhatsApp):**
  - Alterar o botão de confirmação do modal de pagamento de "Confirmar e Aguardar Liberação" para **"Enviar comprovante"**.
  - No clique, abrir o WhatsApp (`+55 17 992573141`) in uma nova aba com a mensagem parametrizada.
  - Gravar os dados no banco de dados e redirecionar para a tela correspondente (`/` ou `/aguardando-liberacao`) com toast e feedback visual limpo.

---

## Validação e Critérios de Aceitação por Tarefa

### TSK-01: Guards de Roteamento
- **Como testar:** Com um usuário Básico ativo, digite `/planos?mode=upgrade` na barra de endereço. O sistema **shall** permitir o acesso sem redirecionar para a home (`/`).
- **Como testar:** Digite `/upgrade` direto na URL. O sistema **shall** redirecionar para `/planos?mode=upgrade`.

### TSK-02 & TSK-03: Bloqueio de Perdas no Básico
- **Como testar:** Faça login com um usuário admin do plano Básico. Acesse `/perdas`. O sistema **shall** redirecionar para `/upgrade` (que vai para `/planos?mode=upgrade`) e mostrar um toast informativo.
- **Como testar:** Faça login com um funcionário do plano Básico (ex: Produção). Acesse `/perdas`. O sistema **shall** redirecionar para `/` e exibir um alerta bloqueando o acesso.

### TSK-04 & TSK-05: Tela `/planos?mode=upgrade`
- **Como testar:** Acesse `/planos?mode=upgrade`. Verifique se o título mudou para "Aprimore seu plano" e se o plano Básico está desabilitado como "Seu Plano Atual".
- **Como testar:** Insira manualmente na tabela `upgrade_requests` um registro pendente. Volte para a tela de planos e confirme que o botão "Fazer Upgrade" está desabilitado e exibe "Upgrade em análise".

### TSK-06 & TSK-07: Pro-rata de Periodicidade & WhatsApp
- **Como testar:** Clique em fazer upgrade no plano Ultra Anual. Verifique se a tela `/assinatura` exibe o valor calculado com desconto proporcional e a periodicidade indicada como **Anual**.
- **Como testar:** Clique em "Já fiz o pagamento" e depois em "Enviar comprovante". Confirme se a nova aba do WhatsApp é aberta com o texto exato da mensagem e o número correto do suporte.
