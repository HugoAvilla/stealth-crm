import { useState, useEffect } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, TrendingUp, Eye, EyeOff, Landmark, PiggyBank, CreditCard, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfMonth, endOfMonth, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { AddTransactionModal } from "@/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/components/financeiro/AddTransferModal";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";
import { ManageCategoriesModal } from "@/components/financeiro/ManageCategoriesModal";
import { AccountDetailsModal } from "@/components/financeiro/AccountDetailsModal";
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
}

interface Transfer {
  id: number;
  amount: number;
  transfer_date: string;
  from_account_id: number;
  to_account_id: number;
}

export default function Financeiro() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("is_main", { ascending: false });

      // Fetch transactions up to 7 days in the future for forecasts
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const futureEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", futureEnd)
        .order("transaction_date", { ascending: false });

      // Fetch transfers for the last 7 days and future 7 days
      const pastStart = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data: transfersData } = await supabase
        .from("transfers")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("transfer_date", pastStart)
        .lte("transfer_date", futureEnd)
        .order("transfer_date", { ascending: false });

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      setTransfers(transfersData || []);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEndStr = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const futureEndStr = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  const monthTransactions = transactions.filter(t => t.transaction_date >= monthStartStr && t.transaction_date <= monthEndStr);
  const futureTransactions = transactions.filter(t => t.transaction_date > todayStr && t.transaction_date <= futureEndStr);

  const totalEntradas = monthTransactions
    .filter(t => t.type === 'Entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = monthTransactions
    .filter(t => t.type === 'Saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const futureEntradas = futureTransactions
    .filter(t => t.type === 'Entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const futureSaidas = futureTransactions
    .filter(t => t.type === 'Saida')
    .reduce((sum, t) => sum + t.amount, 0);

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

    const dayTransactions = transactions.filter(t => t.transaction_date === dateStr);
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
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const openTransactionModal = (type: 'entrada' | 'saida') => {
    setTransactionType(type);
    setTransactionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="financeiro"
        title="Guia Financeiro"
        sections={[
          {
            title: "Registrar Movimentações",
            description: "Clique em 'Adicionar' para registrar: Nova Entrada (receita), Nova Saída (despesa), Transferência (entre contas) ou Nova Conta. Cada movimentação é associada a uma conta e categoria.",
            screenshotUrl: "/help/help-financeiro-adicionar.png"
          },
          {
            title: "Cards de Resumo",
            description: "Os 3 cards no topo mostram: Saldo Total (soma de todas as contas), Entradas do mês (total de receitas) com previsão de próximos 7 dias, e Saídas do mês (total de despesas) com previsão. Use o ícone 👁 para ocultar/mostrar valores.",
            screenshotUrl: "/help/help-financeiro-resumo.png"
          },
          {
            title: "Gráfico de Evolução",
            description: "O gráfico de área mostra a evolução cumulativa do seu saldo através dos dias. Representa efetivamente o dinheiro real disponível em caixa ao longo do tempo.",
            screenshotUrl: "/help/help-financeiro-grafico.png"
          },
          {
            title: "Gerenciar Contas e Categorias",
            description: "Na seção 'Minhas Contas' você vê o saldo de cada conta (corrente, poupança, carteira). Use 'Gerenciar Categorias' no menu para criar categorias como 'Aluguel', 'Material', etc.",
            screenshotUrl: "/help/help-financeiro-contas.png"
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe o fluxo de caixa da empresa</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={() => setShowValues(!showValues)}>
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
          <div className="p-6 pb-4 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                 <ArrowUpRight className="h-4 w-4" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Entradas</span>
              </div>
            </div>
            
            <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Realizado no Mês</p>
               <p className="text-3xl font-bold text-foreground">{formatCurrency(totalEntradas)}</p>
            </div>
          </div>
          <div className="bg-green-500/5 px-6 py-3 border-t border-green-500/10 flex justify-between items-center">
             <span className="text-xs text-muted-foreground">Previsão (Próx. 7 dias)</span>
             <span className="text-sm font-semibold text-green-500">+{formatCurrency(futureEntradas)}</span>
          </div>
        </Card>

        {/* Saídas Card */}
        <Card className="md:col-span-6 lg:col-span-4 bg-card/50 border-border/50 relative overflow-hidden flex flex-col">
          <div className="p-6 pb-4 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                 <ArrowDownRight className="h-4 w-4" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Saídas</span>
              </div>
            </div>
            
            <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Pago no Mês</p>
               <p className="text-3xl font-bold text-foreground">{formatCurrency(totalSaidas)}</p>
            </div>
          </div>
          <div className="bg-red-500/5 px-6 py-3 border-t border-red-500/10 flex justify-between items-center">
             <span className="text-xs text-muted-foreground">Previsão (Próx. 7 dias)</span>
             <span className="text-sm font-semibold text-red-500">-{formatCurrency(futureSaidas)}</span>
          </div>
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
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                <BarChart data={transferChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value.toLocaleString('pt-BR', { notation: "compact" })}`} 
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
