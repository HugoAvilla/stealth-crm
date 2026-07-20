import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/shared/StatsCard';
import { QuickActions } from './components/QuickActions';
import { TopClientsRanking } from './components/TopClientsRanking';
import { SalesChart } from './components/SalesChart';
import { CapacityWidget } from './components/CapacityWidget';
import { FinancialSummary } from './components/FinancialSummary';
import { HelpOverlay } from '@/components/help/HelpOverlay';
import { Search, DollarSign, TrendingUp, Users, Phone, Settings, Save, X, Car, User, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import NewClientModal from '@/pages/Vendas/components/NewClientModal';
import { FillSlotModal } from '@/shared/components/espaco/FillSlotModal';
import { startOfMonth, endOfMonth, format } from 'date-fns';

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

  // State for search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    activeSpaces: any[];
    clients: any[];
    vehicles: any[];
  }>({ activeSpaces: [], clients: [], vehicles: [] });

  // Handle click outside of search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const cleanQuery = searchQuery.trim();
      if (cleanQuery.length < 2) {
        setSearchResults({ activeSpaces: [], clients: [], vehicles: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user?.id)
          .single();

        if (!profile?.company_id) return;

        const term = `%${cleanQuery}%`;

        // 1. Fetch active spaces
        const { data: allActiveSpaces } = await supabase
          .from('spaces')
          .select(`
            id, name, entry_date, payment_status,
            client:clients(name, phone),
            vehicle:vehicles(brand, model, plate)
          `)
          .eq('company_id', profile.company_id)
          .eq('has_exited', false)
          .is('deleted_at', null);

        // Filter in-memory to match name, plate, brand, model or space name
        const cleanTerm = cleanQuery.toLowerCase();
        const matchedActiveSpaces = (allActiveSpaces || []).filter(space => {
          const clientName = space.client?.name?.toLowerCase() || '';
          const clientPhone = space.client?.phone || '';
          const vehicleBrand = space.vehicle?.brand?.toLowerCase() || '';
          const vehicleModel = space.vehicle?.model?.toLowerCase() || '';
          const vehiclePlate = space.vehicle?.plate?.toLowerCase() || '';
          const spaceName = space.name?.toLowerCase() || '';

          return clientName.includes(cleanTerm) ||
            clientPhone.includes(cleanTerm) ||
            vehicleBrand.includes(cleanTerm) ||
            vehicleModel.includes(cleanTerm) ||
            vehiclePlate.includes(cleanTerm) ||
            spaceName.includes(cleanTerm);
        });

        // 2. Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, phone')
          .eq('company_id', profile.company_id)
          .or(`name.ilike.${term},phone.ilike.${term}`)
          .limit(5);

        // 3. Fetch vehicles
        const { data: vehiclesData } = await supabase
          .from('vehicles')
          .select('id, brand, model, plate, client:clients(name)')
          .eq('company_id', profile.company_id)
          .or(`brand.ilike.${term},model.ilike.${term},plate.ilike.${term}`)
          .limit(5);

        setSearchResults({
          activeSpaces: matchedActiveSpaces,
          clients: clientsData || [],
          vehicles: vehiclesData || []
        });
      } catch (err) {
        console.error("Erro na busca instantânea:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user?.id]);

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
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const startDateStr = format(monthStart, 'yyyy-MM-dd');
        const endDateStr = format(monthEnd, 'yyyy-MM-dd');

        // Fetch sales for the current month
        const { data: salesData } = await supabase
          .from('sales')
          .select('total, is_open, sale_date')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .gte('sale_date', startDateStr)
          .lte('sale_date', endDateStr);

        // Fetch new clients for the current month
        const { count: newClientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        // Fetch open sales (pending contacts)
        const { count: pendingCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
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
    } catch (err: any) {
      console.error("Erro ao salvar meta:", err);
      toast.error(err.message || "Erro ao atualizar a meta do mês. Talvez falte rodar uma Migration no Supabase.");
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
            title: "Vídeo Aula — Painel",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades do painel de controle.",
            videoUrl: "/help/video-aula-painel.mp4"
          },
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
        <div className="relative max-w-md w-full search-container z-50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar cliente, placa ou veículo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>

          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-50">
              {isSearching ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Buscando...</span>
                </div>
              ) : searchResults.activeSpaces.length === 0 && searchResults.clients.length === 0 && searchResults.vehicles.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                <div className="p-2 space-y-4">
                  {/* Category: Vagas Ativas */}
                  {searchResults.activeSpaces.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                        Vagas Ativas (Em Andamento)
                      </h4>
                      {searchResults.activeSpaces.map(space => (
                        <button
                          key={space.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            navigate(`/espaco?search=${space.vehicle?.plate || space.name}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-info" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold">
                              {space.vehicle ? `${space.vehicle.brand} ${space.vehicle.model}` : space.name}
                              {space.vehicle?.plate && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{space.vehicle.plate}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Cliente: {space.client?.name || "Sem Nome"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Clientes */}
                  {searchResults.clients.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                        Clientes
                      </h4>
                      {searchResults.clients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            navigate(`/clientes?search=${client.name}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              WhatsApp: {client.phone}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Veículos */}
                  {searchResults.vehicles.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-1 tracking-wider">
                        Veículos Cadastrados
                      </h4>
                      {searchResults.vehicles.map(vehicle => (
                        <button
                          key={vehicle.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            navigate(`/clientes?search=${vehicle.plate || vehicle.model}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-success" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold">
                              {vehicle.brand} {vehicle.model}
                              {vehicle.plate && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{vehicle.plate}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Proprietário: {vehicle.client?.name || "Sem Proprietário"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
              value={`R$ ${stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <CapacityWidget />

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
                  R$ {stats.monthlyProgress.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="font-medium">
                  R$ {stats.monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
