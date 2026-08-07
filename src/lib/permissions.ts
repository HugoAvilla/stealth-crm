// Catálogo único de permissões de funcionário.
// Fonte de verdade compartilhada entre: o formulário de funcionários,
// o enforcement (hook usePermissions / TopNavigation / rotas / botões) e a
// documentação das políticas RLS no backend.
//
// Chave de permissão = `${moduleId}_${actionId}` (ex.: "vendas_delete").
// `locked_modules` no perfil guarda as chaves BLOQUEADAS (deny-list).

export interface PermissionAction {
    id: string;
    label: string;
}

export interface PermissionModule {
    id: string;
    label: string;
    actions: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
    {
        id: "painel", label: "Aba Painel (Dashboard)", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "preencher_vagas", label: "Preencher vaga" },
            { id: "add_cliente", label: "Adicionar novo cliente" },
            { id: "ver_financeiro", label: "Ver financeiro completo" },
            { id: "editar_meta", label: "Editar meta do mês" },
        ]
    },
    {
        id: "vendas", label: "Aba Vendas", actions: [
            { id: "view_numeros", label: "Ver números de venda" },
            { id: "add", label: "Adicionar venda" },
            { id: "edit", label: "Editar venda" },
            { id: "delete", label: "Excluir venda" },
            { id: "emitir_garantia", label: "Emitir garantia" },
            { id: "imprimir", label: "Imprimir notinha" },
            { id: "enviar_wpp", label: "Enviar mensagem no WhatsApp" },
            { id: "ver_pdf", label: "Ver sub-aba PDFs baixados" },
            { id: "ver_lixeira", label: "Ver sub-aba de lixeira" },
        ]
    },
    {
        id: "espaco", label: "Aba Espaço", actions: [
            { id: "add", label: "Adicionar vaga" },
            { id: "edit", label: "Editar vaga" },
            { id: "delete", label: "Excluir vaga" },
            { id: "concluir_vaga", label: "Concluir vaga e liberar espaço" },
            { id: "exportar_venda", label: "Exportar venda" },
            { id: "enviar_msg", label: "Enviar mensagem de entrada/saída" },
            { id: "baixar_pdf", label: "Baixar PDF" },
            { id: "configurar_total", label: "Configurar total de vagas" },
            { id: "alterar_limite", label: "Alterar limite de vagas" },
            { id: "ver_pagos", label: "Ver sub-aba Veículos Pagos" },
            { id: "ver_nao_pagos", label: "Ver sub-aba Veículos Não Pagos" },
            { id: "ver_pdf", label: "Ver sub-aba PDFs Baixados" },
            { id: "ver_lixeira", label: "Ver sub-aba de Lixeira" },
        ]
    },
    {
        id: "financeiro", label: "Aba Financeiro", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add_entrada", label: "Adicionar entrada" },
            { id: "add_saida", label: "Adicionar saída" },
            { id: "transferencia", label: "Fazer transferência" },
            { id: "add_conta", label: "Adicionar conta" },
            { id: "add_categoria", label: "Adicionar categoria" },
            { id: "gerenciar_categoria", label: "Gerenciar categoria" },
            { id: "ver_cac", label: "Visualizar aba de CAC" },
            { id: "add_gasto_ads", label: "Adicionar gastos por ADS" },
            { id: "add_gasto_vendedor", label: "Adicionar gastos por Vendedor" },
        ]
    },
    {
        id: "compras", label: "Aba Compras", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add", label: "Adicionar compra" },
            { id: "edit", label: "Editar compra" },
            { id: "delete", label: "Excluir compra" },
            { id: "add_fornecedor", label: "Adicionar fornecedor" },
        ]
    },
    {
        id: "contas", label: "Aba Contas", actions: [
            { id: "visualizar_numeros", label: "Visualizar números" },
            { id: "add_entrada", label: "Adicionar entrada" },
            { id: "add_saida", label: "Adicionar saída" },
            { id: "transferencia", label: "Fazer transferência" },
            { id: "add_conta", label: "Adicionar conta" },
            { id: "add_categoria", label: "Adicionar categoria" },
            { id: "gerenciar_categoria", label: "Gerenciar categoria" },
            { id: "ver_maquininha", label: "Visualizar aba de Maquininha" },
            { id: "add_maquininha", label: "Adicionar nova maquininha" },
            { id: "edit_maquininha", label: "Editar maquininha" },
            { id: "delete_maquininha", label: "Excluir maquininha" },
            { id: "marcar_paga", label: "Marcar venda como paga" },
            { id: "reverter_maquininha", label: "Reverter venda das maquininhas" },
            { id: "ver_boletos", label: "Visualizar aba de Boletos" },
            { id: "pagar_boleto", label: "Fazer pagamento de boletos" },
            { id: "reverter_boleto", label: "Reverter pagamento de boletos" },
        ]
    },
    {
        id: "clientes", label: "Aba Clientes", actions: [
            { id: "add", label: "Adicionar novo cliente" },
            { id: "add_veiculo", label: "Adicionar veículo" },
            { id: "edit", label: "Editar cliente" },
            { id: "delete", label: "Excluir cliente" },
            { id: "criar_venda", label: "Criar nova venda com cliente" },
            { id: "criar_vaga", label: "Criar nova vaga com cliente" },
            { id: "enviar_wpp", label: "Enviar mensagem WhatsApp do cliente" },
        ]
    },
    {
        id: "relatorios", label: "Aba Relatórios", actions: [
            { id: "dfc", label: "DFC - Demonstração de Fluxo de Caixa" },
            { id: "saidas_fin", label: "Saídas Financeiro (Pagos e Pendentes)" },
            { id: "dre", label: "DRE - Demonstração de Resultado" },
            { id: "extrato", label: "Extrato de Conta" },
            { id: "vendas_periodo", label: "Vendas por Período (Fechadas)" },
            { id: "vendas_servico", label: "Vendas por Serviço" },
            { id: "vendas_vendedor", label: "Vendas por Vendedor" },
            { id: "vendas_pelicula", label: "Vendas por Película" },
            { id: "clientes_ativos", label: "Clientes Ativos" },
            { id: "clientes_inativos", label: "Clientes Inativos" },
            { id: "marketing", label: "Lista de Marketing" },
            { id: "backup", label: "Lista Completa (Backup)" },
            { id: "ocupacao", label: "Ocupação de Vagas" },
            { id: "mov_estoque", label: "Movimentação de Estoque" },
            { id: "perdas_mat", label: "Perdas de Material" },
        ]
    },
    {
        id: "comissoes", label: "Aba Comissões", actions: [
            { id: "view", label: "Visualizar aba de comissões" },
            { id: "add", label: "Adicionar novo comissionado" },
            { id: "edit", label: "Editar comissionado" },
            { id: "delete", label: "Excluir comissionado" },
        ]
    },
    {
        id: "garantias", label: "Aba Garantias", actions: [
            { id: "view", label: "Visualizar aba de garantia" },
            { id: "add", label: "Criar uma nova garantia" },
            { id: "edit", label: "Editar garantia" },
            { id: "delete", label: "Excluir garantia" },
            { id: "emitir", label: "Emitir garantia" },
            { id: "ver_pdf", label: "Visualizar PDFs baixados" },
        ]
    },
    {
        id: "servicos", label: "Aba Serviços", actions: [
            { id: "view", label: "Visualizar aba de serviços" },
            { id: "add", label: "Adicionar novo serviço" },
            { id: "edit", label: "Editar serviços" },
            { id: "delete", label: "Excluir serviços" },
            { id: "ver_regras", label: "Visualizar aba regras de consumo" },
            { id: "regras_consumo", label: "Alterar regras de consumo" },
        ]
    },
    {
        id: "estoque", label: "Aba Estoque", actions: [
            { id: "view", label: "Visualizar aba de Estoque" },
            { id: "add", label: "Adicionar novo material" },
            { id: "edit", label: "Editar material" },
            { id: "delete", label: "Excluir material" },
            { id: "toggle_ativo", label: "Ativar / Desativar material" },
            { id: "add_metros", label: "Adicionar metros" },
            { id: "edit_metros", label: "Editar metros" },
            { id: "del_metros", label: "Excluir metros" },
            { id: "entrada_metros", label: "Dar entrada em metros de material" },
            { id: "saida_metros", label: "Dar saída em metros de material" },
            { id: "fechar_bobina", label: "Encerrar bobina aberta de material" },
            { id: "ver_tipos", label: "Ver aba Tipos de Materiais" },
            { id: "ver_metragem", label: "Ver aba Metragem de Materiais" },
            { id: "ver_historico", label: "Ver aba Histórico de Material" },
        ]
    },
    {
        id: "perdas", label: "Aba Perdas", actions: [
            { id: "add", label: "Adicionar nova perda" },
            { id: "edit", label: "Editar perda" },
            { id: "delete", label: "Excluir perda" },
            { id: "alterar_limite", label: "Alterar limite de perda" },
        ]
    },
    {
        id: "perfil", label: "Aba Perfil", actions: [
            { id: "view", label: "Visualizar aba de perfil" },
        ]
    },
    {
        id: "empresa", label: "Aba Empresa", actions: [
            { id: "view", label: "Visualizar aba de empresa" },
        ]
    },
    {
        id: "funcionarios", label: "Aba Funcionários", actions: [
            { id: "add", label: "Adicionar funcionários" },
            { id: "edit", label: "Editar funcionários" },
            { id: "delete", label: "Excluir funcionário" },
        ]
    }
];

// Chave de "visualização" que controla o acesso à ABA inteira.
// Só existe para os módulos que têm um toggle explícito de ver/visualizar.
// Módulos ausentes daqui (painel, vendas, espaco, clientes, relatorios,
// perdas) não têm bloqueio de aba — apenas de ações.
export const MODULE_VIEW_KEYS: Record<string, string> = {
    financeiro: "financeiro_visualizar_numeros",
    contas: "contas_visualizar_numeros",
    compras: "compras_visualizar_numeros",
    comissoes: "comissoes_view",
    garantias: "garantias_view",
    servicos: "servicos_view",
    perfil: "perfil_view",
    empresa: "empresa_view",
    estoque: "estoque_view",
};

/** Chave de visualização de um módulo, ou null se a aba não pode ser ocultada. */
export function moduleViewKey(moduleId: string): string | null {
    return MODULE_VIEW_KEYS[moduleId] ?? null;
}

// Bloqueios padrão para um funcionário NOVO (safe-by-default).
// As abas/visões sensíveis (financeiras) já começam marcadas como bloqueadas;
// o admin desmarca para liberar. Não afeta funcionários já existentes nem a
// edição — vale só ao criar um novo.
export const DEFAULT_LOCKED_MODULES: string[] = [
    "financeiro_visualizar_numeros", // Aba Financeiro
    "contas_visualizar_numeros",     // Aba Contas
    "comissoes_view",                // Aba Comissões
    "empresa_view",                  // Aba Empresa
    "painel_ver_financeiro",         // Ver financeiro completo no Painel
];
