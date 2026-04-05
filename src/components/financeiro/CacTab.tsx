import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
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
import { Target, TrendingUp, Users, DollarSign, PieChart, Plus, RefreshCw, UserPlus } from "lucide-react";
import { RoasEntryModal } from "./RoasEntryModal";

export function CacTab() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [isRoasModalOpen, setIsRoasModalOpen] = useState(false);
  const [targetRoas, setTargetRoas] = useState<number>(4);

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
        .eq('include_in_cac' as any, true)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate) as { data: any[] | null; error: any };

      if (cacError) throw cacError;

      const transactions = (cacTxData || []) as any[];
      setCacTransactions(transactions);

      let tCac = 0;
      let mCost = 0;
      let sCost = 0;
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

  const avgCac = newPayingClients > 0 ? totalCac / newPayingClients : 0;
  const globalRoas = totalCac > 0 ? cohortRevenue / totalCac : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-4 bg-muted/30 rounded-xl border">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight">Custo de Aquisição de Clientes</h2>
            <Button size="sm" variant="outline" className="h-8 gap-1 bg-background" onClick={() => setIsRoasModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar Gasto em Ads
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Analise o retorno dos seus investimentos em marketing e vendas.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data Inicial</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="h-9 w-36 bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Final</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="h-9 w-36 bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meta de ROAS</Label>
            <div className="flex items-center gap-1">
              <Input 
                type="number"
                step="0.5" 
                value={targetRoas || ''} 
                onChange={(e) => handleTargetRoasChange(e.target.value)} 
                className="h-9 w-20 bg-background text-center px-1"
              />
              <span className="text-sm font-medium text-muted-foreground">x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <Card className="p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PieChart className="w-16 h-16 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">ROAS Global</p>
          <h3 className={`text-3xl font-bold ${globalRoas === 0 ? 'text-primary' : (globalRoas >= targetRoas ? 'text-green-500' : 'text-red-500')}`}>
            {globalRoas === 0 ? '0.00x' : `${globalRoas.toFixed(2)}x`}
          </h3>
          <p className={`text-xs mt-1 ${globalRoas === 0 ? 'text-muted-foreground' : (globalRoas >= targetRoas ? 'text-green-500/80 font-medium' : 'text-red-400 font-medium')}`}>
            {globalRoas === 0 ? 'Retorno sobre investimento' : (globalRoas >= targetRoas ? 'Dentro da meta 🎉' : 'Abaixo da meta ⚠️')}
          </p>
        </Card>
      </div>

      {/* New vs Returning Card */}
      <Card className="p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <UserPlus className="w-20 h-20" />
        </div>
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-primary" />
          Novos vs Retorno
        </h3>
        {(newClientSales + returningClientSales) === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de classificação de clientes no período.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </Card>

        {/* Chart representation */}
        <Card className="p-5 flex flex-col">
          <h3 className="font-semibold mb-4">Eficiência de Conversão (CAC)</h3>
          <div className="flex-1 min-h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={channelStats.filter(s => s.clientesPagantes > 0)}
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
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

      <Card className="p-1 mt-6">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Despesas de CAC Mapeadas no Período
          </h3>
          <p className="text-sm text-muted-foreground">Transações de saída que estão compondo o investimento total exibido acima.</p>
        </div>
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nome da Transação</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Canal Marcado</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cacTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-16 text-muted-foreground">
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RoasEntryModal
        open={isRoasModalOpen}
        onOpenChange={setIsRoasModalOpen}
        onSuccess={fetchCacData}
      />
    </div>
  );
}
