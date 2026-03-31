import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Landmark, PiggyBank, Wallet, TrendingUp, CreditCard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: number;
  name: string;
  account_type: string | null;
  current_balance: number | null;
  is_main: boolean | null;
}

interface Transaction {
  id: number;
  name: string;
  amount: number;
  type: string;
  transaction_date: string;
}

interface AccountDetailsModalProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDetailsModal({ account, open, onOpenChange }: AccountDetailsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "Entrada" | "Saída">("all");

  useEffect(() => {
    if (open && account) {
      fetchTransactions();
    }
  }, [open, account]);

  const fetchTransactions = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("transactions")
        .select("id, name, amount, type, transaction_date")
        .eq("account_id", account.id)
        .order("transaction_date", { ascending: false })
        .limit(300); // Fetch more for client-side filtering
      
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type: string | null) => {
    switch (type) {
      case 'Conta Corrente': return <Landmark className="h-6 w-6" />;
      case 'Poupança': return <PiggyBank className="h-6 w-6" />;
      case 'Carteira': return <Wallet className="h-6 w-6" />;
      case 'Investimento': return <TrendingUp className="h-6 w-6" />;
      default: return <CreditCard className="h-6 w-6" />;
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const filteredTransactions = transactions.filter(t => {
    let pass = true;
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      pass = false;
    }
    if (filterType !== "all" && t.type !== filterType) {
      pass = false;
    }
    return pass;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Conta</DialogTitle>
        </DialogHeader>
        
        {account && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                {getAccountIcon(account.account_type)}
              </div>
              <div>
                <h3 className="text-xl font-bold leading-none mb-1">{account.name}</h3>
                <p className="text-sm text-muted-foreground">{account.account_type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border p-4 rounded-xl text-center">
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Saldo Atual</p>
                <p className="text-2xl font-bold font-mono tracking-tight text-primary">
                  {formatCurrency(account.current_balance || 0)}
                </p>
              </div>
              <div className="bg-card border p-4 rounded-xl text-center flex flex-col justify-center items-center">
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
                {account.is_main ? (
                  <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                    Conta Principal
                  </span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                    Conta Secundária
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold">Transações da Conta</h4>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:max-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center rounded-md border p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs rounded-sm ${filterType === 'all' ? 'bg-secondary' : ''}`}
                      onClick={() => setFilterType('all')}
                    >
                      Todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs rounded-sm ${filterType === 'Entrada' ? 'bg-green-500/20 text-green-600' : ''}`}
                      onClick={() => setFilterType('Entrada')}
                    >
                      Entradas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs rounded-sm ${filterType === 'Saída' ? 'bg-red-500/20 text-red-600' : ''}`}
                      onClick={() => setFilterType('Saída')}
                    >
                      Saídas
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed">Nenhuma transação encontrada nesta conta.</p>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {filteredTransactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`text-sm font-bold whitespace-nowrap ${t.type === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
