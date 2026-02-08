import { useState, useEffect } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, TrendingUp, Eye, EyeOff, Landmark, PiggyBank, CreditCard, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { AddTransactionModal } from "@/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/components/financeiro/AddTransferModal";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";
import { ManageCategoriesModal } from "@/components/financeiro/ManageCategoriesModal";
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

export default function Financeiro() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

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

      // Fetch transactions for current month
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd)
        .order("transaction_date", { ascending: false });

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
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

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  
  const totalEntradas = transactions
    .filter(t => t.type === 'Entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'Saida')
    .reduce((sum, t) => sum + t.amount, 0);

  // Generate chart data for last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTransactions = transactions.filter(t => t.transaction_date === dateStr);
    const entradas = dayTransactions.filter(t => t.type === 'Entrada').reduce((s, t) => s + t.amount, 0);
    const saidas = dayTransactions.filter(t => t.type === 'Saida').reduce((s, t) => s + t.amount, 0);
    
    return {
      date: format(date, 'dd/MM'),
      entradas,
      saidas,
      saldo: entradas - saidas
    };
  });

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe o fluxo de caixa da empresa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowValues(!showValues)}>
            {showValues ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">{accounts.length} contas</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas (Mês)</p>
                <p className="text-3xl font-bold text-green-500">{formatCurrency(totalEntradas)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <ArrowUpRight className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saídas (Mês)</p>
                <p className="text-3xl font-bold text-red-500">{formatCurrency(totalSaidas)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <ArrowDownRight className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Saldo (Últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                />
                <Line type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Entradas" />
                <Line type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Saídas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Minhas Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhuma conta cadastrada</p>
              <Button onClick={() => setAccountModalOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Cadastrar Primeira Conta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map(account => (
                <Card key={account.id} className={cn(
                  "bg-gradient-to-br border",
                  account.is_main ? "from-primary/20 to-primary/5 border-primary/30" : "from-muted/50 to-muted/20 border-border/50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(account.account_type)}
                        <span className="font-medium">{account.name}</span>
                      </div>
                      {account.is_main && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Principal</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{account.account_type}</p>
                    <p className="text-2xl font-bold">{formatCurrency(account.current_balance || 0)}</p>
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
    </div>
  );
}
