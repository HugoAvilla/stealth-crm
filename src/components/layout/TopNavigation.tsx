import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import wfeLogo from '@/assets/wfe-logo.png';
import {
  LayoutDashboard,
  DollarSign,
  Building2,
  CreditCard,
  Landmark,
  Users,
  BarChart3,
  Shield,
  Package,
  User,
  Building,
  LogOut,
  Crown,
  UserPlus,
  Wrench,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  adminOnly?: boolean;
  productionOnly?: boolean;
  masterOnly?: boolean;
  badge?: number;
}

export function TopNavigation() {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Fetch pending requests count for admin
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (user?.role !== 'ADMIN' || !user?.companyId) return;

      const { count, error } = await supabase
        .from('company_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingRequestsCount(count);
      }
    };

    fetchPendingCount();

    // Subscribe to changes
    const channel = supabase
      .channel('join_requests_changes_top')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_join_requests',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.role, user?.companyId]);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Painel', path: '/' },
    { icon: DollarSign, label: 'Vendas', path: '/vendas' },
    { icon: Building2, label: 'Espaço', path: '/espaco' },
    { icon: CreditCard, label: 'Financeiro', path: '/financeiro' },
    { icon: Landmark, label: 'Contas', path: '/contas' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
    { icon: Shield, label: 'Garantias', path: '/garantias' },
    { icon: Wrench, label: 'Serviços', path: '/servicos' },
    { icon: Package, label: 'Estoque', path: '/estoque', productionOnly: true },
    { icon: UserPlus, label: 'Solicitações', path: '/equipe/solicitacoes', adminOnly: true, badge: pendingRequestsCount },
    { icon: Crown, label: 'Master', path: '/master', masterOnly: true },
    { icon: User, label: 'Perfil', path: '/perfil' },
    { icon: Building, label: 'Empresa', path: '/empresa' },
  ];

  const filteredItems = navItems.filter(item => {
    // Master only pages
    if (item.masterOnly && !user?.isMaster) return false;
    // Admin only pages
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    // Estoque - only for ADMIN and PRODUCAO
    if (item.productionOnly && user?.role !== 'ADMIN' && user?.role !== 'PRODUCAO') return false;
    // PRODUCAO can only see Estoque, Perfil and Serviços
    if (user?.role === 'PRODUCAO' && !item.productionOnly && item.path !== '/perfil' && item.path !== '/servicos') return false;
    return true;
  });

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Usuário';

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <Badge variant="destructive" className="h-4 min-w-4 sm:h-5 sm:min-w-5 flex items-center justify-center text-[10px] sm:text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="h-full flex items-center px-2 sm:px-4 gap-2 sm:gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img src={wfeLogo} alt="WFE" className="h-8 sm:h-10 w-auto object-contain" />
        </Link>

        {/* Horizontal Navigation - Always visible */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto nav-scrollbar">
          {filteredItems.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* User Dropdown - Always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 flex-shrink-0 px-2 sm:px-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-medium text-primary">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                {userName.split(' ')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/empresa" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Sua Empresa
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
