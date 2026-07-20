// @ts-nocheck
import React, { useState, Fragment } from "react";
import { format, subDays, parse, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Search, Calendar as CalendarIcon, Filter, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft, ChevronsUpDown, ChevronUp, ChevronDown, Landmark, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ExtratoProps {
    selectedAccount?: any;
    accounts: any[];
    accountTransactions: any[];
    categories: any[];
    formatCurrency: (value: number) => string;
    handleTogglePayment: (tx: any, newStatus: boolean) => void;
    handleOpenPaymentModal: (tx: any) => void;
}

export function Extrato({
    selectedAccount,
    accounts,
    accountTransactions,
    categories,
    formatCurrency,
    handleTogglePayment,
    handleOpenPaymentModal
}: ExtratoProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

    const handlePrevMonth = () => {
        const current = parse(filterMonth, "yyyy-MM", new Date());
        setFilterMonth(format(subMonths(current, 1), "yyyy-MM"));
    };

    const handleNextMonth = () => {
        const current = parse(filterMonth, "yyyy-MM", new Date());
        setFilterMonth(format(addMonths(current, 1), "yyyy-MM"));
    };

    const [filterType, setFilterType] = useState<string>("todos");
    const [filterStatus, setFilterStatus] = useState<string>("todos");

    type SortField = 'date' | 'name' | 'amount' | 'status';
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'date' ? 'desc' : 'asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3 inline text-muted-foreground/40" />;
        return sortDirection === 'asc'
            ? <ChevronUp className="ml-1 h-3 w-3 inline text-primary" />
            : <ChevronDown className="ml-1 h-3 w-3 inline text-primary" />;
    };

    const [expandedFutureGroups, setExpandedFutureGroups] = useState<Record<string, boolean>>({});
    const [expandedExtratoGroups, setExpandedExtratoGroups] = useState<Record<string, boolean>>({});

    const toggleExtratoGroup = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedExtratoGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getCategoryById = (id: number) => categories.find(c => c.id === id);

    // Payment methods breakdown from real transactions
    const paymentMethodsMap: Record<string, number> = {};
    accountTransactions
        .filter(t => t.type === 'Entrada' && t.is_paid)
        .forEach(t => {
            const method = t.payment_method || 'Outros';
            paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + t.amount;
        });

    const paymentColors: Record<string, string> = {
        'Pix': '#22c55e',
        'Dinheiro': '#3b82f6',
        'Crédito': '#8b5cf6',
        'Débito': '#06b6d4',
        'Boleto': '#f97316',
        'Transferência': '#ec4899',
        'Outros': '#6b7280'
    };

    const paymentData = Object.entries(paymentMethodsMap).map(([name, value]) => ({
        name,
        value,
        color: paymentColors[name] || '#6b7280'
    }));

    // Categories breakdown from real transactions
    const categoryTotals: Record<number, number> = {};
    accountTransactions
        .filter(t => t.type === 'Saida' && t.category_id)
        .forEach(t => {
            categoryTotals[t.category_id!] = (categoryTotals[t.category_id!] || 0) + t.amount;
        });

    const categoryData = Object.entries(categoryTotals)
        .map(([catId, value]) => {
            const category = categories.find(c => c.id === parseInt(catId));
            return {
                name: category?.name || 'Outros',
                value,
                color: category?.color || '#6b7280'
            };
        })
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const futureTransactions = accountTransactions.filter(t => !t.is_paid);
    const currentTransactions = accountTransactions.filter(t => t.is_paid);

    const groupedFuture = futureTransactions.reduce((groups, t) => {
        let baseName = t.name;
        const regex = /(\s*-\s*Parcela\s*\d+(?:\s*\/\s*\d+)?|\s*\(\d+\/\d+\)).*/i;
        if (regex.test(baseName)) {
            baseName = baseName.replace(regex, '').trim();
        }
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(t);
        return groups;
    }, {} as Record<string, any[]>);

    const futureGroupsArray = Object.entries(groupedFuture).map(([name, txs]) => {
        txs.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        return {
            name,
            transactions: txs,
            totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
            installmentsCount: txs.length,
            nextDate: txs[0]?.transaction_date
        };
    }).sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());

    const toggleFutureGroup = (name: string) => {
        setExpandedFutureGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    let filteredTransactions = currentTransactions;

    if (filterMonth) {
        filteredTransactions = filteredTransactions.filter(t => t.transaction_date.startsWith(filterMonth));
    }
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredTransactions = filteredTransactions.filter(t =>
            t.name.toLowerCase().includes(term) ||
            (t.description?.toLowerCase() || "").includes(term) ||
            (getCategoryById(t.category_id || 0)?.name.toLowerCase() || "").includes(term)
        );
    }
    if (filterType !== "todos") {
        filteredTransactions = filteredTransactions.filter(t => t.type.toLowerCase() === filterType.toLowerCase());
    }
    if (filterStatus !== "todos") {
        if (filterStatus === "pago") {
            filteredTransactions = filteredTransactions.filter(t => t.is_paid === true);
        } else if (filterStatus === "pendente") {
            filteredTransactions = filteredTransactions.filter(t => t.is_paid === false);
        }
    }

    filteredTransactions = [...filteredTransactions].sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
            comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        } else if (sortField === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'amount') {
            comparison = a.amount - b.amount;
        } else if (sortField === 'status') {
            comparison = (a.is_paid === b.is_paid) ? 0 : a.is_paid ? -1 : 1;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const extratoGroups: any[] = [];
    const extratoTempGroups: Record<string, any[]> = {};
    filteredTransactions.forEach(t => {
        let baseName = t.name;
        const regex = /(\s*-\s*Parcela\s*\d+(?:\s*\/\s*\d+)?|\s*\(\d+\/\d+\)).*/i;
        if (regex.test(baseName)) {
            baseName = baseName.replace(regex, '').trim();
        }

        if (!extratoTempGroups[baseName]) extratoTempGroups[baseName] = [];
        extratoTempGroups[baseName].push(t);
    });

    Object.entries(extratoTempGroups).forEach(([name, txs]) => {
        if (txs.length > 1) {
            extratoGroups.push({
                isGroup: true,
                id: `extrato-group-${name}`,
                name: `${name}`,
                transactions: txs,
                totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
                type: txs[0].type,
                category_id: txs[0].category_id,
                is_paid: txs.every(t => t.is_paid),
                transaction_date: txs[0].transaction_date,
                payment_method: txs[0].payment_method
            });
        } else {
            extratoGroups.push({
                isGroup: false,
                id: txs[0].id.toString(),
                name: txs[0].name,
                transactions: [txs[0]],
                totalAmount: txs[0].amount,
                type: txs[0].type,
                category_id: txs[0].category_id,
                is_paid: txs[0].is_paid,
                transaction_date: txs[0].transaction_date,
                originalTx: txs[0],
                payment_method: txs[0].payment_method
            });
        }
    });

    extratoGroups.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
            comparison = new Date(a.transaction_date || '').getTime() - new Date(b.transaction_date || '').getTime();
        } else if (sortField === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'amount') {
            comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
        } else if (sortField === 'status') {
            comparison = (a.is_paid === b.is_paid) ? 0 : a.is_paid ? -1 : 1;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const summaryEntries = filteredTransactions.filter(t => t.type === 'Entrada' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
    const summaryExits = filteredTransactions.filter(t => t.type === 'Saida' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
    const geracaoCaixa = summaryEntries - summaryExits;
    const saldoFinal = selectedAccount?.current_balance || 0;
    const saldoInicial = saldoFinal - geracaoCaixa;

    const pendingEntries = accountTransactions.filter(t => t.type === 'Entrada' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
    const pendingExits = accountTransactions.filter(t => t.type === 'Saida' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
    const saldoPrevisto = saldoFinal + pendingEntries - pendingExits;

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTxs = accountTransactions.filter(t => t.transaction_date === dateStr && t.is_paid);
        const entradas = dayTxs.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.amount, 0);
        const saidas = dayTxs.filter(t => t.type === 'Saida').reduce((acc, t) => acc + t.amount, 0);
        return {
            date: format(date, 'dd/MM'),
            entradas,
            saidas
        };
    });

    return (
        <>
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 relative overflow-hidden">
                <div className="absolute right-4 top-4 opacity-10">
                    <Landmark size={80} />
                </div>
                <CardContent className="p-6 relative z-10">
                    <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                    <p className="text-4xl font-bold mt-1">{formatCurrency(selectedAccount?.current_balance || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Previsto: <span className="font-semibold">{formatCurrency(saldoPrevisto)}</span>
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Entradas recebidas</p>
                        <p className="text-lg font-bold text-green-500">+{formatCurrency(summaryEntries)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Saídas pagas</p>
                        <p className="text-lg font-bold text-red-500">-{formatCurrency(summaryExits)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Geração de caixa</p>
                        <p className={`text-lg font-bold ${geracaoCaixa >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {geracaoCaixa >= 0 ? '+' : ''}{formatCurrency(geracaoCaixa)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Saldo inicial</p>
                        <p className="text-lg font-bold">{formatCurrency(saldoInicial)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Saldo final</p>
                        <p className="text-lg font-bold">{formatCurrency(saldoFinal)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-sm">Entradas e saídas (Últimos 7 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last7Days}>
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-sm">Formas de Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {paymentData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                <p className="text-sm">Sem dados de entradas</p>
                            </div>
                        ) : (
                            <>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                dataKey="value"
                                            >
                                                {paymentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                    {paymentData.map(item => (
                                        <div key={item.name} className="flex items-center gap-1 text-xs">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-sm">Saídas por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                <p className="text-sm">Sem dados de saídas</p>
                            </div>
                        ) : (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card/50 border-border/50">
                <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <CardTitle className="text-sm">Extrato</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                        <div className="relative w-full sm:w-[250px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por transação..."
                                className="pl-8 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 h-9">
                                        <Filter className="h-4 w-4" /> Filtros
                                        {(filterType !== 'todos' || filterStatus !== 'todos') && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Ativo</Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 border-border/50">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Filtros do Extrato</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Refine as transações exibidas.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="space-y-2">
                                                <Label>Tipo</Label>
                                                <Select value={filterType} onValueChange={setFilterType}>
                                                    <SelectTrigger className="w-full bg-background">
                                                        <SelectValue placeholder="Tipo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="todos">Todos</SelectItem>
                                                        <SelectItem value="entrada">Entradas</SelectItem>
                                                        <SelectItem value="saida">Saídas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                    <SelectTrigger className="w-full bg-background">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="todos">Todos</SelectItem>
                                                        <SelectItem value="pago">Conciliado</SelectItem>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 pt-2 border-t border-border/50 mt-2">
                                                <Label>Ordenar por</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Select value={sortField} onValueChange={(val: any) => setSortField(val)}>
                                                        <SelectTrigger className="w-full bg-background">
                                                            <SelectValue placeholder="Campo" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="date">Data</SelectItem>
                                                            <SelectItem value="name">Transação</SelectItem>
                                                            <SelectItem value="amount">Valor</SelectItem>
                                                            <SelectItem value="status">Status</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={sortDirection} onValueChange={(val: any) => setSortDirection(val)}>
                                                        <SelectTrigger className="w-full bg-background">
                                                            <SelectValue placeholder="Direção" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="asc">Crescente</SelectItem>
                                                            <SelectItem value="desc">Decrescente</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <div className="flex items-center bg-background border border-input rounded-md h-9">
                                <Button variant="ghost" size="icon" className="h-full w-9 rounded-none rounded-l-md hover:bg-muted" onClick={handlePrevMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex-1 text-center text-sm font-medium px-4 capitalize min-w-[140px] text-foreground">
                                    {format(parse(filterMonth, "yyyy-MM", new Date()), 'MMMM yyyy', { locale: ptBR })}
                                </div>
                                <Button variant="ghost" size="icon" className="h-full w-9 rounded-none rounded-r-md hover:bg-muted" onClick={handleNextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">Nenhuma transação encontrada</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="hidden md:block rounded-md border border-border/50 overflow-x-auto overscroll-x-contain">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="min-w-[200px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                                onClick={() => toggleSort('name')}
                                            >
                                                Transação <SortIcon field="name" />
                                            </TableHead>
                                            <TableHead>Conta</TableHead>
                                            <TableHead className="text-center">Categoria</TableHead>
                                            <TableHead
                                                className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                                onClick={() => toggleSort('amount')}
                                            >
                                                Valor <SortIcon field="amount" />
                                            </TableHead>
                                            <TableHead
                                                className="text-center cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                                onClick={() => toggleSort('status')}
                                            >
                                                <div className="flex items-center justify-center">Status <SortIcon field="status" /></div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extratoGroups.map((group, index) => {
                                            const renderTx = (tx: any, isChild: boolean = false) => {
                                                const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                                                const isEntry = tx.type === 'Entrada';
                                                const isTransfer = tx.payment_method === 'Transferência';
                                                const isTedFee = tx.name.includes("Taxa de TED/DOC");
                                                return (
                                                    <TableRow key={tx.id} className={cn(isChild && "bg-muted/10 border-l-[3px] border-l-primary/30", isTedFee && "bg-yellow-500/5")}>
                                                        <TableCell className={cn(isChild && "pl-8")}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("p-1.5 rounded-full flex-shrink-0", isTedFee ? "bg-yellow-500/20 text-yellow-600" : isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"))}>
                                                                    {isTedFee ? <Receipt className="h-3 w-3" /> : isTransfer ? <RefreshCw className="h-3 w-3" /> : (isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                                                                </div>
                                                                <div>
                                                                    <p className={cn("text-sm leading-none mb-1", isTedFee ? "font-bold text-yellow-600 dark:text-yellow-500" : "font-medium")}>{tx.name}</p>
                                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{selectedAccount?.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            {category ? <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>{category.name}</Badge> : <span className="text-muted-foreground">-</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={cn("font-medium whitespace-nowrap", isEntry ? "text-green-500" : "text-red-500")}>
                                                                {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Badge variant={tx.is_paid ? 'default' : 'secondary'} className={cn("text-[10px]", tx.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>{tx.is_paid ? 'Pago' : 'Pendente'}</Badge>
                                                                {tx.is_paid && (
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleTogglePayment(tx, false); }} title="Reverter Pagamento">
                                                                        <RefreshCw className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            };

                                            if (!group.isGroup) {
                                                return renderTx(group.originalTx);
                                            }

                                            const isExpanded = expandedExtratoGroups[group.id];
                                            const type = group.type === 'Entrada';
                                            const isTransfer = group.payment_method === 'Transferência';
                                            return (
                                                <Fragment key={group.id}>
                                                    <TableRow className="cursor-pointer hover:bg-muted/50 bg-muted/5 transition-colors group" onClick={(e) => toggleExtratoGroup(group.id, e as any)}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 rounded-full flex-shrink-0 bg-primary/10 text-primary w-7 h-7 flex items-center justify-center font-bold text-[10px]">
                                                                    {group.transactions.length}x
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="text-sm font-semibold leading-none">{group.name}</p>
                                                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground">Múltiplas datas agrupadas</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{selectedAccount?.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            {group.category_id && getCategoryById(group.category_id) ? (
                                                                <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={{ borderColor: getCategoryById(group.category_id)?.color, color: getCategoryById(group.category_id)?.color }}>
                                                                    {getCategoryById(group.category_id)?.name}
                                                                </Badge>
                                                            ) : <span className="text-muted-foreground">-</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={cn("font-bold whitespace-nowrap", type ? "text-green-500" : "text-red-500")}>
                                                                {type ? '+' : '-'}{formatCurrency(group.totalAmount || 0)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={group.is_paid ? 'default' : 'outline'} className={cn("text-[10px]", group.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>{group.is_paid ? 'Total Pago' : 'Misto'}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && group.transactions.map((tx: any) => renderTx(tx, true))}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:hidden">
                                {extratoGroups.map((group, index) => {
                                    const renderCard = (tx: any, isChild: boolean = false) => {
                                        const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                                        const isEntry = tx.type === 'Entrada';
                                        const isTransfer = tx.payment_method === 'Transferência';
                                        const isTedFee = tx.name.includes("Taxa de TED/DOC");

                                        return (
                                            <div key={tx.id} className={cn("p-4 space-y-3", isChild ? "bg-muted/10 border-t border-border/40 pl-6" : isTedFee ? "bg-yellow-500/5 border border-yellow-500/30 rounded-xl" : "bg-card/50 border border-border/50 rounded-xl")}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("p-1.5 rounded-full flex-shrink-0", isTedFee ? "bg-yellow-500/20 text-yellow-600" : isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"))}>
                                                            {isTedFee ? <Receipt className="h-3.5 w-3.5" /> : isTransfer ? <RefreshCw className="h-3.5 w-3.5" /> : (isEntry ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
                                                        </div>
                                                        <div>
                                                            <p className={cn("text-sm leading-snug", isTedFee ? "font-bold text-yellow-600 dark:text-yellow-500" : "font-semibold text-foreground")}>{tx.name}</p>
                                                            <span className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                                        </div>
                                                    </div>
                                                    <span className={cn("font-bold text-sm whitespace-nowrap", isEntry ? "text-green-500" : "text-red-500")}>
                                                        {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Landmark className="h-3 w-3" />
                                                        <span>{selectedAccount?.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {category && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>
                                                                {category.name}
                                                            </Badge>
                                                        )}
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant={tx.is_paid ? 'default' : 'secondary'} className={cn("text-[10px] py-0 px-2 font-normal", tx.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>
                                                                {tx.is_paid ? 'Pago' : 'Pendente'}
                                                            </Badge>
                                                            {tx.is_paid && (
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleTogglePayment(tx, false); }} title="Reverter Pagamento">
                                                                    <RefreshCw className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    };

                                    if (!group.isGroup) {
                                        return renderCard(group.originalTx);
                                    }

                                    const isExpanded = expandedExtratoGroups[group.id];
                                    const type = group.type === 'Entrada';
                                    const isTransfer = group.payment_method === 'Transferência';

                                    return (
                                        <div key={group.id} className="bg-card/50 border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                            <div
                                                className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                                onClick={(e) => toggleExtratoGroup(group.id, e as any)}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-full flex-shrink-0 bg-primary/10 text-primary w-8 h-8 flex items-center justify-center font-bold text-[10px]">
                                                            {group.transactions.length}x
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <p className="text-sm font-semibold text-foreground leading-snug">{group.name}</p>
                                                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">Múltiplas parcelas</span>
                                                        </div>
                                                    </div>
                                                    <span className={cn("font-bold text-sm whitespace-nowrap", type ? "text-green-500" : "text-red-500")}>
                                                        {type ? '+' : '-'}{formatCurrency(group.totalAmount || 0)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Landmark className="h-3 w-3" />
                                                        <span>{selectedAccount?.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {group.category_id && getCategoryById(group.category_id) && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal" style={{ borderColor: getCategoryById(group.category_id)?.color, color: getCategoryById(group.category_id)?.color }}>
                                                                {getCategoryById(group.category_id)?.name}
                                                            </Badge>
                                                        )}
                                                        <Badge variant={group.is_paid ? 'default' : 'outline'} className={cn("text-[10px] py-0 px-2 font-normal", group.is_paid ? "bg-green-500/10 text-green-500" : "")}>
                                                            {group.is_paid ? 'Total Pago' : 'Misto'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="divide-y divide-border/30 bg-muted/5">
                                                    {group.transactions.map((tx: any) => renderCard(tx, true))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {futureGroupsArray.length > 0 && (
                <Card className="bg-card/50 border-border/50 mt-6">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-orange-500" />
                            Lançamentos Futuros e Parcelamentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {futureGroupsArray.map(group => {
                                const isExpanded = expandedFutureGroups[group.name];

                                return (
                                    <div key={group.name} className="border border-border/50 rounded-lg overflow-hidden">
                                        <div
                                            className="bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                            onClick={() => toggleFutureGroup(group.name)}
                                        >
                                            <div>
                                                <h4 className="font-semibold text-sm leading-snug">{group.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Próximo venc.: {format(new Date(group.nextDate), "dd/MM/yyyy")} • {group.installmentsCount} {group.installmentsCount === 1 ? 'parcela' : 'parcelas'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                                                <span className="font-bold text-sm text-foreground">
                                                    {formatCurrency(group.totalAmount)}
                                                </span>
                                                <div className="p-1.5 rounded-md bg-background border shrink-0">
                                                    {isExpanded ? <ArrowDownRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-background divide-y divide-border/40">
                                                {group.transactions.map((tx: any) => {
                                                    const isTransfer = tx.payment_method === 'Transferência';
                                                    const isEntry = tx.type === 'Entrada';

                                                    return (
                                                        <div key={tx.id} className="p-3 pl-4 sm:pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                                                            <div className="flex items-start sm:items-center gap-3">
                                                                <div className={cn(
                                                                    "p-1.5 rounded-full flex-shrink-0 mt-0.5 sm:mt-0",
                                                                    isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")
                                                                )}>
                                                                    {isTransfer ? <RefreshCw className="h-3 w-3" /> : (isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium leading-snug">{tx.name}</p>
                                                                    <span className="text-[10px] text-muted-foreground block mt-0.5">Vencimento: {format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-8 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                                                                <span className="font-semibold text-sm whitespace-nowrap">
                                                                    {formatCurrency(tx.amount)}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border-green-500/20 shrink-0"
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(tx); }}
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                                    Pagar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
