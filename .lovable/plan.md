
# Plano: Correções na Navegação e HelpOverlay

## Resumo das Alterações

Duas correções solicitadas:
1. **TopNavigation**: Ajustar para que as abas fiquem em uma barra horizontal contínua igual à imagem de referência
2. **HelpOverlay**: Adicionar janelas de ajuda nas abas que estão faltando

---

## Item 1: Navegação Horizontal (Estilo da Imagem)

### Análise da Imagem de Referência

A imagem mostra uma barra de navegação com:
- Logo à esquerda
- Todas as abas em uma linha horizontal única
- Rolagem horizontal quando necessário (scroll)
- Sem dropdown para o menu principal

### Modificações no `TopNavigation.tsx`

O componente atual já está bem estruturado, mas preciso garantir que:
1. As abas apareçam em uma linha única horizontalmente
2. Tenha rolagem horizontal no desktop quando exceder o espaço
3. O estilo seja similar ao da imagem de referência

```tsx
// Alterar a nav para ter scroll horizontal
<nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
  {filteredItems.map(item => (
    <NavLink key={item.path} item={item} />
  ))}
</nav>
```

Adicionar estilos CSS para esconder scrollbar mas manter funcionalidade.

---

## Item 2: Adicionar HelpOverlay nas Páginas que Faltam

### Páginas que Precisam de HelpOverlay

| Página | Status | Ação |
|--------|--------|------|
| Vendas | Tem import, mas não renderiza | Adicionar `<HelpOverlay />` no JSX |
| Espaço | Tem import, mas não renderiza | Adicionar `<HelpOverlay />` no JSX |
| Financeiro | Tem import, mas não renderiza | Adicionar `<HelpOverlay />` no JSX |
| Contas | Não tem | Adicionar import e componente |
| Clientes | Verificar | - |
| Relatórios | Não tem | Adicionar import e componente |
| Garantias | Não tem | Adicionar import e componente |
| Solicitações | Não tem | Adicionar import e componente |
| Empresa | Não tem | Adicionar import e componente |
| Perfil | Não tem | Adicionar import e componente |

### Conteúdo de Ajuda por Página

**Vendas (`src/pages/Vendas.tsx`)**:
```tsx
<HelpOverlay
  tabId="vendas"
  title="Gestão de Vendas"
  description="Aqui você acompanha todas as vendas realizadas pela empresa em formato de calendário ou lista."
  steps={[
    { title: "Nova Venda", description: "Clique no botão para registrar uma nova venda com cliente, veículo e serviços" },
    { title: "Calendário", description: "Visualize as vendas por dia no calendário mensal" },
    { title: "Ver Gráficos", description: "Analise o desempenho de vendas com gráficos detalhados" },
  ]}
/>
```

**Espaço (`src/pages/Espaco.tsx`)**:
```tsx
<HelpOverlay
  tabId="espaco"
  title="Gestão de Vagas"
  description="Gerencie a ocupação das vagas do seu estabelecimento e acompanhe os veículos."
  steps={[
    { title: "Preencher Vaga", description: "Registre a entrada de um veículo com cliente e serviços" },
    { title: "Vagas Ativas", description: "Veja os veículos atualmente ocupando vagas" },
    { title: "Veículos Pagos", description: "Consulte o histórico de veículos que já saíram e pagaram" },
  ]}
/>
```

**Financeiro (`src/pages/Financeiro.tsx`)**:
```tsx
<HelpOverlay
  tabId="financeiro"
  title="Visão Financeira"
  description="Acompanhe o fluxo de caixa da empresa com entradas, saídas e evolução do saldo."
  steps={[
    { title: "Adicionar", description: "Registre entradas, saídas, transferências e novas contas" },
    { title: "Gráficos", description: "Visualize a evolução do saldo nos últimos 7 dias" },
    { title: "Minhas Contas", description: "Veja o saldo de cada conta cadastrada" },
  ]}
/>
```

**Contas (`src/pages/Contas.tsx`)**:
```tsx
<HelpOverlay
  tabId="contas"
  title="Detalhes das Contas"
  description="Visualize o extrato detalhado de cada conta bancária ou carteira."
  steps={[
    { title: "Selecionar Conta", description: "Clique em uma conta na barra lateral para ver detalhes" },
    { title: "Gráficos", description: "Analise formas de pagamento e categorias de gastos" },
    { title: "Extrato", description: "Veja todas as transações da conta selecionada" },
  ]}
/>
```

**Relatórios (`src/pages/Relatorios.tsx`)**:
```tsx
<HelpOverlay
  tabId="relatorios"
  title="Relatórios"
  description="Gere relatórios detalhados do seu negócio para análise e tomada de decisão."
  steps={[
    { title: "Escolher Relatório", description: "Selecione o tipo de relatório que deseja gerar" },
    { title: "Configurar", description: "Defina o período e filtros desejados" },
    { title: "Exportar", description: "Baixe o relatório em PDF ou Excel" },
  ]}
/>
```

**Garantias (`src/pages/Garantias.tsx`)**:
```tsx
<HelpOverlay
  tabId="garantias"
  title="Gestão de Garantias"
  description="Gerencie certificados de garantia emitidos para seus clientes."
  steps={[
    { title: "Emitir Garantia", description: "Crie um novo certificado de garantia para um serviço" },
    { title: "Criar Modelo", description: "Configure modelos de garantia com validade e termos" },
    { title: "Enviar", description: "Envie o certificado por email ou baixe o PDF" },
  ]}
/>
```

**Solicitações (`src/pages/TeamRequests.tsx`)**:
```tsx
<HelpOverlay
  tabId="solicitacoes"
  title="Solicitações de Acesso"
  description="Gerencie as solicitações de pessoas que querem entrar na sua equipe."
  steps={[
    { title: "Aprovar", description: "Aceite colaboradores para acessar o sistema" },
    { title: "Rejeitar", description: "Recuse solicitações informando o motivo" },
    { title: "Desvincular", description: "Remova membros que já não fazem parte da equipe" },
  ]}
/>
```

**Empresa (`src/pages/Empresa.tsx`)**:
```tsx
<HelpOverlay
  tabId="empresa"
  title="Dados da Empresa"
  description="Configure as informações da sua empresa que aparecem em documentos e garantias."
  steps={[
    { title: "Logo", description: "Clique na área da logo para fazer upload da imagem" },
    { title: "Editar Dados", description: "Atualize nome, CNPJ, telefone e endereço" },
    { title: "Código da Equipe", description: "Compartilhe o código para colaboradores entrarem" },
  ]}
/>
```

**Perfil (`src/pages/Perfil.tsx`)**:
```tsx
<HelpOverlay
  tabId="perfil"
  title="Meu Perfil"
  description="Gerencie suas informações pessoais e preferências de acesso."
  steps={[
    { title: "Editar", description: "Atualize seu nome e foto de perfil" },
    { title: "Senha", description: "Altere sua senha de acesso" },
    { title: "Assinatura", description: "Veja os dias restantes do seu plano" },
  ]}
/>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/TopNavigation.tsx` | Adicionar classe para scroll horizontal suave |
| `src/index.css` | Adicionar classe `.scrollbar-hide` para esconder scrollbar |
| `src/pages/Vendas.tsx` | Adicionar `<HelpOverlay />` no JSX (já tem import) |
| `src/pages/Espaco.tsx` | Adicionar `<HelpOverlay />` no JSX (já tem import) |
| `src/pages/Financeiro.tsx` | Adicionar `<HelpOverlay />` no JSX (já tem import) |
| `src/pages/Contas.tsx` | Adicionar import e `<HelpOverlay />` |
| `src/pages/Relatorios.tsx` | Adicionar import e `<HelpOverlay />` |
| `src/pages/Garantias.tsx` | Adicionar import e `<HelpOverlay />` |
| `src/pages/TeamRequests.tsx` | Adicionar import e `<HelpOverlay />` |
| `src/pages/Empresa.tsx` | Adicionar import e `<HelpOverlay />` |
| `src/pages/Perfil.tsx` | Adicionar import e `<HelpOverlay />` |

---

## Ordem de Implementação

1. **Primeiro**: Ajustar CSS e TopNavigation para navegação horizontal correta
2. **Segundo**: Adicionar HelpOverlay em todas as páginas listadas

Total de arquivos: 11 modificações
