import { useState } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, TrendingUp, Eye, EyeOff, Landmark, PiggyBank, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { accounts, transactions, categories, getCategoryById, getAccountById } from "@/lib/mockData";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { AddTransactionModal } from "@/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/components/financeiro/AddTransferModal";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";

export default function Financeiro() {
  const [showValues, setShowValues] = useState(true);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const totalEntradas = transactions
    .filter(t => t.type === 'entrada' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.amount, 0);

  // Generate chart data for last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const entradas = dayTransactions.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
    const saidas = dayTransactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
    
    return {
      date: format(date, 'dd/MM'),
      entradas,
      saidas,
      saldo: entradas - saidas
    };
  });

  const getAccountIcon = (type: string) => {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(account => (
              <Card key={account.id} className={cn(
                "bg-gradient-to-br border",
                account.is_primary ? "from-primary/20 to-primary/5 border-primary/30" : "from-muted/50 to-muted/20 border-border/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getAccountIcon(account.type)}
                      <span className="font-medium">{account.name}</span>
                    </div>
                    {account.is_primary && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{account.type}</p>
                  <p className="text-2xl font-bold">{formatCurrency(account.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        type={transactionType}
      />
      <AddTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
      />
      <AddAccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
      />
    </div>
  );
}
