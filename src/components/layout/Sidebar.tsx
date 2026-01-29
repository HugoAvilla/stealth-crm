import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import wfeLogo from '@/assets/wfe-logo.png';
import {
  LayoutDashboard,
  DollarSign,
  Building2,
  CreditCard,
  Landmark,
  Users,
  BarChart3,
  Settings,
  Shield,
  Package,
  Target,
  User,
  Building,
  UserCog,
  ChevronLeft,
  LogOut,
  Crown
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  adminOnly?: boolean;
  productionOnly?: boolean;
  masterOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/' },
  { icon: DollarSign, label: 'Vendas', path: '/vendas' },
  { icon: Building2, label: 'Espaço', path: '/espaco' },
  { icon: CreditCard, label: 'Financeiro', path: '/financeiro' },
  { icon: Landmark, label: 'Contas', path: '/contas' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Serviços', path: '/servicos' },
  { icon: Shield, label: 'Garantias', path: '/garantias' },
  { icon: Package, label: 'Estoque', path: '/estoque', productionOnly: true },
  { icon: Target, label: 'Pipeline', path: '/pipeline' },
  { icon: User, label: 'Perfil', path: '/perfil' },
  { icon: Building, label: 'Sua Empresa', path: '/empresa' },
  { icon: UserCog, label: 'Admin', path: '/admin', adminOnly: true },
  { icon: Crown, label: 'Painel Master', path: '/master', masterOnly: true },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const filteredItems = navItems.filter(item => {
    // Master only pages
    if (item.masterOnly && !user?.isMaster) return false;
    // Admin only pages
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    // Estoque - only for ADMIN and PRODUCAO
    if (item.productionOnly && user?.role !== 'ADMIN' && user?.role !== 'PRODUCAO') return false;
    // PRODUCAO can only see Estoque and Perfil
    if (user?.role === 'PRODUCAO' && !item.productionOnly && item.path !== '/perfil') return false;
    return true;
  });

  const userName = user?.profile?.name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-background border-r border-border transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img 
              src={wfeLogo} 
              alt="WFE Evolution" 
              className="h-8 w-auto object-contain"
            />
            <span className="font-semibold text-sm tracking-tight">WFE EVOLUTION</span>
          </div>
        )}
        {isCollapsed && (
          <img 
            src={wfeLogo} 
            alt="WFE" 
            className="h-8 w-8 object-contain mx-auto"
          />
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-2 rounded-lg hover:bg-muted transition-colors",
            isCollapsed && "mx-auto"
          )}
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive && "text-primary"
                )} />
                
                {!isCollapsed && (
                  <span className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary"
                  )}>
                    {item.label}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <li key={item.path}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={item.path}>{linkContent}</li>;
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {userName}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role?.toLowerCase()}
                </span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="w-full p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex justify-center"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Sair da conta
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
