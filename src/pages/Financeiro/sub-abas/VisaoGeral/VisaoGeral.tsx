// @ts-nocheck
import { useState, useEffect } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, TrendingUp, TrendingDown, Eye, EyeOff, Landmark, PiggyBank, CreditCard, Tag, ShoppingCart, Receipt, FileText, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfMonth, endOfMonth, addDays, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { AddTransactionModal } from "@/shared/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/shared/components/financeiro/AddTransferModal";
import { AddAccountModal } from "@/shared/components/financeiro/AddAccountModal";
import { ManageCategoriesModal } from "@/shared/components/financeiro/ManageCategoriesModal";
import { AccountDetailsModal } from "@/pages/Financeiro/components/AccountDetailsModal";
import { useSalesRecognition } from "@/hooks/useSalesRecognition";
import { toast } from "sonner";

interface Account {
    id: number;
    name: string;
    account_type: string | null;
    current_balance: number | null;
    is_main: boolean | null;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    transaction_date: string;
    sale_id: number | null;
    origin_type: string | null;
    name: string;
    is_paid: boolean | null;
}

interface Sale {
    id: number;
    total: number;
    sale_date: string;
    status: string | null;
}

interface Transfer {
    id: number;
    amount: number;
    transfer_date: string;
    from_account_id: number;
    to_account_id: number;
}

interface CardMachine {
    id: number;
    name: string;
    debit_rate: number | null;
}

interface CardMachineRate {
    id: number;
    machine_id: number;
    brand: string | null;
    installments: number | null;
    rate: number;
}

export function VisaoGeral() {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [monthSales, setMonthSales] = useState<Sale[]>([]);
    const [machines, setMachines] = useState<CardMachine[]>([]);
    const [machineRates, setMachineRates] = useState<CardMachineRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [companyId, setCompanyId] = useState<number | null>(null);

    // Regra única de reconhecimento (líquido). Entradas = vendas fechadas reconhecidas no mês.
    const { valorFechadas: entradasVendasReconhecidas } = useSalesRecognition(companyId, currentMonth);

    const fetchData = async () => {
        if (!user?.id) return;

        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("company_id")
                .eq("user_id", user.id)
                .single();

            if (!profile?.company_id) {
                setLoading(false);
                return;
            }

            setCompanyId(profile.company_id);

            // Fetch accounts
            const { data: accountsData } = await supabase
                .from("accounts")
                .select("*")
                .eq("company_id", profile.company_id)
                .eq("is_active", true)
                .order("is_main", { ascending: false });

            // Fetch bounds
            const monthStartObj = startOfMonth(currentMonth);
            const queryStart = format(monthStartObj, "yyyy-MM-dd");
            const monthEndObj = endOfMonth(currentMonth);
            const monthEnd = format(monthEndObj, "yyyy-MM-dd");

            const isCurrentMonth =
                currentMonth.getMonth() === new Date().getMonth() &&
                currentMonth.getFullYear() === new Date().getFullYear();

            const futureEndObj = isCurrentMonth ? addDays(new Date(), 7) : monthEndObj;
            const queryLimitStr = format(futureEndObj > monthEndObj ? futureEndObj : monthEndObj, "yyyy-MM-dd");

            const { data: transactionsData } = await supabase
                .from("transactions")
                .select("id, type, amount, transaction_date, sale_id, origin_type, name, is_paid, sale_payment_id")
                .eq("company_id", profile.company_id)
                .gte("transaction_date", queryStart)
                .lte("transaction_date", queryLimitStr)
                .order("transaction_date", { ascending: false });

            // Fetch sales for the month with payments
            const { data: salesData } = await supabase
                .from("sales")
                .select(`
          id, 
          total, 
          sale_date, 
          status,
          sale_payments (
            id,
            amount,
            method,
            installments,
            machine_id,
            brand
          )
        `)
                .eq("company_id", profile.company_id)
                .is("deleted_at", null)
                .gte("sale_date", queryStart)
                .lte("sale_date", monthEnd);

            // Fetch transfers 
            const { data: transfersData } = await supabase
                .from("transfers")
                .select("*")
                .eq("company_id", profile.company_id)
                .gte("transfer_date", queryStart)
                .lte("transfer_date", queryLimitStr)
                .order("transfer_date", { ascending: false });

            // Fetch card machines
            const { data: machinesData } = await supabase
                .from("card_machines")
                .select("id, name, debit_rate")
                .eq("company_id", profile.company_id);

            // Fetch card machine rates
            const { data: ratesData } = await supabase
                .from("card_machine_rates")
                .select("id, machine_id, brand, installments, rate")
                .eq("company_id", profile.company_id);

            setAccounts(accountsData || []);
            setTransactions(transactionsData || []);
            setTransfers(transfersData || []);
            setMonthSales(salesData || []);
            setMachines(machinesData || []);
            setMachineRates(ratesData || []);
        } catch (error) {
            console.error("Error fetching financial data:", error);
            toast.error("Erro ao carregar dados financeiros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id, currentMonth]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const monthStartStr = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEndStr = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const futureEndStr = format(addDays(new Date(), 7), "yyyy-MM-dd");

    const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

    const monthTransactions = transactions.filter(t => t.transaction_date >= monthStartStr && t.transaction_date <= monthEndStr);
    const futureTransactions = transactions.filter(t => t.transaction_date > todayStr && t.transaction_date <= futureEndStr);

    // === ENTRADAS ===
    const entradasTransactions = monthTransactions.filter(t => t.type === 'Entrada' && t.is_paid);

    // Vendas do mês (contagem — lixeira já excluída na query)
    const totalVendasMes = monthSales.reduce((sum, s) => sum + s.total, 0);
    const qtdVendasMes = monthSales.length;

    // Entradas de vendas: regra ÚNICA de reconhecimento (líquido, apenas vendas fechadas).
    // Mesma base usada pelo card "Total de vendas fechadas" da aba Vendas.
    const entradasDeVendas = entradasVendasReconhecidas;

    // Outras entradas manuais (transações pagas sem vínculo de venda)
    const outrasEntradas = entradasTransactions
        .filter(t => t.sale_id === null)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalEntradas = entradasDeVendas + outrasEntradas;

    // === SAÍDAS ===
    const saidasTransactions = monthTransactions.filter(t => t.type === 'Saida' && t.is_paid);
    const totalSaidas = saidasTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Despesas fixas / recorrentes (transações com "Despesa fixa" ou "recorrente" no nome, ou origin_type de purchase)
    const saidasCompras = saidasTransactions
        .filter(t => t.origin_type === 'purchase_installment')
        .reduce((sum, t) => sum + t.amount, 0);

    // Outras saídas (manuais, ROAS, etc)
    const outrasSaidas = saidasTransactions
        .filter(t => t.origin_type !== 'purchase_installment')
        .reduce((sum, t) => sum + t.amount, 0);

    const futureEntradas = futureTransactions
        .filter(t => t.type === 'Entrada')
        .reduce((sum, t) => sum + t.amount, 0);

    const futureSaidas = futureTransactions
        .filter(t => t.type === 'Saida')
        .reduce((sum, t) => sum + t.amount, 0);

    // === NOVOS INDICADORES DE MAQUININHA E TRANSFERÊNCIAS ===

    // 1. Total de transferências no mês
    const monthTransfers = transfers.filter(t => t.transfer_date >= monthStartStr && t.transfer_date <= monthEndStr);
    const totalTransferenciasMes = monthTransfers.reduce((sum, t) => sum + t.amount, 0);

    // Total de taxas de TED/DOC no mês
    const totalTaxasTedDocMes = monthTransactions
        .filter(t => t.type === 'Saida' && t.is_paid && t.name.includes("Taxa de TED/DOC"))
        .reduce((sum, t) => sum + t.amount, 0);

    // 2. Extrair todos os pagamentos em maquininha de vendas fechadas no mês corrente
    const closedMonthSales = monthSales.filter(s => s.status === 'Fechada');
    const maquininhaPayments = closedMonthSales.flatMap(sale => {
        const payments = (sale as any).sale_payments || [];
        return payments.filter((p: any) =>
            (p.method === "Crédito" || p.method === "Débito") && p.machine_id !== null
        );
    });

    // Valor Bruto de Maquininha
    const totalVendasMaquininha = maquininhaPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calcular Taxas e Líquido Real/Estimado
    let totalTaxaMaquininha = 0;
    let totalLiquidoMaquininha = 0;

    maquininhaPayments.forEach((p: any) => {
        // Tenta encontrar a transação real pelo sale_payment_id ou sale_id (se for pagamento único)
        const tx = transactions.find(t =>
            t.type === 'Entrada' &&
            t.is_paid &&
            (t.sale_payment_id === p.id || (t.sale_id === p.sale_id && t.sale_payment_id === null))
        );

        if (tx) {
            const liquido = tx.amount;
            const taxa = Math.max(0, p.amount - liquido);
            totalTaxaMaquininha += taxa;
            totalLiquidoMaquininha += liquido;
        } else {
            // Fallback: cálculo baseado nas configurações de taxas
            let rate = 0;
            if (p.method === "Débito") {
                const machine = machines.find(m => m.id === p.machine_id);
                rate = machine?.debit_rate || 0;
            } else {
                // Crédito
                const rateRecord = machineRates.find(r =>
                    r.machine_id === p.machine_id &&
                    r.installments === (p.installments || 1) &&
                    (!p.brand || !r.brand || r.brand.toLowerCase() === p.brand.toLowerCase())
                );
                rate = rateRecord?.rate || 0;
            }
            const taxaEstimada = p.amount * (rate / 100);
            const liquidoEstimado = p.amount - taxaEstimada;

            totalTaxaMaquininha += taxaEstimada;
            totalLiquidoMaquininha += liquidoEstimado;
        }
    });

    // 5. Maquininha mais usada
    const usageMap: { [key: number]: number } = {};
    maquininhaPayments.forEach((p: any) => {
        if (p.machine_id) {
            usageMap[p.machine_id] = (usageMap[p.machine_id] || 0) + 1;
        }
    });

    let mostUsedMachineId: number | null = null;
    let mostUsedMachineCount = 0;
    Object.entries(usageMap).forEach(([idStr, count]) => {
        if (count > mostUsedMachineCount) {
            mostUsedMachineCount = count;
            mostUsedMachineId = parseInt(idStr);
        }
    });

    const mostUsedMachineName = mostUsedMachineId
        ? (machines.find(m => m.id === mostUsedMachineId)?.name || `Maquininha #${mostUsedMachineId}`)
        : "Nenhuma";

    // Generate chart data for last 7 days working backwards from today's balance
    let currentBal = totalBalance;
    const reversedChartData = [];

    for (let i = 0; i < 7; i++) {
        const dateObj = subDays(new Date(), i);
        const dateStr = format(dateObj, 'yyyy-MM-dd');

        reversedChartData.push({
            date: format(dateObj, 'dd/MM'),
            saldo: currentBal,
        });

        const dayTransactions = transactions.filter(t => t.transaction_date === dateStr && t.is_paid);
        const dayEntradas = dayTransactions.filter(t => t.type === 'Entrada').reduce((s, t) => s + t.amount, 0);
        const daySaidas = dayTransactions.filter(t => t.type === 'Saida').reduce((s, t) => s + t.amount, 0);
        const netFlow = dayEntradas - daySaidas;

        // Balance before this day's transactions happened:
        currentBal -= netFlow;
    }

    const chartData = reversedChartData.reverse();

    // Generate transfer chart data for the last 7 days
    const transferChartData = [];
    for (let i = 6; i >= 0; i--) {
        const dateObj = subDays(new Date(), i);
        const dateStr = format(dateObj, 'yyyy-MM-dd');

        const dayTransfers = transfers.filter(t => t.transfer_date === dateStr);
        const dayTotalTransferred = dayTransfers.reduce((sum, t) => sum + t.amount, 0);

        transferChartData.push({
            date: format(dateObj, 'dd/MM'),
            volume: dayTotalTransferred,
        });
    }

    const getAccountIcon = (type: string | null) => {
        switch (type) {
            case 'Conta Corrente': return <Landmark className="h-5 w-5" />;
            case 'Poupança': return <PiggyBank className="h-5 w-5" />;
            case 'Carteira': return <Wallet className="h-5 w-5" />;
            case 'Investimento': return <TrendingUp className="h-5 w-5" />;
            default: return <CreditCard className="h-5 w-5" />;
        }
    };

    const formatCurrency = (value: number) => {
        if (!showValues) return "••••••";
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const openTransactionModal = (type: 'entrada' | 'saida') => {
        setTransactionType(type);
        setTransactionModalOpen(true);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com controles do mês e ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 transition-colors hover:bg-muted" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold capitalize text-foreground min-w-[110px] text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7 transition-colors hover:bg-muted" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {!isCurrentMonth && (
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-3 ml-1" onClick={() => setCurrentMonth(new Date())}>
                            Voltar para o mês atual
                        </Button>
                    )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowValues(!showValues)}>
                        {showValues ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="flex-1 sm:flex-none">
                                <Plus className="h-4 w-4 mr-2" /> Adicionar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openTransactionModal('entrada')}>
                                <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" /> Nova Entrada
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openTransactionModal('saida')}>
                                <ArrowDownRight className="h-4 w-4 mr-2 text-red-500" /> Nova Saída
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTransferModalOpen(true)}>
                                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" /> Transferência
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAccountModalOpen(true)}>
                                <Wallet className="h-4 w-4 mr-2" /> Nova Conta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setCategoriesModalOpen(true)}>
                                <Tag className="h-4 w-4 mr-2" /> Gerenciar Categorias
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Visão Geral (Overview) - Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">

                {/* Saldo Geral - Takes full width on mobile, 4 columns on desktop */}
                <Card className="md:col-span-12 lg:col-span-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-4 top-4 opacity-10">
                        <Landmark size={100} />
                    </div>
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground/90 uppercase tracking-wider">Saldo Geral Atual</p>
                            <p className="text-4xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
                        </div>
                        <div className="mt-4">
                            <div className="inline-flex items-center bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-foreground border border-border/50 shadow-sm">
                                <Wallet className="h-3 w-3 mr-2 text-primary" />
                                {accounts.length} {accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Entradas Card */}
                <Card className="md:col-span-6 lg:col-span-4 bg-card/50 border-border/50 relative overflow-hidden flex flex-col">
                    <div className="p-6 pb-3 flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                                <ArrowUpRight className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Entradas</span>
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <p className="text-sm text-muted-foreground">Total no Mês</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalEntradas)}</p>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <ShoppingCart className="h-3.5 w-3.5 text-green-500/70" />
                                    <span>Vendas ({qtdVendasMes})</span>
                                </div>
                                <span className="font-medium text-foreground">{formatCurrency(entradasDeVendas)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5 text-green-500/70" />
                                    <span>Outras entradas</span>
                                </div>
                                <span className="font-medium text-foreground">{formatCurrency(outrasEntradas)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-500/5 px-6 py-3 border-t border-green-500/10 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Previsão (Próx. 7 dias)</span>
                        <span className="text-sm font-semibold text-green-500">+{formatCurrency(futureEntradas)}</span>
                    </div>
                </Card>

                {/* Saídas Card */}
                <Card className="md:col-span-6 lg:col-span-4 bg-card/50 border-border/50 relative overflow-hidden flex flex-col">
                    <div className="p-6 pb-3 flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                                <ArrowDownRight className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Saídas</span>
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <p className="text-sm text-muted-foreground">Total no Mês</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalSaidas)}</p>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Receipt className="h-3.5 w-3.5 text-red-500/70" />
                                    <span>Compras / Fornecedores</span>
                                </div>
                                <span className="font-medium text-foreground">{formatCurrency(saidasCompras)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5 text-red-500/70" />
                                    <span>Despesas / Outros</span>
                                </div>
                                <span className="font-medium text-foreground">{formatCurrency(outrasSaidas)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-500/5 px-6 py-3 border-t border-red-500/10 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Previsão (Próx. 7 dias)</span>
                        <span className="text-sm font-semibold text-red-500">-{formatCurrency(futureSaidas)}</span>
                    </div>
                </Card>

            </div>

            {/* Novos Cards de Detalhes de Maquininha e Transferências */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mt-6 animate-in fade-in duration-500">

                {/* Total de Transferências */}
                <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transferências no Mês</span>
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                <RefreshCw className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(totalTransferenciasMes)}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">Volume movimentado entre contas</p>
                    </CardContent>
                </Card>

                {/* Total de Taxas TED/DOC */}
                <Card className="bg-yellow-500/5 border-yellow-500/30 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">Taxas de Transferência</span>
                            <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-600 dark:text-yellow-500">
                                <Receipt className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight mt-1 text-yellow-600 dark:text-yellow-500">{formatCurrency(totalTaxasTedDocMes)}</p>
                        <p className="text-[10px] text-yellow-600/70 dark:text-yellow-500/70 mt-2">Gasto com taxas de TED/DOC</p>
                    </CardContent>
                </Card>

                {/* Total de Vendas em Maquininha */}
                <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendas em Maquininha</span>
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <CreditCard className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(totalVendasMaquininha)}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">Valor bruto total no mês</p>
                    </CardContent>
                </Card>

                {/* Valor de Taxa Consumido */}
                <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxas de Maquininha</span>
                            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                                <TrendingDown className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(totalTaxaMaquininha)}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">Custos de intermediação no mês</p>
                    </CardContent>
                </Card>

                {/* Valor Líquido Recebido */}
                <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Líquido Recebido</span>
                            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
                                <PiggyBank className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(totalLiquidoMaquininha)}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">Valor líquido a receber em conta</p>
                    </CardContent>
                </Card>

                {/* Maquininha Mais Usada */}
                <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maquininha Mais Usada</span>
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                                <Tag className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-lg font-bold tracking-tight mt-2 truncate" title={mostUsedMachineName}>
                            {mostUsedMachineName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                            {mostUsedMachineCount} {mostUsedMachineCount === 1 ? 'venda registrada' : 'vendas registradas'}
                        </p>
                    </CardContent>
                </Card>

            </div>

            {/* Divisor do Dashboard */}
            <h2 className="text-lg font-semibold mt-8 mb-4 tracking-tight">Análise de Performance</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Evolução do Saldo */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">Evolução do Saldo</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Acompanhe seu patrimônio diário nos últimos 7 dias</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `R$${value.toLocaleString('pt-BR', { notation: "compact" })}`}
                                        width={75}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                                        formatter={(value: number) => [formatCurrency(value), 'Saldo em Conta']}
                                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="saldo"
                                        stroke="hsl(var(--primary))"
                                        fillOpacity={1}
                                        fill="url(#colorSaldo)"
                                        strokeWidth={3}
                                        activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Chart Volume de Transferências */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">Volume de Transferências</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Movimentações entre suas contas nos últimos 7 dias</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={transferChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `R$${value.toLocaleString('pt-BR', { notation: "compact" })}`}
                                        width={75}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                                        formatter={(value: number) => [formatCurrency(value), 'Volume Transferido']}
                                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                                    />
                                    <Bar
                                        dataKey="volume"
                                        fill="hsl(var(--blue-500, 221 83% 53%))"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-4 tracking-tight">Detalhes Bancários</h2>

            {/* Accounts */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg">Minhas Contas</CardTitle>
                </CardHeader>
                <CardContent>
                    {accounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma conta cadastrada</p>
                            <Button onClick={() => setAccountModalOpen(true)} className="mt-4" variant="outline">
                                <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeira Conta
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {accounts.map(account => (
                                <Card key={account.id} className={cn(
                                    "hover:shadow-md transition-shadow cursor-default",
                                    account.is_main ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/30" : "bg-card border-border/50"
                                )}>
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    account.is_main ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {getAccountIcon(account.account_type)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold block leading-tight">{account.name}</span>
                                                    <span className="text-xs text-muted-foreground">{account.account_type}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {account.is_main && (
                                                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase font-bold tracking-wider">Principal</span>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAccount(account);
                                                        setDetailsModalOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-right">
                                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Balanço</p>
                                            <p className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(account.current_balance || 0)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <AddTransactionModal
                open={transactionModalOpen}
                onOpenChange={setTransactionModalOpen}
                type={transactionType}
                onSuccess={fetchData}
            />
            <AddTransferModal
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
                onSuccess={fetchData}
            />
            <AddAccountModal
                open={accountModalOpen}
                onOpenChange={setAccountModalOpen}
                onSuccess={fetchData}
            />
            <ManageCategoriesModal
                open={categoriesModalOpen}
                onOpenChange={setCategoriesModalOpen}
            />
            <AccountDetailsModal
                account={selectedAccount}
                open={detailsModalOpen}
                onOpenChange={setDetailsModalOpen}
            />
        </div>
    );
}
