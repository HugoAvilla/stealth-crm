# Especificação de Correção da Janela de Upgrade e Acessos por Plano

## Problem Statement

Atualmente, o fluxo de upgrade de planos e controle de acessos no WFE CRM apresenta comportamentos incorretos e regressões críticas:
1. Ao acessar a rota `/upgrade` e tentar realizar o upgrade do plano Básico para Ultra, o usuário é redirecionado de volta para o Dashboard antes mesmo de ser exibida a tela de pagamento PIX.
2. O upgrade está limitado ao plano Ultra mensal, não dando opção ao usuário de escolher entre Ultra mensal ou Ultra anual.
3. O modal de confirmação de pagamento possui comportamento inseguro de liberação imediata ao clicar no CTA, quando na verdade apenas a conta Master global deve aprovar a liberação de assinaturas ou upgrades.
4. O card de plano Premium indevidamente menciona "Acesso ao Painel Master" e a aba "Perdas" está acessível para o plano Básico, violando as premissas de precificação e acessibilidade definidas no modelo de negócios.

## Goals

- [ ] **Unificação de Telas:** Reaproveitar a rota `/planos` para a seleção inicial de assinatura e também para o processo de upgrade (`/planos?mode=upgrade`), evitando duplicidade de interface.
- [ ] **Correção do Fluxo de Pagamento PIX:** Permitir que o usuário Básico Dono/Admin acesse a rota `/assinatura?mode=upgrade` escolhendo Ultra mensal ou anual e veja o resumo com valor pro-rata calculado.
- [ ] **Segurança e WhatsApp Integrado:** Garantir que o modal de confirmação de pagamento não faça qualquer liberação automática e direcione o usuário para enviar o comprovante via WhatsApp para o número Master `+55 17 992573141`.
- [ ] **Endurecimento de Acessos:** Bloquear o acesso ao módulo **Perdas** para usuários do plano Básico no frontend e backend (RLS), seguindo a mesma política restritiva aplicada ao Estoque.
- [ ] **Correção Premium:** Remover referências de Painel Master do plano Premium e mantê-lo como "Em breve" desabilitado.

## Out of Scope

Explicitamente excluído. Documentado para prevenir desvios de escopo (scope creep).

| Recurso / Feature | Razão da Exclusão |
| :--- | :--- |
| **Gateway de Pagamento Automático** | A conciliação e a ativação de pagamentos PIX permanecem de forma manual através do painel Master. |
| **Downgrade de Planos** | O sistema não dará suporte à descida de planos (Ultra -> Básico) neste escopo. Apenas upgrades ascendentes. |
| **Tornar Premium Contratável** | O plano Premium deve permanecer estritamente como "Em breve" (sem possibilidade de contratação). |
| **Acesso Master para Planos Comuns** | A conta Master e seu painel administrativo são exclusivos de administradores do sistema e não estarão contidos em nenhum plano comercial. |

---

## User Stories

### P1: Fluxo de Upgrade Unificado e Escolha de Periodicidade ⭐ MVP

**User Story**: Como um usuário Dono/Admin no plano Básico ativo, eu quero acessar `/planos?mode=upgrade` para escolher entre Ultra Mensal ou Ultra Anual, e então ser direcionado à tela de pagamento PIX com os valores proporcionais corretos, para que eu possa aprimorar a minha conta de forma transparente e flexível.

**Why P1**: Resolve o principal ponto de falha atual, onde o usuário é redirecionado ao dashboard antes de conseguir pagar e não tem a opção de escolher a modalidade anual no upgrade.

**Acceptance Criteria**:
1. WHEN o usuário Dono/Admin no plano Básico tentar acessar `/upgrade` THEN o sistema SHALL redirecionar o navegador para `/planos?mode=upgrade`.
2. WHEN a rota `/planos?mode=upgrade` for acessada por um Dono/Admin ativo no plano Básico THEN o sistema SHALL exibir o Básico como plano atual (desabilitado para seleção), o Ultra habilitado para seleção (respeitando o toggle Mensal/Anual), e o Premium desabilitado como "Em breve".
3. WHEN o usuário clicar em "Selecionar plano" no card Ultra com toggle Mensal ativado THEN o sistema SHALL navegar para `/assinatura?mode=upgrade&target=ultra&period=monthly`.
4. WHEN o usuário clicar em "Selecionar plano" no card Ultra com toggle Anual ativado THEN o sistema SHALL navegar para `/assinatura?mode=upgrade&target=ultra&period=annual`.
5. WHEN a rota `/assinatura?mode=upgrade` for acessada por um Dono/Admin ativo Básico THEN o sistema SHALL carregar a tela de resumo de pagamento PIX in modo upgrade e SHALL NÃO redirecionar o usuário para o dashboard.

**Independent Test**: Logar como Dono/Admin de empresa com plano Básico ativo. Digitar `/upgrade` na barra de endereços. Confirmar que é levado para a seleção de planos de upgrade. Selecionar o plano Ultra anual. Confirmar que é levado para a tela de pagamento do PIX anual contendo o resumo correto, sem sofrer redirecionamentos.

---

### P1: Confirmação de Pagamento Segura e Integração com WhatsApp ⭐ MVP

**User Story**: Como o criador do sistema, eu quero que as confirmações de pagamento (tanto iniciais quanto de upgrade) exijam o envio manual do comprovante via WhatsApp e nunca liberem o acesso ou atualizem o status para ativo automaticamente, para evitar acessos fraudulentos ou não autorizados.

**Why P1**: O CTA atual possui uma vulnerabilidade funcional que libera o acesso no frontend imediatamente ao clicar, ignorando a conferência obrigatória da equipe Master.

**Acceptance Criteria**:
1. WHEN o usuário clicar em "Já fiz o pagamento" em qualquer fluxo de pagamento (inicial ou upgrade) THEN o sistema SHALL exibir um modal de instrução claro informando que a liberação é feita manualmente pela equipe Master após conferência do comprovante.
2. WHEN o modal de instrução for exibido THEN o botão principal SHALL ser denominado "Enviar comprovante" e SHALL NÃO acionar nenhuma rotina de ativação direta (`status = active` ou atribuição de `expires_at`).
3. WHEN o botão "Enviar comprovante" for clicado THEN o sistema SHALL abrir em uma nova aba o WhatsApp Web/App apontando para o número `+55 17 992573141` com a mensagem pré-preenchida de confirmação de pagamento do WFE Evolution CRM.
4. WHEN o fluxo de pagamento inicial for confirmado pelo usuário THEN o sistema SHALL atualizar a assinatura apenas para o status `payment_submitted` no banco de dados e manter o usuário em fluxo de aguardo de liberação manual.
5. WHEN o fluxo de upgrade for confirmado pelo usuário THEN o sistema SHALL criar ou atualizar o registro de solicitação em `upgrade_requests` com status pendente e manter a assinatura e plano atual inalterados no CRM.

**Independent Test**: Ir para a tela de assinatura PIX. Clicar em "Já fiz o pagamento". Verificar que o modal instrui a enviar o comprovante no WhatsApp e o botão se chama "Enviar comprovante". Clicar no botão e certificar-se de que o WhatsApp abre no link correto em nova aba, e que a conta de teste continua sem acesso liberado, permanecendo no status de pendência.

---

### P1: Controle de Acesso Restrito à aba Perdas ⭐ MVP

**User Story**: Como o criador do sistema, eu quero que a aba e a rota de "Perdas" (Perdas Materiais) sigam o mesmo gate restritivo do Estoque, permitindo acesso apenas para planos Ultra ou superiores, de modo que usuários do plano Básico sejam adequadamente bloqueados.

**Why P1**: O plano Básico é focado nos recursos fundamentais, e os módulos de valor agregado como Estoque e Perdas são restritos ao plano Ultra, incentivando o upgrade comercial.

**Acceptance Criteria**:
1. WHEN um usuário no plano Básico com a role Dono/Admin tentar acessar a rota `/perdas` THEN o sistema SHALL redirecionar o navegador para `/upgrade` (que aponta para `/planos?mode=upgrade`).
2. WHEN um usuário no plano Básico com a role Vendedor ou Produção tentar acessar a rota `/perdas` THEN o sistema SHALL bloquear o acesso e SHALL exibir uma tela/aviso amigável orientando-o a falar com o administrador da empresa para aprimorar o plano.
3. WHEN o usuário estiver no plano Básico THEN o menu lateral (Sidebar) e a navegação superior (TopNavigation) SHALL NÃO exibir o item "Perdas" de forma utilizável ou disponível, ocultando-o ou exibindo-o com indicador visual de bloqueado.
4. WHEN qualquer chamada de API/RPC no Supabase referente a Perdas Materiais for executada por um usuário cuja empresa possui o plano Básico THEN o backend (RLS/Policies/RPC) SHALL rejeitar a requisição com erro de permissão.

**Independent Test**: Logar com um usuário comum (vendedor) pertencente a uma empresa no plano Básico. Tentar digitar `/perdas` na URL. Confirmar que o sistema renderiza uma tela de bloqueio com mensagem instrutiva e impede a visualização de dados. Logar como Dono/Admin Básico, tentar acessar `/perdas` e certificar-se de que é levado para a tela de upgrade de planos.

---

### P2: Bloqueio de Upgrade Duplicado e Ajustes de Copy Premium

**User Story**: Como um usuário Dono/Admin, eu quero que o sistema me impeça de fazer novas solicitações de upgrade se eu já possuir uma solicitação pendente de conferência, e como equipe de negócios quero que o Premium não indique acesso ao Master, mantendo a integridade operacional do sistema.

**Why P2**: Evita a poluição de requisições de upgrade na base de dados e corrige a comunicação enganosa de permissões Master no plano comercial Premium.

**Acceptance Criteria**:
1. WHEN uma empresa/assinatura possuir uma solicitação de upgrade ativa nos status `pending_payment` ou `payment_submitted` THEN o sistema SHALL desabilitar o botão de upgrade na tela de planos e SHALL exibir a mensagem "Seu upgrade já foi solicitado e está aguardando aprovação".
2. WHEN a tela de seleção de planos (/planos ou /upgrade) for renderizada THEN o card do plano Premium SHALL NÃO conter qualquer texto que mencione "Acesso ao Painel Master" ou equivalentes.
3. WHEN a rota `/assinatura?mode=upgrade` for acessada com parâmetro `target=premium` THEN o sistema SHALL bloquear a requisição e redirecionar para `/planos?mode=upgrade` com mensagem de erro.

**Independent Test**: Criar uma solicitação de upgrade via banco. Acessar `/planos?mode=upgrade`. Verificar que o CTA de upgrade do Ultra está desabilitado e a mensagem de aviso de pendência é exibida na tela. Verificar também que não há menção a "Painel Master" nos cards do plano Premium.

---

### P3: Área Administrativa do Master com Subabas Organizadas

**User Story**: Como um usuário Administrador Master global, eu quero ter abas exclusivas organizadas em "Assinaturas", "Upgrades" e "Preços dos Planos" para gerenciar as pendências de upgrades e configurações de preços de forma ordenada, para que eu possa conciliar as receitas com precisão.

**Why P3**: Organiza a tela administrativa do Master em componentes menores e dedicados para suportar o novo fluxo de upgrades e o modelo de tabelas de preços customizadas.

**Acceptance Criteria**:
1. WHEN o Master acessar a tela administrativa de assinaturas THEN o sistema SHALL exibir abas de navegação internas compostas por: "Assinaturas", "Upgrades" e "Preços dos Planos".
2. WHEN a subaba "Upgrades" for acessada pelo Master THEN o sistema SHALL listar todas as solicitações nos status pendente e histórico, exibindo informações do solicitante, empresa, plano de origem, plano destino, periodicidade e valor proporcional de upgrade a pagar.
3. WHEN o Master clicar em "Aprovar Upgrade" THEN o sistema SHALL realizar a atualização da assinatura do usuário para o plano Ultra com o valor pro-rata proporcional correspondente e SHALL manter a data de expiração existente da assinatura.
4. WHEN o Master clicar em "Rejeitar Upgrade" THEN o sistema SHALL manter o usuário no plano Básico, invalidar/rejeitar a solicitação e SHALL permitir que o usuário faça uma nova solicitação caso deseje.

**Independent Test**: Logar como Master. Entrar na aba administrativa. Clicar na subaba "Upgrades". Aprovar uma solicitação fictícia de upgrade e verificar que o plano da empresa correspondente muda para Ultra, mantendo a expiração antiga.

---

## Edge Cases

- **Mudança de Período Simultânea:** WHEN o usuário Dono/Admin do Básico Mensal decidir fazer upgrade diretamente para o Ultra Anual, THEN o sistema SHALL permitir a operação calculando o abatimento pro-rata do saldo restante do mês Básico sobre o valor total do Ultra Anual, e SHALL redefinir a expiração somando 12 meses ao vencimento atual na aprovação pelo Master.
- **Redirecionamento Indevido de Assinatura Ativa:** WHEN um usuário já no plano Ultra (mensal/anual) tentar acessar `/upgrade` ou `/planos?mode=upgrade`, THEN o sistema SHALL redirecionar o usuário diretamente para o dashboard (`/`), pois ele já está no plano máximo contratável neste fluxo.
- **Falta de Parâmetros na Rota de Upgrade:** WHEN a rota `/assinatura?mode=upgrade` for acessada sem os parâmetros `target` ou `period` definidos, THEN o sistema SHALL redirecionar o usuário para `/planos?mode=upgrade` exibindo um aviso amigável.
- **Perda de Sessão durante Seleção:** WHEN o usuário deslogar ou perder a sessão antes de finalizar o fluxo de pagamento do upgrade, THEN o sistema SHALL redirecionar ao login e SHALL NÃO salvar nenhuma alteração pendente no banco de dados.

---

## Requirement Traceability

Mapeamento de requisitos funcionais e de segurança com IDs específicos para controle de progresso.

| Requirement ID | Story / Descrição | Phase | Status |
| :--- | :--- | :--- | :--- |
| **UPG-01** | `/planos` aceita `mode=upgrade` para Básico Dono/Admin | Specify | Pending |
| **UPG-02** | `/upgrade` redireciona/reutiliza `/planos?mode=upgrade` | Specify | Pending |
| **UPG-03** | Seleção de Ultra Mensal/Anual com toggle no modo upgrade | Specify | Pending |
| **UPG-04** | Navegação para `/assinatura?mode=upgrade` com parâmetros corretos | Specify | Pending |
| **UPG-05** | Bloqueio de nova solicitação se houver upgrade pendente | Specify | Pending |
| **SUB-01** | Rota `/assinatura` aceita `mode=upgrade` sem redirecionar para `/` | Specify | Pending |
| **SUB-02** | Validação rígida de parâmetros (`target`, `period`) no upgrade | Specify | Pending |
| **SUB-03** | Confirmação de upgrade salva dados em `upgrade_requests` | Specify | Pending |
| **SUB-04** | CTA final abre WhatsApp Web no número `+55 17 992573141` | Specify | Pending |
| **SUB-05** | Confirmação de pagamento inicial/upgrade NUNCA autolibera | Specify | Pending |
| **ACC-01** | Bloqueio do módulo **Perdas** para o plano Básico | Specify | Pending |
| **ACC-02** | Redirecionamento de Dono Básico em Perdas para upgrade | Specify | Pending |
| **ACC-03** | Tela de bloqueio instrutiva para Vendedor/Produção Básico em Perdas | Specify | Pending |
| **ACC-04** | Ocultação/Bloqueio da aba Perdas no menu lateral e superior | Specify | Pending |
| **ACC-05** | Restrição de segurança server-side (RLS) para Perdas no Básico | Specify | Pending |
| **ACC-06** | Remoção de referências ao "Painel Master" do card Premium | Specify | Pending |
| **MST-01** | Abas organizadas no Master: Assinaturas, Upgrades e Preços | Specify | Pending |
| **MST-02** | Listagem detalhada de Upgrades pendentes/históricos no Master | Specify | Pending |
| **MST-03** | Aprovação e rejeição de upgrades com ajuste pro-rata no Master | Specify | Pending |

**Coverage:** 19 requisitos totais, 0 mapeados para tarefas físicas, 19 pendentes de design/tarefas. ⚠️

---

## Success Criteria

Como definiremos que a entrega foi bem-sucedida e correta:

- [ ] **Fluxo Funcional sem Loops:** O Dono/Admin do Básico consegue entrar na tela de planos (upgrade), escolher Ultra Anual, visualizar a tela de pagamento do PIX com resumo correto de upgrade e iniciar o WhatsApp, tudo sem sofrer redirecionamento abrupto de volta para o dashboard `/`.
- [ ] **Zero Liberação Automática:** O clique na confirmação do PIX (inicial ou upgrade) altera o status do banco para `payment_submitted` ou insere uma solicitação pendente, mas não dá acesso imediato nem altera o plano da conta no CRM de forma direta no frontend.
- [ ] **Bloqueio Completo de Perdas:** Um usuário Básico de nível comum (Vendedor/Produção) não consegue acessar os dados de Perdas de forma alguma, vendo uma tela clara de permissão negada, enquanto um Dono Básico é induzido diretamente para o upgrade.
- [ ] **Remoção de Propaganda Enganosa:** Nenhuma tela comercial exibe a promessa de acesso ao "Painel Master" para planos do CRM.
