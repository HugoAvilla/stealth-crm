import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Settings, ArrowUpRight, ArrowDownRight, RefreshCw, Plus,
  Search, Calendar as CalendarIcon, Filter, ArrowUpDown, Landmark, FolderPlus, FolderTree, ArrowRightLeft, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";
import { EditAccountModal } from "@/components/contas/EditAccountModal";
import { AddTransactionModal } from "@/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/components/financeiro/AddTransferModal";
import { NewCategoryModal } from "@/components/financeiro/NewCategoryModal";
import { ManageCategoriesModal } from "@/components/financeiro/ManageCategoriesModal";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: number;
  name: string;
  account_type: string | null;
  current_balance: number | null;
  is_main: boolean | null;
  is_active: boolean | null;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  name: string;
  description: string | null;
  transaction_date: string;
  payment_method: string | null;
  is_paid: boolean | null;
  category_id: number | null;
  account_id: number | null;
}

interface Category {
  id: number;
  name: string;
  type: string;
  color: string | null;
}

export default function Contas() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // New states for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // New states for FAB modals
  const [fabOpen, setFabOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

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

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("transaction_date", { ascending: false });

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id);

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      setCategories(categoriesData || []);

      // Set initial selected account
      if (accountsData && accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountTransactions = transactions.filter(t => t.account_id === selectedAccountId);

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

  const getCategoryById = (id: number) => categories.find(c => c.id === id);

  const formatCurrency = (value: number) => {
    if (!showValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Computed variables for filters and summaries
  let filteredTransactions = accountTransactions;

  if (startDate) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_date >= startDate);
  }
  if (endDate) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_date <= endDate);
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

  const summaryEntries = filteredTransactions.filter(t => t.type === 'Entrada' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const summaryExits = filteredTransactions.filter(t => t.type === 'Saida' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const geracaoCaixa = summaryEntries - summaryExits;
  const saldoFinal = selectedAccount?.current_balance || 0;
  const saldoInicial = saldoFinal - geracaoCaixa;

  // Expected balance (Saldo Atual + Pendentes)
  const pendingEntries = accountTransactions.filter(t => t.type === 'Entrada' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const pendingExits = accountTransactions.filter(t => t.type === 'Saida' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const saldoPrevisto = saldoFinal + pendingEntries - pendingExits;

  // Last 7 days chart data
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

  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const date = t.transaction_date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const handleAccountCreated = () => {
    fetchData();
  };

  const handleAccountUpdated = () => {
    fetchData();
  };

  const handleAccountDeleted = (accountId: number) => {
    const remaining = accounts.filter(a => a.id !== accountId);
    if (selectedAccountId === accountId && remaining.length > 0) {
      setSelectedAccountId(remaining[0].id);
    }
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <HelpOverlay
        tabId="contas"
        title="Guia de Contas"
        sections={[
          {
            title: "Vídeo Aula — Contas",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da guia de contas.",
            videoUrl: "/help/video-aula-conta.mov"
          },
          {
            title: "Selecionar Conta",
            description: "Na barra lateral esquerda estão listadas todas as suas contas (corrente, poupança, carteira). Clique em uma conta para ver seus detalhes. Use o botão '+' para criar uma nova conta e '👁' para ocultar os valores.",
            screenshotUrl: "/help/help-contas-selecionar.png"
          },
          {
            title: "Gráficos de Análise",
            description: "O gráfico de pizza mostra a distribuição das formas de pagamento (Pix, Dinheiro, Crédito, etc). O gráfico de barras mostra as saídas organizadas por categoria (Aluguel, Material, etc).",
            screenshotUrl: "/help/help-contas-graficos.png"
          },
          {
            title: "Extrato Detalhado",
            description: "O extrato mostra todas as transações da conta selecionada, agrupadas por data. Entradas aparecem em verde (+) e saídas em vermelho (-). Cada transação mostra se está confirmada ou pendente.",
            screenshotUrl: "/help/help-contas-extrato.png"
          },
        ]}
      />

      {/* Left sidebar - Account selection */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-4 overflow-x-auto md:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contas</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowValues(!showValues)}>
              {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma conta cadastrada</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Criar Conta
            </Button>
          </div>
        ) : (
          <div className="flex md:flex-col gap-2 md:space-y-0">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "min-w-[200px] md:min-w-0 w-full p-3 rounded-lg text-left transition-colors relative group flex-shrink-0",
                  selectedAccountId === account.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card/50 border border-border/50 hover:bg-accent"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAccount(account);
                  }}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                >
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </button>

                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{account.name}</span>
                  {account.is_main && (
                    <Badge variant="outline" className="text-[10px]">Principal</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{account.account_type}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(account.current_balance || 0)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {selectedAccount ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selectedAccount.name}</h1>
                <p className="text-muted-foreground">{selectedAccount.account_type}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={fabOpen} onOpenChange={setFabOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-6">
                      Adicionar <Plus className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl bg-background border-border/50">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold mb-4">Escolha o que deseja fazer</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <button onClick={() => { setFabOpen(false); setTransactionType('entrada'); setTransactionModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowUpRight className="h-8 w-8 text-green-500" />
                        <span className="font-medium text-sm text-center">Nova entrada na conta</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setTransactionType('saida'); setTransactionModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowDownRight className="h-8 w-8 text-red-500" />
                        <span className="font-medium text-sm text-center">Nova saída na conta</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setTransferModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowRightLeft className="h-8 w-8 text-blue-500" />
                        <span className="font-medium text-sm text-center">Nova transferência</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setCategoryModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <FolderPlus className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Nova categoria</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setManageCategoriesOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <FolderTree className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Gerenciar categorias</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setShowAddModal(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <Landmark className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Nova conta</span>
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setEditingAccount(selectedAccount)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 relative overflow-hidden">
              <div className="absolute right-4 top-4 opacity-10">
                <Landmark size={80} />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(selectedAccount.current_balance || 0)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Previsto: <span className="font-semibold">{formatCurrency(saldoPrevisto)}</span>
                </p>
              </CardContent>
            </Card>

            {/* Resumo do Período */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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

            {/* Evolução Últimos 7 dias */}
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
                      <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Methods */}
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

              {/* Categories */}
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

            {/* Transactions Table */}
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
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[110px] bg-background">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="entrada">Entradas</SelectItem>
                        <SelectItem value="saida">Saídas</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[120px] bg-background">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pago">Conciliado</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input 
                      type="date" 
                      className="w-full sm:w-[130px] bg-background text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input 
                      type="date" 
                      className="w-full sm:w-[130px] bg-background text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhuma transação encontrada</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/50 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Transação</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead className="text-center">Categoria</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Valor</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map(tx => {
                          const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                          const isEntry = tx.type === 'Entrada';

                          return (
                            <TableRow key={tx.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-full flex-shrink-0",
                                    isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                  )}>
                                    {isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium leading-none mb-1">{tx.name}</p>
                                    <span className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{selectedAccount?.name}</TableCell>
                              <TableCell className="text-center">
                                {category ? (
                                  <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>
                                    {category.name}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  "font-medium whitespace-nowrap",
                                  isEntry ? "text-green-500" : "text-red-500"
                                )}>
                                  {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={tx.is_paid ? 'default' : 'secondary'} className={cn(
                                  "text-[10px]",
                                  tx.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""
                                )}>
                                  {tx.is_paid ? 'Recebido' : 'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p>Selecione ou crie uma conta para visualizar</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Criar Conta
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* Modals */}
      <AddAccountModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleAccountCreated}
      />
      <EditAccountModal
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
        onAccountUpdated={handleAccountUpdated}
        onAccountDeleted={handleAccountDeleted}
        canDelete={accounts.length > 1}
      />
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
      <NewCategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        onSuccess={fetchData}
      />
      <ManageCategoriesModal
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        onCategoriesChange={fetchData}
      />
    </div>
  );
}
