import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TopClientsRanking } from '@/components/dashboard/TopClientsRanking';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { CapacityWidget } from '@/components/dashboard/CapacityWidget';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { dashboardStats } from '@/lib/mockData';
import { Search, DollarSign, TrendingUp, Users, Phone } from 'lucide-react';
import NewSaleModal from '@/components/vendas/NewSaleModal';
import NewClientModal from '@/components/vendas/NewClientModal';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-light">
            Olá, <span className="font-semibold">{user?.name?.split(' ')[0]}</span>
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
          onNewSale={() => setShowNewSaleModal(true)}
          onNewSlot={() => navigate('/espaco')}
          onNewClient={() => setShowNewClientModal(true)}
          onViewPipeline={() => navigate('/pipeline')}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <StatsCard
          title="Faturamento do Mês"
          value={`R$ ${dashboardStats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${dashboardStats.salesCount} vendas realizadas`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Ticket Médio"
          value={`R$ ${dashboardStats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Valor médio por venda"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
        />
        <StatsCard
          title="Novos Clientes"
          value={dashboardStats.newClients}
          subtitle="Este mês"
          icon={<Users className="w-5 h-5" />}
          variant="warning"
        />
        <StatsCard
          title="Pós-Venda Pendente"
          value={dashboardStats.pendingContacts}
          subtitle="Contatos a realizar"
          icon={<Phone className="w-5 h-5" />}
          variant="destructive"
        />
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        {/* Sales Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <SalesChart />
        </div>

        {/* Financial Summary */}
        <FinancialSummary />
      </div>

      {/* Secondary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <CapacityWidget />
        <ConversionFunnel />
        
        {/* Goal Progress */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Meta do Mês
          </h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-primary">
              {Math.round((dashboardStats.monthlyProgress / dashboardStats.monthlyGoal) * 100)}%
            </span>
            <span className="text-sm text-muted-foreground">atingido</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500 animate-glow"
              style={{ width: `${(dashboardStats.monthlyProgress / dashboardStats.monthlyGoal) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              R$ {dashboardStats.monthlyProgress.toLocaleString('pt-BR')}
            </span>
            <span className="font-medium">
              R$ {dashboardStats.monthlyGoal.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <TopClientsRanking />
      </div>

      {/* Modals */}
      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={setShowNewSaleModal}
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
