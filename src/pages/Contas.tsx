import { useState } from "react";
import { Eye, EyeOff, Settings, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accounts, transactions, categories, getCategoryById, getAccountById } from "@/lib/mockData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";

export default function Contas() {
  const [selectedAccountId, setSelectedAccountId] = useState<number>(accounts[0]?.id || 1);
  const [showValues, setShowValues] = useState(true);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountTransactions = transactions.filter(t => 
    t.account_id === selectedAccountId || t.to_account_id === selectedAccountId
  );

  // Payment methods breakdown
  const paymentData = [
    { name: 'Pix', value: 3430, color: '#22c55e' },
    { name: 'Dinheiro', value: 1230, color: '#3b82f6' },
    { name: 'Crédito', value: 350, color: '#8b5cf6' },
    { name: 'Boleto', value: 3100, color: '#f97316' }
  ];

  // Categories breakdown
  const categoryData = categories
    .filter(c => c.type === 'saida')
    .slice(0, 5)
    .map(cat => ({
      name: cat.name,
      value: transactions.filter(t => t.category_id === cat.id).reduce((s, t) => s + t.amount, 0),
      color: cat.color
    }))
    .filter(c => c.value > 0);

  const formatCurrency = (value: number) => {
    if (!showValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const groupedTransactions = accountTransactions.reduce((groups, t) => {
    const date = t.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {} as Record<string, typeof transactions>);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar - Account selection */}
      <div className="w-72 border-r border-border/50 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contas</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowValues(!showValues)}>
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        <div className="space-y-2">
          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={cn(
                "w-full p-3 rounded-lg text-left transition-colors",
                selectedAccountId === account.id
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-card/50 border border-border/50 hover:bg-accent"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{account.name}</span>
                {account.is_primary && (
                  <Badge variant="outline" className="text-[10px]">Principal</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{account.type}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(account.balance)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{selectedAccount?.name}</h1>
            <p className="text-muted-foreground">{selectedAccount?.type}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-4xl font-bold">{formatCurrency(selectedAccount?.balance || 0)}</p>
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
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Saídas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Extrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedTransactions)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, txs]) => (
                <div key={date}>
                  <p className="text-xs text-muted-foreground mb-2">
                    {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="space-y-2">
                    {txs.map(tx => {
                      const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                      const isTransferIn = tx.type === 'transferencia' && tx.to_account_id === selectedAccountId;
                      const isTransferOut = tx.type === 'transferencia' && tx.account_id === selectedAccountId;

                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              tx.type === 'entrada' || isTransferIn ? "bg-green-500/10" : "bg-red-500/10"
                            )}>
                              {tx.type === 'transferencia' ? (
                                <RefreshCw className={cn("h-4 w-4", isTransferIn ? "text-green-500" : "text-red-500")} />
                              ) : tx.type === 'entrada' ? (
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              {category && (
                                <Badge variant="outline" className="text-[10px] mt-1" style={{ borderColor: category.color, color: category.color }}>
                                  {category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-medium",
                              tx.type === 'entrada' || isTransferIn ? "text-green-500" : "text-red-500"
                            )}>
                              {tx.type === 'entrada' || isTransferIn ? '+' : '-'}{formatCurrency(tx.amount)}
                            </p>
                            <Badge variant={tx.status === 'confirmado' ? 'default' : 'secondary'} className="text-[10px]">
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
