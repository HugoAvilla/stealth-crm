import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TopClientsRanking } from '@/components/dashboard/TopClientsRanking';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { CapacityWidget } from '@/components/dashboard/CapacityWidget';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { HelpOverlay } from '@/components/help/HelpOverlay';
import { Search, DollarSign, TrendingUp, Users, Phone, Settings, Save, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import NewClientModal from '@/components/vendas/NewClientModal';
import { FillSlotModal } from '@/components/espaco/FillSlotModal';
import { startOfMonth, endOfMonth } from 'date-fns';

interface DashboardStats {
  totalSales: number;
  salesCount: number;
  averageTicket: number;
  newClients: number;
  pendingContacts: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showFillSlotModal, setShowFillSlotModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // States para Meta
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editingGoalValue, setEditingGoalValue] = useState<number>(0);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    salesCount: 0,
    averageTicket: 0,
    newClients: 0,
    pendingContacts: 0,
    monthlyGoal: 50000,
    monthlyProgress: 0,
  });

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Usuário';

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) {
          setLoading(false);
          return;
        }

        const now = new Date();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Fetch sales for the current month
        const { data: salesData } = await supabase
          .from('sales')
          .select('total, is_open, sale_date')
          .eq('company_id', profile.company_id)
          .gte('sale_date', monthStart.split('T')[0])
          .lte('sale_date', monthEnd.split('T')[0]);

        // Fetch new clients for the current month
        const { count: newClientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd);

        // Fetch open sales (pending contacts)
        const { count: pendingCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('is_open', true);

        const sales = salesData || [];
        const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const salesCount = sales.length;
        const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

        // Fetch monthly goal
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('monthly_goal')
          .eq('company_id', profile.company_id)
          .maybeSingle();
          
        const monthlyGoalSetting = settingsData?.monthly_goal || 50000;

        setStats({
          totalSales: totalRevenue,
          salesCount,
          averageTicket: avgTicket,
          newClients: newClientsCount || 0,
          pendingContacts: pendingCount || 0,
          monthlyGoal: monthlyGoalSetting,
          monthlyProgress: totalRevenue,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user?.id]);

  const handleSaveGoal = async () => {
    if (!user?.id) return;
    try {
      setIsSavingGoal(true);
      if (editingGoalValue <= 0) {
        toast.error("Valor inválido");
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
        
      if (!profile?.company_id) return;

      // Tenta atualizar primeiro
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      let error;
      if (existing) {
        // Já existe registro => update
        ({ error } = await supabase
          .from('company_settings')
          .update({ monthly_goal: editingGoalValue })
          .eq('company_id', profile.company_id));
      } else {
        // Não existe => insert
        ({ error } = await supabase
          .from('company_settings')
          .insert({ company_id: profile.company_id, monthly_goal: editingGoalValue }));
      }
        
      if (error) throw error;
      
      setStats(prev => ({ ...prev, monthlyGoal: editingGoalValue }));
      setIsEditingGoal(false);
      toast.success("Meta atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      toast.error("Erro ao atualizar a meta do mês");
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="dashboard"
        title="Guia do Painel de Controle"
        sections={[
          {
            title: "Indicadores Principais",
            description: "No topo você encontra 4 cards com os principais indicadores do mês: Faturamento Total, Ticket Médio, Novos Clientes e Pós-Venda Pendente. Eles são atualizados automaticamente conforme você registra vendas.",
            screenshotUrl: "/help/help-dashboard-stats.png"
          },
          {
            title: "Ações Rápidas",
            description: "Use os botões de ação rápida para 'Preencher Vaga' (registrar a entrada de um veículo para serviço) ou 'Novo Cliente' (cadastrar um cliente rapidamente sem sair do painel).",
            screenshotUrl: "/help/help-dashboard-actions.png"
          },
          {
            title: "Gráfico de Vendas e Resumo Financeiro",
            description: "O gráfico mostra a tendência de vendas nos últimos dias. Ao lado, o Resumo Financeiro apresenta entradas, saídas e saldo. Use esses dados para identificar padrões de faturamento.",
            screenshotUrl: "/help/help-dashboard-charts.png"
          },
          {
            title: "Meta do Mês e Ranking de Clientes",
            description: "Acompanhe o progresso em relação à sua meta mensal pela barra de progresso. O Ranking mostra os clientes que mais gastaram, ajudando a identificar seus melhores clientes.",
            screenshotUrl: "/help/help-dashboard-goal.png"
          },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-light">
            Olá, <span className="font-semibold">{userName.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente, placa ou serviço..."
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <QuickActions
          onNewSlot={() => setShowFillSlotModal(true)}
          onNewClient={() => setShowNewClientModal(true)}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        {loading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Faturamento do Mês"
              value={`R$ ${stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle={`${stats.salesCount} vendas realizadas`}
              icon={<DollarSign className="w-5 h-5" />}
              variant="success"
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Ticket Médio"
              value={`R$ ${stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Valor médio por venda"
              icon={<TrendingUp className="w-5 h-5" />}
              variant="info"
            />
            <StatsCard
              title="Novos Clientes"
              value={stats.newClients}
              subtitle="Este mês"
              icon={<Users className="w-5 h-5" />}
              variant="warning"
            />

          </>
        )}
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        {/* Sales Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <SalesChart />
        </div>

        {/* Financial Summary - Only for ADMIN */}
        {user?.role === 'ADMIN' && <FinancialSummary />}
      </div>

      {/* Secondary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <CapacityWidget />
        <ConversionFunnel />

        {/* Goal Progress */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Meta do Mês
            </h3>
            {!isEditingGoal && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => {
                  setEditingGoalValue(stats.monthlyGoal);
                  setIsEditingGoal(true);
                }}
              >
                <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            )}
          </div>
          
          {loading ? (
            <Skeleton className="h-24" />
          ) : isEditingGoal ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Novo valor da meta (R$)</label>
                <Input 
                  type="number" 
                  value={editingGoalValue || ''} 
                  onChange={(e) => setEditingGoalValue(Number(e.target.value))}
                  placeholder="Ex: 50000"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1" 
                  onClick={handleSaveGoal}
                  disabled={isSavingGoal}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-10 p-0" 
                  onClick={() => setIsEditingGoal(false)}
                  disabled={isSavingGoal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-primary">
                  {stats.monthlyGoal > 0 ? Math.round((stats.monthlyProgress / stats.monthlyGoal) * 100) : 0}%
                </span>
                <span className="text-sm text-muted-foreground">atingido</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500 animate-glow"
                  style={{ width: `${Math.min((stats.monthlyProgress / stats.monthlyGoal) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  R$ {stats.monthlyProgress.toLocaleString('pt-BR')}
                </span>
                <span className="font-medium">
                  R$ {stats.monthlyGoal.toLocaleString('pt-BR')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Clients */}
      <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <TopClientsRanking />
      </div>

      {/* Modals */}
      <FillSlotModal
        open={showFillSlotModal}
        onOpenChange={setShowFillSlotModal}
        onSlotFilled={() => setShowFillSlotModal(false)}
      />
      <NewClientModal
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={() => setShowNewClientModal(false)}
      />
    </div>
  );
};

export default Dashboard;
