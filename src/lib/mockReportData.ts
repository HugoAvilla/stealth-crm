import { type ReportPDFData } from "./pdfGenerator";

export function getMockReportData(reportId: string, startDate?: string, endDate?: string): ReportPDFData | null {
    const isPdfXlsx = true;

    switch (reportId) {
        case 'dfc':
            return {
                title: 'DFC - Demonstração de Fluxo de Caixa (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Data', 'Nome', 'Descrição', 'Tipo', 'Método Pgto', 'Status', 'Valor', 'Conta Bancária', 'Categoria', 'Subcategoria'],
                rows: [
                    ['1', '10/05/2026', 'Venda João da Silva', 'Serviço Lavagem', 'Entrada', 'Pix', 'Pago', 'R$ 150,00', 'Nubank', 'Vendas', 'Serviços'],
                    ['2', '11/05/2026', 'Conta de Luz', 'Enel', 'Saida', 'Boleto', 'Pago', 'R$ 200,00', 'Itaú', 'Despesas', 'Energia'],
                    ['3', '12/05/2026', 'Venda Maria Souza', 'Polimento', 'Entrada', 'Cartão de Crédito', 'Pago', 'R$ 450,00', 'Nubank', 'Vendas', 'Serviços']
                ],
                summary: [
                    { label: 'Total Entradas', value: 'R$ 600,00' },
                    { label: 'Total Saídas', value: 'R$ 200,00' },
                    { label: 'Saldo do Período', value: 'R$ 400,00' }
                ]
            };

        case 'dre':
            return {
                title: 'DRE - Demonstração de Resultado do Exercício (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['', 'Descrição', 'Valor (R$)', 'AV%'],
                rows: [
                    ['', '(+) RECEITA BRUTA DE SERVIÇOS', 'R$ 10.000,00', '100.0%'],
                    ['', '    Vendas fechadas (50)', 'R$ 10.000,00', ''],
                    ['', '(-) DEDUÇÕES SOBRE RECEITA', 'R$ 500,00', '5.0%'],
                    ['', '(=) RECEITA LÍQUIDA', 'R$ 9.500,00', '95.0%'],
                    ['', '(-) CUSTO DOS SERVIÇOS PRESTADOS', 'R$ 2.000,00', '20.0%'],
                    ['', '(=) LUCRO BRUTO', 'R$ 7.500,00', '75.0%'],
                    ['', '(-) DESPESAS OPERACIONAIS', 'R$ 3.000,00', '30.0%'],
                    ['', '(=) RESULTADO OPERACIONAL', 'R$ 4.500,00', '45.0%'],
                    ['', '(=) RESULTADO LÍQUIDO DO PERÍODO', 'R$ 4.500,00', '45.0%']
                ],
                summary: [
                    { label: 'Receita Bruta', value: 'R$ 10.000,00' },
                    { label: 'Lucro Bruto', value: 'R$ 7.500,00' },
                    { label: 'Resultado Líquido', value: 'R$ 4.500,00' }
                ]
            };

        case 'vendas_periodo':
            return {
                title: 'Relatório de Vendas (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['Data Venda', 'Venda', 'Cliente', 'Descrição', 'Item/Produto', 'Subtotal', 'Desconto', 'Total', 'Veículo'],
                rows: [
                    ['12/05/2026', '1001', 'Carlos Mendes', 'Lavagem Completa', 'Shampoo', 'R$ 120,00', 'R$ 0,00', 'R$ 120,00', 'Honda Civic'],
                    ['13/05/2026', '1002', 'Ana Clara', 'Polimento', 'Cera', 'R$ 350,00', 'R$ 50,00', 'R$ 300,00', 'Toyota Corolla'],
                ],
                summary: [
                    { label: 'Total de Vendas', value: '2' },
                    { label: 'Total Descontos', value: 'R$ 50,00' },
                    { label: 'Valor Total', value: 'R$ 420,00' }
                ]
            };

        case 'vendas_servico':
            return {
                title: 'Vendas por Serviço (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Serviço', 'Quantidade', 'Total'],
                rows: [
                    ['1', 'Lavagem Simples', '45', 'R$ 2.250,00'],
                    ['2', 'Polimento Cristalizado', '10', 'R$ 3.500,00'],
                    ['3', 'Higienização Interna', '15', 'R$ 2.250,00']
                ],
                summary: [
                    { label: 'Total de Serviços', value: '3' },
                    { label: 'Valor Total', value: 'R$ 8.000,00' }
                ]
            };

        case 'vendas_vendedor':
            return {
                title: 'Vendas por Vendedor (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Vendedor', 'Vendas', 'Total'],
                rows: [
                    ['1', 'Pedro Henrique', '25', 'R$ 5.500,00'],
                    ['2', 'Lucas Santos', '18', 'R$ 3.200,00']
                ],
                summary: [
                    { label: 'Total de Vendedores', value: '2' },
                    { label: 'Valor Total', value: 'R$ 8.700,00' }
                ]
            };

        case 'vendas_pelicula':
            return {
                title: 'Vendas por Película (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Película', 'Categoria', 'Vendas', 'Qtd Gasta', 'Média Venda/m', 'Custo/m', 'Custo Total', 'Faturamento', 'Lucro Bruto', 'Margem (%)'],
                rows: [
                    ['1', '3M - Color Stable', 'Premium', '10', '25,00 m', 'R$ 200,00', 'R$ 50,00', 'R$ 1.250,00', 'R$ 5.000,00', 'R$ 3.750,00', '75.0%'],
                    ['2', 'Insulfilm - G20', 'Básica', '30', '75,00 m', 'R$ 80,00', 'R$ 15,00', 'R$ 1.125,00', 'R$ 6.000,00', 'R$ 4.875,00', '81.2%']
                ],
                summary: [
                    { label: 'Total de Vendas Únicas', value: '40' },
                    { label: 'Margem Média Geral', value: '78.5%' }
                ]
            };

        case 'clientes_ativos':
            return {
                title: 'Clientes Ativos (últimos 90 dias) (MOCK)',
                columns: ['#', 'Cliente', 'Telefone', 'Compras', 'Total'],
                rows: [
                    ['1', 'Marcos Antônio', '(11) 98888-7777', '3', 'R$ 1.200,00'],
                    ['2', 'Juliana Silva', '(11) 97777-6666', '1', 'R$ 150,00']
                ],
                summary: [
                    { label: 'Total de Clientes Ativos', value: '2' }
                ]
            };

        case 'clientes_inativos':
            return {
                title: 'Clientes Inativos (+90 dias sem compras) (MOCK)',
                columns: ['#', 'Cliente', 'Telefone'],
                rows: [
                    ['1', 'Fernando Costa', '(11) 96666-5555'],
                    ['2', 'Roberto Almeida', '(11) 95555-4444']
                ],
                summary: [
                    { label: 'Total de Clientes Inativos', value: '2' }
                ]
            };

        case 'clientes_marketing':
            return {
                title: 'Lista de Marketing (MOCK)',
                columns: ['#', 'Nome', 'Telefone', 'Email'],
                rows: [
                    ['1', 'Fernando Costa', '(11) 96666-5555', 'fernando@fake.com'],
                    ['2', 'Juliana Silva', '(11) 97777-6666', 'juliana@fake.com']
                ],
                summary: [
                    { label: 'Total de Clientes', value: '2' }
                ]
            };

        case 'clientes_completo':
            return {
                title: 'Lista Completa de Clientes (Backup) (MOCK)',
                columns: ['#', 'Nome', 'Telefone', 'Email', 'CPF/CNPJ', 'Veículos', 'Total Gasto', 'Última Compra'],
                rows: [
                    ['1', 'Fernando Costa', '(11) 96666-5555', 'fernando@fake.com', '123.456.789-00', 'Gol (ABC-1234)', 'R$ 5.000,00', '10/01/2026'],
                ],
                summary: [
                    { label: 'Total de Clientes', value: '1' }
                ]
            };

        case 'ocupacao_vagas':
            return {
                title: 'Ocupação de Vagas (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Vaga', 'Cliente', 'Veículo', 'Entrada', 'Saída', 'Pagamento'],
                rows: [
                    ['1', 'Vaga 01', 'Marcos Antônio', 'BMW X1', '14/05/2026', '15/05/2026', 'Pago'],
                    ['2', 'Vaga 02', 'Juliana Silva', 'Audi A3', '15/05/2026', 'Em uso', 'Pendente']
                ],
                summary: [
                    { label: 'Total de Ocupações', value: '2' }
                ]
            };

        case 'estoque_movimento':
            return {
                title: 'Movimentação de Estoque (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Data', 'Material', 'Tipo', 'Quantidade', 'Motivo'],
                rows: [
                    ['1', '10/05/2026', 'Cera de Carnaúba', 'Saída', '2 un', 'Uso em polimento'],
                    ['2', '12/05/2026', 'Shampoo Automotivo', 'Uso de Rolo Aberto', '5 L', 'Abastecimento galão']
                ],
                summary: [
                    { label: 'Total de Movimentações', value: '2' }
                ]
            };

        case 'perdas_material':
            return {
                title: 'Relatório de Perdas de Material (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Material', 'Categoria', 'Solicit.', 'Metros Perdidos', 'M² Perdidos', 'Custo Total', 'Média m/Solicit.', 'Média m²/Solicit.', 'Média $/Solicit.', 'Motivo Principal'],
                rows: [
                    ['1', '3M - Color Stable', 'Película', '2', '3,50 m', '5,30 m²', 'R$ 175,00', '1,75 m', '2,65 m²', 'R$ 87,50', 'Retrabalho']
                ],
                summary: [
                    { label: 'Total de Solicitações', value: '2' },
                    { label: 'Custo de Perda Consolidado', value: 'R$ 175,00' }
                ]
            };

        case 'extrato_conta':
            return {
                title: 'Extrato - Conta MOCK',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Data', 'Descrição', 'Tipo', 'Valor'],
                rows: [
                    ['1', '10/05/2026', 'Venda PIX', 'Entrada', 'R$ 200,00'],
                    ['2', '11/05/2026', 'Pagamento Internet', 'Saida', 'R$ 100,00']
                ],
                summary: [
                    { label: 'Entradas', value: 'R$ 200,00' },
                    { label: 'Saídas', value: 'R$ 100,00' },
                    { label: 'Saldo', value: 'R$ 100,00' }
                ]
            };

        case 'saidas_financeiro':
            return {
                title: 'Relatório de Saídas Financeiro (Pagos e Pendentes) (MOCK)',
                period: { start: startDate || '2023-01-01', end: endDate || '2023-12-31' },
                columns: ['#', 'Nome', 'Descrição', 'Valor', 'Método Pgto', 'Data Pgto', 'Status', 'Conta Bancária', 'Categoria', 'Subcategoria'],
                rows: [
                    ['1', 'Aluguel', 'Mensalidade', 'R$ 2.000,00', 'Pix', '10/05/2026', 'Pago', 'Itaú', 'Imóvel', 'Aluguel'],
                    ['2', 'Internet', 'Vivo Fibra', 'R$ 150,00', 'Boleto', '15/05/2026', 'Pendente', 'Itaú', 'Despesas', 'Telecom']
                ],
                summary: [
                    { label: 'Total Pago', value: 'R$ 2.000,00' },
                    { label: 'Total Pendente', value: 'R$ 150,00' },
                    { label: 'Total Geral', value: 'R$ 2.150,00' }
                ]
            };

        default:
            return null;
    }
}
