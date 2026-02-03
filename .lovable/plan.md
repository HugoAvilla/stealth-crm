
# Plano: Integração Completa entre Módulos e Correções de Funcionalidade

## Resumo

Este plano aborda múltiplas integrações entre os módulos do sistema, correções de funcionalidade nos botões de Contas, adição de funcionalidade de desvinculação na aba Solicitações, botões de voltar em páginas "aprisionadoras", e aprovação em tempo real via Supabase Realtime.

---

## 1. Correção da Aba Contas - Integração com Banco de Dados

### Problema Identificado
A aba Contas (`src/pages/Contas.tsx`) usa dados mock importados de `@/lib/mockData` em vez de dados reais do Supabase. Os botões de criar/editar conta manipulam apenas o estado local, não persistindo no banco.

### Solução
Refatorar `Contas.tsx` para:
- Buscar contas reais da tabela `accounts` via Supabase
- Buscar transações reais da tabela `transactions`
- Buscar categorias reais da tabela `categories`
- Atualizar `EditAccountModal` para salvar no banco de dados
- Calcular gráficos de formas de pagamento e saídas por categoria com dados reais

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Contas.tsx` | Trocar mock por queries Supabase |
| `src/components/contas/EditAccountModal.tsx` | Integrar com Supabase para editar/excluir |

---

## 2. Correção da Aba Financeiro - Modais de Transação e Transferência

### Problema Identificado
Os modais `AddTransactionModal` e `AddTransferModal` usam dados mock e apenas exibem toast de sucesso, sem salvar no banco.

### Solução
- `AddTransactionModal`: Buscar contas e categorias do Supabase, salvar transação na tabela `transactions`
- `AddTransferModal`: Buscar contas do Supabase, criar registro na tabela `transfers`

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/components/financeiro/AddTransactionModal.tsx` | Integrar com Supabase |
| `src/components/financeiro/AddTransferModal.tsx` | Integrar com Supabase |

---

## 3. Integração Vendas → Financeiro/Contas

### Situação Atual
A função `createTransactionFromSale` em `src/lib/stockConsumption.ts` já cria uma transação automaticamente quando uma venda é fechada. Esta integração já existe.

### Melhorias Necessárias
- Garantir que a transação criada inclua `category_id` (categoria "Venda de Serviços")
- Atualizar o saldo da conta em tempo real após a transação

---

## 4. Integração Módulos → Relatórios

### Problema Identificado
O modal `ReportConfigModal` gera PDFs com dados mock vazios. Precisa buscar dados reais do Supabase.

### Relatórios a Integrar
| Relatório | Fonte de Dados |
|-----------|----------------|
| DFC (Fluxo de Caixa) | `transactions` por período |
| DRE (Resultado) | `transactions` (entradas - saídas) |
| Vendas por Período | `sales` com joins |
| Vendas por Serviço | `sale_items` + `services` |
| Vendas por Vendedor | `sales` + `profiles` |
| Clientes Ativos | `clients` com vendas nos últimos 90 dias |
| Clientes Inativos | `clients` sem vendas há 90+ dias |
| Ocupação de Vagas | `spaces` com histórico |
| Movimentação de Estoque | `stock_movements` |
| Extrato de Conta | `transactions` por conta |

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/components/relatorios/ReportConfigModal.tsx` | Implementar queries específicas para cada relatório |

---

## 5. Botão de Desvinculação na Aba Solicitações (TeamRequests)

### Funcionalidade
Adicionar botão "Desvincular" nos cards de membros aprovados para remover o perfil da empresa.

### Implementação
- Novo botão ao lado de "Aprovado" no histórico
- Função RPC ou UPDATE direto para:
  - Limpar `company_id` do profile
  - Atualizar role para `NENHUM`
  - Opcional: criar registro de desvinculação

### Arquivo a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/TeamRequests.tsx` | Adicionar botão e função de desvincular |

---

## 6. Botões de Voltar em Páginas "Aprisionadoras"

### Páginas que Precisam de Botão Voltar
| Página | Situação Atual | Solução |
|--------|----------------|---------|
| `WaitingApproval.tsx` | Já tem botão "Voltar para login" | OK |
| `CompanyJoin.tsx` | Tem botão para "Criar Empresa" | Adicionar botão voltar ao login |
| `PendingApprovalModal.tsx` | Só tem "Sair" | OK (é modal de bloqueio proposital) |
| `Subscription.tsx` | Verificar | Adicionar se necessário |

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/CompanyJoin.tsx` | Adicionar botão "Voltar" mais claro |
| Todas as páginas principais | MainLayout já permite navegação |

---

## 7. Aprovação em Tempo Real via Supabase Realtime

### Funcionalidade
Quando o admin aprovar uma solicitação, o usuário aguardando deve ser redirecionado imediatamente sem precisar atualizar a página.

### Implementação
No `CompanyJoin.tsx` (tela de aguardando aprovação):

```typescript
useEffect(() => {
  if (!user?.id) return;
  
  // Subscribe to realtime changes on company_join_requests
  const channel = supabase
    .channel('join-request-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_join_requests',
        filter: `requester_user_id=eq.${user.id}`,
      },
      async (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === 'approved') {
          await refreshUser();
          navigate('/');
        } else if (newStatus === 'rejected') {
          toast({ title: 'Solicitação rejeitada', variant: 'destructive' });
          setPendingRequest(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/CompanyJoin.tsx` | Adicionar subscription Realtime |

---

## Diagrama de Integrações

```text
                    ┌─────────────────┐
                    │     VENDAS      │
                    │    (sales)      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
  │   FINANCEIRO  │  │    ESPAÇO     │  │   ESTOQUE     │
  │ (transactions)│  │   (spaces)    │  │  (materials)  │
  └───────────────┘  └───────────────┘  └───────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   RELATÓRIOS    │
                    │   (PDF output)  │
                    └─────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
            ┌─────────────┐   ┌─────────────┐
            │    CONTAS   │   │  CLIENTES   │
            │  (accounts) │   │  (clients)  │
            └─────────────┘   └─────────────┘
```

---

## Ordem de Implementação

1. **Fase 1 - Contas (Urgente)**
   - Refatorar `Contas.tsx` para usar Supabase
   - Corrigir `EditAccountModal.tsx` para salvar no banco

2. **Fase 2 - Financeiro**
   - Corrigir `AddTransactionModal.tsx`
   - Corrigir `AddTransferModal.tsx`

3. **Fase 3 - Relatórios**
   - Implementar queries em `ReportConfigModal.tsx`

4. **Fase 4 - TeamRequests**
   - Adicionar botão e função de desvincular

5. **Fase 5 - Realtime + UX**
   - Implementar Supabase Realtime no `CompanyJoin.tsx`
   - Revisar botões de voltar

---

## Detalhes Técnicos

### Query para Gráfico de Formas de Pagamento (Contas)
```typescript
const { data } = await supabase
  .from('transactions')
  .select('payment_method, amount')
  .eq('company_id', companyId)
  .eq('account_id', selectedAccountId)
  .eq('type', 'Entrada');

const paymentData = data?.reduce((acc, tx) => {
  const method = tx.payment_method || 'Outros';
  acc[method] = (acc[method] || 0) + tx.amount;
  return acc;
}, {});
```

### Query para Relatório de Vendas por Período
```typescript
const { data } = await supabase
  .from('sales')
  .select(`
    *,
    client:clients(name, phone),
    vehicle:vehicles(brand, model, plate),
    sale_items(total_price, service:services(name))
  `)
  .eq('company_id', companyId)
  .gte('sale_date', startDate)
  .lte('sale_date', endDate)
  .order('sale_date', { ascending: false });
```

### Função de Desvincular Membro
```typescript
const handleUnlinkMember = async (userId: string) => {
  // Remove company_id from profile
  await supabase
    .from('profiles')
    .update({ company_id: null })
    .eq('user_id', userId);

  // Set role to NENHUM
  await supabase
    .from('user_roles')
    .update({ role: 'NENHUM' })
    .eq('user_id', userId);

  toast({ title: 'Membro desvinculado com sucesso' });
  fetchData();
};
```

---

## Resumo das Alterações por Arquivo

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/pages/Contas.tsx` | Refatoração | Trocar mock por Supabase |
| `src/components/contas/EditAccountModal.tsx` | Refatoração | Salvar edições no banco |
| `src/components/financeiro/AddTransactionModal.tsx` | Refatoração | Buscar contas/categorias e salvar transação |
| `src/components/financeiro/AddTransferModal.tsx` | Refatoração | Buscar contas e criar transferência |
| `src/components/relatorios/ReportConfigModal.tsx` | Melhoria | Queries específicas por relatório |
| `src/pages/TeamRequests.tsx` | Funcionalidade | Botão desvincular membro |
| `src/pages/CompanyJoin.tsx` | Funcionalidade | Realtime + melhor botão voltar |
