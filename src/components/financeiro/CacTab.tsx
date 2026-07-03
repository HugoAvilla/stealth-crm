import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CAC_ORIGIN_OPTIONS, CacOrigin } from "@/constants/origins";
import { toast } from "sonner";
import { Target, TrendingUp, Users, DollarSign, PieChart, Plus, RefreshCw, UserPlus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { RoasEntryModal } from "./RoasEntryModal";
import { createExpenseTransaction } from "@/lib/financialTransactions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CacTab() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  const [loading, setLoading] = useState(false);
  const [isRoasModalOpen, setIsRoasModalOpen] = useState(false);
  const [targetRoas, setTargetRoas] = useState<number>(4);

  // Seller Expense Card States
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerId, setSellerId] = useState<string>("");
  const [sellerAmount, setSellerAmount] = useState<string>("");
  const [sellerDate, setSellerDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [sellerDescription, setSellerDescription] = useState<string>("");
  const [submittingSellerExpense, setSubmittingSellerExpense] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<string>("");

  useEffect(() => {
    if (user?.companyId) {
      fetchSellers();
      fetchAccounts();
    }
  }, [user?.companyId]);

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_people')
        .select('id, name')
        .eq('company_id', user.companyId)
        .eq('type', 'VENDEDOR')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setSellers(data || []);
    } catch (e) {
      console.error("Error fetching sellers", e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, is_main')
        .eq('company_id', user.companyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAccounts(data || []);
      
      // Define a conta principal como padrão inicial, ou a primeira da lista
      const mainAcc = data?.find(a => a.is_main);
      if (mainAcc) {
        setAccountId(mainAcc.id.toString());
      } else if (data && data.length > 0) {
        setAccountId(data[0].id.toString());
      }
    } catch (e) {
      console.error("Error fetching accounts", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("@stealth-crm:target-roas");
    if (saved) setTargetRoas(Number(saved));
  }, []);

  const handleTargetRoasChange = (val: string) => {
    if (val === '') {
      setTargetRoas(0);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setTargetRoas(num);
      localStorage.setItem("@stealth-crm:target-roas", num.toString());
    }
  };

  // States for aggregated data
  const [totalCac, setTotalCac] = useState(0);
  const [marketingCost, setMarketingCost] = useState(0);
  const [salesCost, setSalesCost] = useState(0);
  const [newPayingClients, setNewPayingClients] = useState(0);
  const [cohortRevenue, setCohortRevenue] = useState(0);

  const [channelStats, setChannelStats] = useState<any[]>([]);
  const [cacTransactions, setCacTransactions] = useState<any[]>([]);
  const [sellerRanking, setSellerRanking] = useState<any[]>([]);

  // New vs Returning stats
  const [newClientSales, setNewClientSales] = useState(0);
  const [returningClientSales, setReturningClientSales] = useState(0);
  const [newClientRevenue, setNewClientRevenue] = useState(0);
  const [returningClientRevenue, setReturningClientRevenue] = useState(0);

  useEffect(() => {
    fetchCacData();
  }, [startDate, endDate]);

  const fetchCacData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;

      const companyId = profile.company_id;

      // 1. Fetch Expenses marked as CAC
      const { data: cacTxData, error: cacError } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('include_in_cac', true)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (cacError) throw cacError;

      const transactions = (cacTxData || []) as any[];
      setCacTransactions(transactions);

      // 1.2 Fetch Commissions in period
      const { data: commData, error: commError } = await supabase
        .from('sale_commissions')
        .select(`
          commission_amount,
          commission_person_id,
          person_name_snapshot,
          person_type,
          sale:sales!inner(sale_date, status, total)
        `)
        .eq('company_id', companyId)
        .eq('sale.status', 'Fechada')
        .gte('sale.sale_date', startDate)
        .lte('sale.sale_date', endDate);

      if (commError) throw commError;

      const commissions = (commData || []) as any[];

      // Agrupar ranking de vendedores
      const sellerPerformance: Record<string, {
        id: number;
        name: string;
        vendasCount: number;
        faturamentoTotal: number;
        comissaoTotal: number;
      }> = {};

      commissions.forEach((c: any) => {
        if (c.person_type === 'VENDEDOR' && c.commission_person_id) {
          const sellerId = c.commission_person_id;
          if (!sellerPerformance[sellerId]) {
            sellerPerformance[sellerId] = {
              id: sellerId,
              name: c.person_name_snapshot || 'Vendedor',
              vendasCount: 0,
              faturamentoTotal: 0,
              comissaoTotal: 0
            };
          }
          sellerPerformance[sellerId].vendasCount += 1;
          sellerPerformance[sellerId].faturamentoTotal += Number(c.sale?.total || 0);
          sellerPerformance[sellerId].comissaoTotal += Number(c.commission_amount || 0);
        }
      });

      const sellersRank = Object.values(sellerPerformance).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
      setSellerRanking(sellersRank);

      // Soma de comissões de vendedores no período
      const totalComissoesVendedores = commissions
        .filter((c: any) => c.person_type === 'VENDEDOR')
        .reduce((sum: number, c: any) => sum + Number(c.commission_amount || 0), 0);

      let tCac = totalComissoesVendedores;
      let mCost = 0;
      let sCost = totalComissoesVendedores;
      // Object to hold specific costs (not Geral)
      const costByOrigin: Record<string, number> = {};
      let geralCost = 0;

      transactions.forEach((tx) => {
        tCac += Number(tx.amount);
        if (tx.cac_bucket === 'marketing') mCost += Number(tx.amount);
        if (tx.cac_bucket === 'vendas') sCost += Number(tx.amount);

        const origin = tx.cac_origin || 'Desconhecido';
        if (origin === 'Geral') {
          geralCost += Number(tx.amount);
        } else {
          costByOrigin[origin] = (costByOrigin[origin] || 0) + Number(tx.amount);
        }
      });

      setTotalCac(tCac);
      setMarketingCost(mCost);
      setSalesCost(sCost);

      // 2. Fetch New Clients created in period
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, origem, created_at')
        .eq('company_id', companyId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      if (clientsError) throw clientsError;
      const clients = clientsData || [];

      // 3. Fetch Closed Sales in the period to find paying clients and their revenue
      // (Cohort: clients created in this period who also bought in this period)
      const clientIds = clients.map(c => c.id);
      
      let salesData: any[] = [];
      if (clientIds.length > 0) {
        const { data: sData, error: salesError } = await supabase
          .from('sales')
          .select('client_id, total')
          .in('client_id', clientIds)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .eq('status', 'Fechada');
          
        if (salesError) throw salesError;
        salesData = sData || [];
      }

      // Aggregate revenue and count paying clients by origin
      const payingClientsByOrigin: Record<string, Set<number>> = {};
      const revenueByOrigin: Record<string, number> = {};
      
      let totPayingClients = 0;
      let totRevenue = 0;

      const payingClientIds = new Set(salesData.map(s => s.client_id));

      salesData.forEach(sale => {
        const client = clients.find(c => c.id === sale.client_id);
        const origin = client?.origem || 'Passante';
        
        revenueByOrigin[origin] = (revenueByOrigin[origin] || 0) + Number(sale.total);
        totRevenue += Number(sale.total);
      });

      clients.forEach(client => {
        if (payingClientIds.has(client.id)) {
          const origin = client.origem || 'Passante';
          if (!payingClientsByOrigin[origin]) {
            payingClientsByOrigin[origin] = new Set();
          }
          payingClientsByOrigin[origin].add(client.id);
        }
      });

      // Count unique paying clients
      Object.values(payingClientsByOrigin).forEach(set => {
        totPayingClients += set.size;
      });

      setNewPayingClients(totPayingClients);
      setCohortRevenue(totRevenue);

      // 4. Calculate stats per channel and prorate "Geral"
      const geralCostPerClient = totPayingClients > 0 ? geralCost / totPayingClients : 0;

      const stats = CAC_ORIGIN_OPTIONS.filter(o => o !== 'Geral').map((origin) => {
        const pClients = payingClientsByOrigin[origin]?.size || 0;
        const rev = revenueByOrigin[origin] || 0;
        
        // Direct cost for this origin
        const directCost = costByOrigin[origin] || 0;
        // Prorated general cost
        const proratedCost = pClients * geralCostPerClient;
        
        const totCost = directCost + proratedCost;
        
        const cac = pClients > 0 ? totCost / pClients : 0;
        const roas = totCost > 0 ? rev / totCost : 0;

        return {
          origem: origin,
          direto: directCost,
          rateado: proratedCost,
          custoTotal: totCost,
          clientesPagantes: pClients,
          cac: cac,
          receita: rev,
          roas: roas
        };
      });

      // Sort by paying clients descending
      stats.sort((a, b) => b.clientesPagantes - a.clientesPagantes);
      setChannelStats(stats);

      // 5. Fetch New vs Returning client data from ALL sales in the period
      const { data: allPeriodSales } = await supabase
        .from('sales')
        .select('id, client_id, total, is_new_client')
        .eq('company_id', companyId)
        .eq('status', 'Fechada')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate) as { data: any[] | null };

      const allSales = allPeriodSales || [];
      let nNew = 0, nReturn = 0, revNew = 0, revReturn = 0;
      allSales.forEach(s => {
        if (s.is_new_client === false) {
          nReturn++;
          revReturn += Number(s.total);
        } else {
          nNew++;
          revNew += Number(s.total);
        }
      });
      setNewClientSales(nNew);
      setReturningClientSales(nReturn);
      setNewClientRevenue(revNew);
      setReturningClientRevenue(revReturn);

    } catch (error: any) {
      console.error("Error fetching CAC data", error);
      toast.error(`Erro ao buscar dados: ${error?.message || 'Desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSellerExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) {
      toast.error("Empresa não vinculada");
      return;
    }

    if (!sellerId) {
      toast.error("Selecione um vendedor");
      return;
    }

    const valorInvestido = parseFloat(sellerAmount.replace(",", "."));
    if (isNaN(valorInvestido) || valorInvestido <= 0) {
      toast.error("Digite um valor válido maior que 0");
      return;
    }

    setSubmittingSellerExpense(true);

    try {
      if (!accountId) {
        toast.error("Selecione uma conta financeira");
        setSubmittingSellerExpense(false);
        return;
      }

      // Get seller name
      const selectedSeller = sellers.find(s => s.id.toString() === sellerId);
      const sellerName = selectedSeller ? selectedSeller.name : "Vendedor";

      const result = await createExpenseTransaction({
        name: sellerDescription ? `Comissão - ${sellerDescription}` : `Gasto Vendedor - ${sellerName}`,
        amount: valorInvestido,
        transactionDate: sellerDate,
        companyId: user.companyId,
        accountId: parseInt(accountId),
        isPaid: true,
        description: `Gasto Vendedor: ${sellerName}${sellerDescription ? ` - ${sellerDescription}` : ''}`,
        originType: "manual",
      });

      if (!result) throw new Error("Falha ao criar transação");

      // Update CAC fields in transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          include_in_cac: true,
          cac_bucket: "vendas",
          cac_origin: "Geral",
        })
        .eq("id", result.id);

      if (updateError) throw updateError;

      toast.success(`Gasto com ${sellerName} registrado com sucesso!`);
      
      // Reset form
      setSellerAmount("");
      setSellerDescription("");
      setSellerId("");
      setSellerDate(format(new Date(), "yyyy-MM-dd"));
      
      // Refresh CAC data
      fetchCacData();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao registrar gasto: ${error.message}`);
    } finally {
      setSubmittingSellerExpense(false);
    }
  };

  const handleDeleteCacTransaction = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa de CAC? Esta ação irá remover o lançamento do financeiro permanentemente.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success("Despesa de CAC excluída com sucesso!");
      fetchCacData();
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao excluir despesa: ${e.message}`);
    }
  };

  const avgCac = newPayingClients > 0 ? totalCac / newPayingClients : 0;
  const globalRoas = totalCac > 0 ? cohortRevenue / totalCac : 0;
  const roasProgress = targetRoas > 0 ? Math.min((globalRoas / targetRoas) * 100, 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header and Filters */}
      <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Custo de Aquisição de Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">Analise o retorno dos seus investimentos em marketing e vendas.</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-8 gap-1 bg-background w-full sm:w-auto" onClick={() => setIsRoasModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar Gasto em Ads
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 gap-1 bg-background border-blue-500/30 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 transition-all w-full sm:w-auto" 
              onClick={() => {
                const element = document.getElementById("quick-seller-expense-card");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  element.classList.add("ring-2", "ring-blue-500");
                  setTimeout(() => {
                    element.classList.remove("ring-2", "ring-blue-500");
                  }, 1500);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Registrar Gasto com Vendedor
            </Button>
          </div>
        </div>
        <div className="space-y-1.5 max-w-[280px]">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período de Análise</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 bg-background"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="relative flex-1">
              <Input 
                type="month" 
                value={format(currentMonth, "yyyy-MM")} 
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split("-").map(Number);
                    setCurrentMonth(new Date(year, month - 1, 1, 12, 0, 0));
                  }
                }} 
                className="h-9 w-full bg-background font-semibold text-center text-sm cursor-pointer"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 bg-background"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Investimento (CAC)</p>
          <h3 className="text-3xl font-bold text-red-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCac)}
          </h3>
          <div className="flextext-xs text-muted-foreground gap-2 mt-1">
            <span className="text-orange-500/80">Mkt: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marketingCost)}</span>
            {' • '}
            <span className="text-blue-500/80">Vendas: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesCost)}</span>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Novos Clientes (Pagantes)</p>
          <h3 className="text-3xl font-bold text-foreground">
            {newPayingClients}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Clientes que geraram vendas
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Target className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">CAC Médio Global</p>
          <h3 className="text-3xl font-bold text-info">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgCac)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Custo médio por aquisição
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Receita da Coorte</p>
          <h3 className="text-3xl font-bold text-green-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cohortRevenue)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            LTV Inicial gerado
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-between space-y-2 relative overflow-hidden group min-h-[140px]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PieChart className="w-16 h-16 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">ROAS Global</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className={`text-3xl font-bold ${globalRoas === 0 ? 'text-primary' : (globalRoas >= targetRoas ? 'text-green-500' : 'text-red-500')}`}>
                {globalRoas === 0 ? '0.00x' : `${globalRoas.toFixed(2)}x`}
              </h3>
              {targetRoas > 0 && globalRoas > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  ({roasProgress.toFixed(0)}% da meta)
                </span>
              )}
            </div>
            
            {/* Barra de Progresso da Meta */}
            {targetRoas > 0 && (
              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full transition-all duration-500 ${globalRoas >= targetRoas ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${roasProgress}%` }}
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-1 border-t border-border/10">
            <span className={`text-[10px] ${globalRoas === 0 ? 'text-muted-foreground' : (globalRoas >= targetRoas ? 'text-green-500/80 font-medium' : 'text-red-400/80 font-medium')}`}>
              {globalRoas === 0 ? 'Sem retorno' : (globalRoas >= targetRoas ? 'Meta atingida 🎉' : 'Abaixo da meta ⚠️')}
            </span>
            <div className="flex items-center gap-1 bg-muted/40 rounded px-1.5 py-0.5 border border-border/50">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase">Meta:</span>
              <input 
                type="number"
                step="0.5" 
                value={targetRoas || ''} 
                onChange={(e) => handleTargetRoasChange(e.target.value)} 
                className="w-8 h-4 bg-transparent text-foreground text-center rounded text-[10px] focus:outline-none border-none p-0 font-bold"
              />
              <span className="text-[9px] text-muted-foreground font-medium">x</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Client classification & Seller Gasto row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New vs Returning Card */}
        <Card className="lg:col-span-2 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <UserPlus className="w-20 h-20" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-primary" />
              Novos vs Retorno
            </h3>
            {(newClientSales + returningClientSales) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de classificação de clientes no período.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* New Clients */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">Novos</span>
                  </div>
                  <p className="text-2xl font-bold">{newClientSales}</p>
                  <p className="text-xs text-muted-foreground">
                    {((newClientSales / (newClientSales + returningClientSales)) * 100).toFixed(0)}% das vendas
                  </p>
                </div>
                {/* Returning Clients */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Retorno</span>
                  </div>
                  <p className="text-2xl font-bold">{returningClientSales}</p>
                  <p className="text-xs text-muted-foreground">
                    {((returningClientSales / (newClientSales + returningClientSales)) * 100).toFixed(0)}% das vendas
                  </p>
                </div>
                {/* Ticket Médio Novos */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio <span className="text-green-500">Novo</span></p>
                  <p className="text-2xl font-bold text-green-500">
                    {newClientSales > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newClientRevenue / newClientSales)
                      : 'N/A'
                    }
                  </p>
                </div>
                {/* Ticket Médio Retorno */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio <span className="text-blue-500">Retorno</span></p>
                  <p className="text-2xl font-bold text-blue-500">
                    {returningClientSales > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(returningClientRevenue / returningClientSales)
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* Progress bar */}
          {(newClientSales + returningClientSales) > 0 && (
            <div className="mt-4">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div 
                  className="bg-green-500 transition-all duration-500" 
                  style={{ width: `${(newClientSales / (newClientSales + returningClientSales)) * 100}%` }} 
                />
                <div 
                  className="bg-blue-500 transition-all duration-500" 
                  style={{ width: `${(returningClientSales / (newClientSales + returningClientSales)) * 100}%` }} 
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-green-500 font-medium">Novos</span>
                <span className="text-[10px] text-blue-500 font-medium">Retorno</span>
              </div>
            </div>
          )}
        </Card>

        {/* Gasto com Vendedor Card */}
        <Card id="quick-seller-expense-card" className="lg:col-span-1 p-5 relative overflow-hidden flex flex-col justify-between border-blue-500/15 dark:border-blue-500/30 bg-gradient-to-br from-background via-background to-blue-500/[0.03] dark:to-blue-500/[0.015] shadow-sm transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-20 h-20 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-blue-500" />
                Registrar Gasto com Vendedor
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Lançamento de comissões/despesas de vendas para cálculo de CAC.</p>
            </div>

            <form onSubmit={handleSellerExpenseSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sellerId" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vendedor *</Label>
                  {sellers.length > 0 ? (
                    <Select value={sellerId} onValueChange={setSellerId}>
                      <SelectTrigger id="sellerId" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="Sem vendedores..." 
                      disabled 
                      className="h-9 text-xs bg-background"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sellerAmount" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$) *</Label>
                  <Input
                    id="sellerAmount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 150.00"
                    value={sellerAmount}
                    onChange={(e) => setSellerAmount(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sellerDate" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data *</Label>
                  <Input
                    id="sellerDate"
                    type="date"
                    required
                    value={sellerDate}
                    onChange={(e) => setSellerDate(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="accountId" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conta Financeira *</Label>
                  {accounts.length > 0 ? (
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger id="accountId" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                            {a.name} {a.is_main && "(Principal)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="Sem contas..." 
                      disabled 
                      className="h-9 text-xs bg-background"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sellerDescription" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição Opcional</Label>
                <Input
                  id="sellerDescription"
                  placeholder="Ex: Comissão, Bônus..."
                  value={sellerDescription}
                  onChange={(e) => setSellerDescription(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <Button 
                type="submit" 
                size="sm" 
                className="w-full h-9 mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                disabled={submittingSellerExpense || sellers.length === 0}
              >
                {submittingSellerExpense ? "Registrando..." : "Registrar Gasto"}
              </Button>

              {sellers.length === 0 && (
                <p className="text-[10px] text-amber-500 font-medium text-center mt-1">
                  ⚠️ Cadastre vendedores na aba de Comissões para habilitar.
                </p>
              )}
            </form>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table representation */}
        <Card className="lg:col-span-2 p-1">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Performance por Canal
            </h3>
            <p className="text-sm text-muted-foreground">Custo direto + custo 'Geral' rateado.</p>
          </div>
          {/* Desktop: Tabela */}
          <div className="hidden sm:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-center">Pagantes</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right text-primary">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Sem dados o suficiente no período.
                    </TableCell>
                  </TableRow>
                ) : channelStats.map((stat) => (
                  <TableRow key={stat.origem}>
                    <TableCell className="font-medium">{stat.origem}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.custoTotal)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {stat.clientesPagantes}
                    </TableCell>
                    <TableCell className="text-right text-info">
                      {stat.clientesPagantes === 0 ? 'N/A' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.cac)}
                    </TableCell>
                    <TableCell className="text-right text-green-500">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.receita)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${stat.custoTotal === 0 ? 'text-primary' : (stat.roas >= targetRoas ? 'text-green-500' : 'text-red-500')}`}>
                      {stat.custoTotal === 0 ? 'N/A' : `${stat.roas.toFixed(2)}x`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="block sm:hidden p-3 space-y-3">
            {channelStats.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Sem dados o suficiente no período.</p>
            ) : channelStats.map((stat) => (
              <div key={stat.origem} className="p-3 rounded-lg border text-sm space-y-2 bg-card">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold">{stat.origem}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.custoTotal === 0 ? 'bg-primary/10 text-primary' : (stat.roas >= targetRoas ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')}`}>
                    {stat.custoTotal === 0 ? 'N/A' : `ROAS ${stat.roas.toFixed(2)}x`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Custo Total</span>
                    <span className="font-medium text-xs">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.custoTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Pagantes</span>
                    <span className="font-semibold text-xs">{stat.clientesPagantes}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">CAC</span>
                    <span className="font-medium text-xs text-info">{stat.clientesPagantes === 0 ? 'N/A' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.cac)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-muted-foreground">Receita:</span>
                  <span className="font-semibold text-green-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.receita)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chart representation */}
        <Card className="p-5 flex flex-col">
          <h3 className="font-semibold mb-4">Eficiência de Conversão (CAC)</h3>
          <div className="flex-1 min-h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={channelStats.filter(s => s.clientesPagantes > 0)}
                margin={{ top: 20, right: 0, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                <XAxis 
                  dataKey="origem" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `R$${value}`}
                  tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
                  width={75}
                />
                <Tooltip 
                  cursor={{ fill: '#88888811' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #88888833', backgroundColor: 'var(--background)' }}
                  formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                />
                <Bar dataKey="cac" name="CAC Médio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Table representation */}
        <Card className="lg:col-span-2 p-1">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              Despesas de CAC Mapeadas no Período
            </h3>
            <p className="text-sm text-muted-foreground">Transações de saída que estão compondo o investimento total exibido acima.</p>
          </div>
          {/* Desktop: Tabela */}
          <div className="hidden sm:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome da Transação</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Canal Marcado</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cacTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-16 text-muted-foreground">
                      Nenhuma despesa marcada como CAC no período.
                    </TableCell>
                  </TableRow>
                ) : cacTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(parseISO(tx.transaction_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{tx.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${tx.cac_bucket === 'marketing' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                        {tx.cac_bucket}
                      </span>
                    </TableCell>
                    <TableCell>{tx.cac_origin || 'Não classificado'}</TableCell>
                    <TableCell className="text-right text-red-500">
                      -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteCacTransaction(tx.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Excluir despesa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="block sm:hidden p-3 space-y-3">
            {cacTransactions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma despesa marcada como CAC no período.</p>
            ) : cacTransactions.map((tx) => (
              <div key={tx.id} className="p-3 rounded-lg border text-sm space-y-2 bg-card">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold truncate max-w-[55%]">{tx.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${tx.cac_bucket === 'marketing' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {tx.cac_bucket}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteCacTransaction(tx.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Data</span>
                    <span className="font-medium text-xs">{format(parseISO(tx.transaction_date), "dd/MM/yy")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Canal</span>
                    <span className="font-medium text-xs">{tx.cac_origin || 'N/C'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400 block">Valor</span>
                    <span className="font-semibold text-xs text-red-500">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ranking de Vendedores */}
        <Card className="lg:col-span-1 p-1 flex flex-col justify-between">
          <div>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-blue-500" />
                Eficiência Comercial
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ranking de vendas por faturamento no período.</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[350px]">
              {sellerRanking.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhuma venda comercial registrada no período.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sellerRanking.map((seller, index) => (
                    <div key={seller.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index === 0 ? 'bg-amber-500/20 text-amber-500' :
                          index === 1 ? 'bg-slate-400/20 text-slate-400' :
                          index === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium text-foreground block">{seller.name}</span>
                          <span className="text-[10px] text-muted-foreground">{seller.vendasCount} {seller.vendasCount === 1 ? 'venda' : 'vendas'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground block">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.faturamentoTotal)}
                        </span>
                        <span className="text-[10px] text-blue-500">
                          Comissão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.comissaoTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <RoasEntryModal
        open={isRoasModalOpen}
        onOpenChange={setIsRoasModalOpen}
        onSuccess={fetchCacData}
      />
    </div>
  );
}
