# PLANO DE VOO — REFATORAÇÃO PAGE-DRIVEN DO CRM

> Guia de memória de contexto e execução. O Assistente de IA que receber este arquivo DEVE ler e adotar rigorosamente a metodologia descrita abaixo.

---

## 1. Visão Geral

Estamos modernizando um CRM com **+30 mil linhas de código**. O projeto foi construído inicialmente com "Páginas Raiz Monolíticas" — arquivos `.tsx` únicos com centenas/milhares de linhas — e componentes espalhados numa pasta global `src/components/`.

**MISSÃO:** Migrar para arquitetura **Page-Driven (Feature-Based)**, onde cada domínio da aplicação encapsula seus próprios componentes, hooks, services e types. O arquivo raiz de cada página deve ser apenas um *shell* de roteamento de tabs.

---

## 2. Arquitetura Alvo

```
src/
├── app/                          # (futuro) providers, router global
├── pages/
│   └── [NomeDaAba]/              # Ex: Financeiro/
│       ├── [NomeDaAba].tsx       # Shell: só tabs + HelpOverlay
│       ├── components/           # Modais, drawers, cards EXCLUSIVOS da aba
│       ├── sub-abas/             # Se houver tabs internas
│       │   └── [NomeSub]/
│       │       ├── [NomeSub].tsx
│       │       └── components/   # Componentes exclusivos da sub-aba
│       ├── hooks/                # Hooks específicos do domínio (useFinanceiro, etc.)
│       │   ⚠️ SEM index.ts — importe cada arquivo diretamente
│       ├── services/             # Funções de API/Supabase isoladas
│       └── types/                # Interfaces e types locais
│
├── shared/                       # Componentes reutilizáveis ENTRE VÁRIAS abas
│   ├── components/               # StatsCard, PullToRefresh, DownloadedPDFsTab, etc.
│   ├── hooks/                    # use-mobile, use-toast, usePlanGate, etc.
│   ├── services/                 # Funções utilitárias de API compartilhadas
│   ├── types/                    # Types globais do sistema
│   └── constants/                # Constantes globais
│
├── components/ui/                # Design system primitivo (shadcn) — NÃO MOVER
├── integrations/                 # Supabase client, etc. — NÃO MOVER
└── lib/                          # Utilitários puros (formatadores, calculadores)
```

### Referência de Sucesso: `Vendas/`
```
pages/Vendas/
├── Vendas.tsx              ← Shell (79 linhas): tabs + HelpOverlay
├── components/             ← 17 componentes exclusivos
│   ├── NewSaleModal.tsx
│   ├── EditSaleModal.tsx
│   ├── SaleDetailsModal.tsx
│   └── ...
└── sub-abas/
    ├── Principal/Principal.tsx
    └── Lixeira/Lixeira.tsx
```

---

## 3. Metodologia de Migração ("Caminho Feliz")

### Passo 1 — Preparação de Terreno
1. Identifique o arquivo monolítico em `src/pages/` (Ex: `Financeiro.tsx`).
2. Crie a pasta `src/pages/Financeiro/`.
3. Mova o arquivo raiz → `src/pages/Financeiro/Financeiro.tsx`.
4. Atualize o import no `App.tsx` para o novo caminho direto:
   ```ts
   import Financeiro from "./pages/Financeiro/Financeiro";
   ```
   > ⚠️ **NÃO crie `index.ts` de barrel.** Barrel exports prejudicam o tree-shaking do Vite e podem causar problemas de performance. Importe sempre o arquivo diretamente.

### Passo 2 — Migração de Componentes
1. Identifique os componentes exclusivos em `src/components/[dominio]/`.
2. Crie `src/pages/Financeiro/components/` e mova todos para lá.
3. **Busca Global obrigatória:** `grep` no projeto inteiro por cada componente movido para atualizar TODOS os imports.
4. Se um componente é usado por **2+ abas diferentes**, mova para `src/shared/components/` em vez da pasta da aba.

### Passo 3 — Co-locação de Hooks, Services e Types
1. Se existem hooks em `src/hooks/` que são usados **APENAS** por esta aba, mova para `src/pages/Financeiro/hooks/`.
2. Se existem funções de API em `src/lib/` que servem **APENAS** esta aba, mova para `src/pages/Financeiro/services/`.
3. Types/interfaces específicos do domínio → `src/pages/Financeiro/types/`.

### Passo 4 — Quebra do Monolito (se houver sub-abas)
Se a página principal possuir `<Tabs>` e mais de **400 linhas**:
1. Crie `src/pages/Financeiro/sub-abas/`.
2. Extraia cada `<TabsContent>` para componente auto-contido: `sub-abas/VisaoGeral/VisaoGeral.tsx`.
3. Esses componentes absorvem seus próprios estados, chamadas de API e handlers.
4. O arquivo raiz vira apenas estado de tabs + `<HelpOverlay>` (veja Vendas.tsx como modelo de ~79 linhas).

### Passo 5 — Validação Obrigatória
1. Rode `npm run build` — é o teste definitivo.
2. Se quebrar, analise o output e conserte os imports.
3. Teste visual no localhost antes de commitar.

---

## 4. Regras Áureas — Prevenção de Tela Branca

> ⚠️ As primeiras refatorações causaram crash em cascata (tela branca) por importações relativas órfãs.

### 4.1 — Imports Absolutos Sempre
```ts
// ✅ CORRETO
import MeuModal from "@/pages/Financeiro/components/MeuModal";

// ❌ PROIBIDO
import MeuModal from "../../Financeiro/components/MeuModal";
```

### 4.2 — Busca e Substituição Global
Ao mover qualquer componente, faça grep global do caminho antigo:
```bash
grep -r "components/financeiro/MeuModal" src/
```
Substitua TODOS os resultados pelo novo caminho.

### 4.3 — Cross-Dependencies
- Se a aba X importa componente da aba Y → o componente provavelmente pertence ao `shared/`.
- Nunca importe direto dos internos de outra feature. Se é compartilhado, sobe para `shared/`.

### 4.4 — Sem Barrel Exports
> **NÃO crie `index.ts`** de reexportação nas pastas de features, components ou sub-abas.
> Barrels prejudicam o tree-shaking do Vite, podem causar bundles maiores e imports circulares.
> Importe sempre o arquivo diretamente pelo caminho completo.

### 4.5 — Build é Lei
- `npx tsc --noEmit` **NÃO pega** todos os erros de resolve do Vite.
- O protocolo de validação final é **SEMPRE**: `npm run build`.

---

## 5. Regra do shared/

Um componente vai para `shared/` **se e somente se**:
- É usado por **2 ou mais** features/páginas diferentes, OU
- É parte do design system da aplicação (StatsCard, PullToRefresh, etc.)

**Se um componente é usado só por uma aba → ele fica DENTRO daquela aba.**

---

## 6. Inventário e Prioridade de Migração

### Legenda
- ✅ Migrado | 🔴 Crítico (>30KB) | 🟡 Médio (10-30KB) | 🟢 Leve (<10KB)

### Prioridade 1 — Mega-Monolitos (>40KB)
| # | Página | Tamanho | Componentes em `src/components/` | Status |
|---|--------|---------|----------------------------------|--------|
| 1 | `Contas.tsx` | 85KB | `contas/` (2 arquivos) | ⬜ Pendente |
| 2 | `Financeiro.tsx` | 42KB | `financeiro/` (13 arquivos) | ⬜ Pendente |

### Prioridade 2 — Monolitos Grandes (15-40KB)
| # | Página | Tamanho | Componentes em `src/components/` | Status |
|---|--------|---------|----------------------------------|--------|
| 3 | `Espaco.tsx` | 33KB | `espaco/` (10 arquivos) | ⬜ Pendente |
| 4 | `Estoque.tsx` | 30KB | `estoque/` (11 arquivos) | ⬜ Pendente |
| 5 | `MaterialLosses.tsx` | 29KB | `material-losses/` (2 arquivos) | ✅ Migrado |
| 6 | `Garantias.tsx` | 27KB | `garantias/` (6 arquivos) | ⬜ Pendente |
| 7 | `Clientes.tsx` | 26KB | `clientes/` (4 arquivos) | ⬜ Pendente |
| 8 | `TeamRequests.tsx` | 21KB | `team/` (2 arquivos) | ⬜ Pendente |
| 9 | `Subscription.tsx` | 17KB | — | ⬜ Pendente |
| 10 | `CompanySetup.tsx` | 16KB | `empresa/` (2 arquivos) | ⬜ Pendente |
| 11 | `CompanyJoin.tsx` | 15KB | — | ⬜ Pendente |
| 12 | `PlanSelection.tsx` | 15KB | — | ⬜ Pendente |

### Prioridade 3 — Páginas Médias (6-15KB)
| # | Página | Tamanho | Componentes em `src/components/` | Status |
|---|--------|---------|----------------------------------|--------|
| 13 | `Login.tsx` | 12KB | `auth/` (2 arquivos) | ⬜ Pendente |
| 14 | `ResetPassword.tsx` | 11KB | — | ⬜ Pendente |
| 15 | `Funcionarios.tsx` | 11KB | `funcionarios/` (1 arquivo) | ✅ Migrado |
| 16 | `Upgrade.tsx` | 10KB | — | ⬜ Pendente |
| 17 | `SignUp.tsx` | 9.8KB | — | ⬜ Pendente |
| 18 | `Perfil.tsx` | 9.6KB | `perfil/` (2 arquivos) | ✅ Migrado |
| 19 | `Empresa.tsx` | 9.4KB | — | ✅ Migrado |
| 20 | `Master.tsx` | 8.5KB | `master/` (4 arquivos) | ✅ Migrado |
| 21 | `Admin.tsx` | 8KB | `admin/` (2 arquivos) | ⬜ Pendente |
| 22 | `Compras.tsx` | 7.9KB | `compras/` (10 arquivos) | ⬜ Pendente |
| 23 | `Comissoes.tsx` | 7KB | `comissoes/` (4 arquivos) | ⬜ Pendente |
| 24 | `Relatorios.tsx` | 7.3KB | `relatorios/` (1 arquivo) | ⬜ Pendente |

### Prioridade 4 — Páginas Leves / Já Simples
| # | Página | Tamanho | Status |
|---|--------|---------|--------|
| 25 | `ForgotPassword.tsx` | 6KB | ⬜ Avaliar necessidade |
| 26 | `WaitingApproval.tsx` | 5KB | ⬜ Avaliar necessidade |
| 27 | `Servicos.tsx` | 3.4KB | ⬜ Avaliar necessidade |
| 28 | `NotFound.tsx` | 2.1KB | ✅ Não precisa migrar |

### ✅ Já Migrados
| Página | Tamanho Shell | Status |
|--------|---------------|--------|
| `Painel/Painel.tsx` | 26KB (parcial — falta sub-abas) | ✅ Migrado (pasta criada + components) |
| `Vendas/Vendas.tsx` | 3.4KB (79 linhas) | ✅ 100% Migrado (referência ouro) |

---

## 7. Checklist de Migração por Aba

Use este template para cada aba que for migrar:

```markdown
### Aba: [NomeDaAba]
- [ ] Criar pasta `src/pages/[NomeDaAba]/`
- [ ] Mover arquivo raiz para dentro da pasta
- [ ] Atualizar import direto no `App.tsx` (sem barrel/index.ts)
- [ ] Criar `components/` e mover componentes exclusivos de `src/components/[dominio]/`
- [ ] Grep global: atualizar TODOS os imports antigos
- [ ] Identificar componentes cross-aba → mover para `shared/`
- [ ] Co-locar hooks específicos em `hooks/` (se houver)
- [ ] Co-locar services/API em `services/` (se houver)
- [ ] Co-locar types em `types/` (se houver)
- [ ] Extrair sub-abas para `sub-abas/` (se >400 linhas com Tabs)
- [ ] `npm run build` — sem erros
- [ ] Teste visual no localhost
- [ ] Commit isolado com mensagem descritiva
```

---

## 8. Plano de Migração do `shared/`

### Componentes que já são candidatos a `shared/`:
- `DownloadedPDFsTab` — usado por Vendas, potencialmente por Compras
- `DownloadedExcelsTab` — idem
- `PullToRefresh` — usado globalmente
- `StatsCard` — usado por várias abas
- `HelpOverlay` — usado por todas as abas
- `NavLink` — usado pelo layout
- `PlaceholderPage` — usado pelo layout

### Hooks globais (mantém em `shared/hooks/`):
- `use-mobile`, `use-toast`, `use-pwa-install`, `use-pwa-update`, `usePlanGate`

### Hooks de domínio específico (migrar para aba correspondente):
- `useMaterialLosses` → `pages/MaterialLosses/hooks/`
- `useMaterialLossLimits` → `pages/MaterialLosses/hooks/`

### Libs que permanecem globais:
- `utils.ts`, `logger.ts`, `passwordSecurity.ts`, `uploadValidator.ts`
- `brazilCalendar.ts`, `database.types.ts`

### Libs candidatas a co-locação:
- `purchaseService.ts` → `pages/Compras/services/`
- `stockConsumption.ts` → `pages/Estoque/services/`
- `stockHistory.ts` → `pages/Estoque/services/`
- `financialTransactions.ts` → `pages/Financeiro/services/`
- `cac.ts` → `pages/Financeiro/services/`
- `cardMachineFees.ts` → `pages/Financeiro/services/`
- `pdfGenerator.ts` → `shared/services/` (usado por múltiplas abas)
- `pdfStorage.ts` → `shared/services/`
- `excelStorage.ts` → `shared/services/`
- `mockData.ts`, `mockReportData.ts` → `src/test/` ou remover em produção

---

## 9. Anti-Patterns — O que NÃO Fazer

| ❌ Anti-Pattern | ✅ Correto |
|---|---|
| Pasta `components/` global crescendo infinitamente | Feature encapsula seus componentes |
| Import relativo com `../../..` | Sempre usar `@/pages/...` |
| Hook de domínio em pasta global `hooks/` | Co-locar no `hooks/` da feature |
| Arquivo de página com 500+ linhas | Extrair sub-abas e componentes |
| Componente usado por 1 aba morando no `shared/` | Mover para dentro da aba |
| Mover sem grep global | Sempre buscar referências antes |
| Commitar sem `npm run build` | Build é obrigatório |
| Refatorar múltiplas abas num commit | Um commit por aba migrada |

---

## 10. Ordem de Execução Recomendada

A sugestão é migrar das **mais críticas para as menos**, intercalando com validação:

1. **Contas** (85KB — maior monolito do sistema)
2. **Financeiro** (42KB — muitos componentes)
3. **Espaco** (33KB — muitos componentes)
4. **Estoque** (30KB)
5. **MaterialLosses** (29KB)
6. **Garantias** (27KB)
7. **Clientes** (26KB)
8. **Compras** (7.9KB mas com 10 componentes)
9. Demais abas em lotes por prioridade

**Após cada migração:** build + teste visual + commit isolado.

---

## 11. Meta Final

Quando todas as abas estiverem migradas:

```
src/
├── pages/          ← Cada aba é uma feature auto-contida
├── shared/         ← Apenas componentes REALMENTE compartilhados
├── components/ui/  ← Design system primitivo (shadcn)
├── integrations/   ← Supabase client
├── lib/            ← Utilitários puros globais
└── App.tsx         ← Router puro
```

- Zero arquivos de componente na pasta `src/components/` (exceto `ui/`, `layout/`, `help/`)
- Cada page folder com <100 linhas no arquivo raiz
- Imports 100% absolutos
- Build limpo sem warnings
