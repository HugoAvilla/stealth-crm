import { useState, useEffect } from "react";
import { Eye, EyeOff, Settings, ArrowUpRight, ArrowDownRight, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";
import { EditAccountModal } from "@/components/contas/EditAccountModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
        .order("transaction_date", { ascending: false })
        .limit(100);

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

  const groupedTransactions = accountTransactions.reduce((groups, t) => {
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
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-72 border-r border-border/50 p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
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

      {/* Left sidebar - Account selection */}
      <div className="w-72 border-r border-border/50 p-4 space-y-4 overflow-y-auto">
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
          <div className="space-y-2">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors relative group",
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{selectedAccount.name}</h1>
                <p className="text-muted-foreground">{selectedAccount.account_type}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setEditingAccount(selectedAccount)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className="text-4xl font-bold">{formatCurrency(selectedAccount.current_balance || 0)}</p>
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

            {/* Transactions */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Extrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(groupedTransactions).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhuma transação registrada</p>
                  </div>
                ) : (
                  Object.entries(groupedTransactions)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, txs]) => (
                      <div key={date}>
                        <p className="text-xs text-muted-foreground mb-2">
                          {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="space-y-2">
                          {txs.map(tx => {
                            const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                            const isEntry = tx.type === 'Entrada';

                            return (
                              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-full",
                                    isEntry ? "bg-green-500/10" : "bg-red-500/10"
                                  )}>
                                    {isEntry ? (
                                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{tx.name}</p>
                                    {category && (
                                      <Badge variant="outline" className="text-[10px] mt-1" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>
                                        {category.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={cn(
                                    "font-medium",
                                    isEntry ? "text-green-500" : "text-red-500"
                                  )}>
                                    {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </p>
                                  <Badge variant={tx.is_paid ? 'default' : 'secondary'} className="text-[10px]">
                                    {tx.is_paid ? 'Confirmado' : 'Pendente'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
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
    </div>
  );
}
