import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/lib/database.types';
import { PendingApprovalModal } from './PendingApprovalModal';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireCompany?: boolean;
  requireActiveSubscription?: boolean;
  requireMaster?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireCompany = true,
  requireActiveSubscription = true,
  requireMaster = false
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, refreshUser, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if master access is required
  if (requireMaster && !user.isMaster) {
    return <Navigate to="/" replace />;
  }

  // Master account bypasses all other checks
  if (user.isMaster) {
    return <>{children}</>;
  }

  // Check subscription status
  if (requireActiveSubscription) {
    if (user.subscriptionStatus === 'pending_payment') {
      return <Navigate to="/assinatura" replace />;
    }
    
    if (user.subscriptionStatus === 'payment_submitted') {
      return <Navigate to="/aguardando-liberacao" replace />;
    }
    
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'blocked') {
      return <Navigate to="/assinatura" replace />;
    }
  }

  // Check if company is required and user doesn't have one
  if (requireCompany && !user.companyId) {
    // If user has pending join request, show waiting message
    if (user.hasPendingJoinRequest) {
      return <Navigate to="/empresa/entrar" replace />;
    }
    // Otherwise redirect to company setup or join
    return <Navigate to="/empresa/cadastro" replace />;
  }

  // Company owner with incorrect NENHUM role - show loading/recovery screen
  if (user.role === 'NENHUM' && user.companyId && user.isCompanyOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Configurando sua conta...</h2>
          <p className="text-muted-foreground">
            Estamos finalizando a configuração das suas permissões. Por favor, aguarde um momento.
          </p>
          <Button 
            variant="outline" 
            onClick={async () => {
              await refreshUser();
              window.location.reload();
            }}
          >
            Atualizar
          </Button>
        </div>
      </div>
    );
  }

  // User has role NENHUM - pending approval (only for non-owners)
  if (user.role === 'NENHUM' && user.companyId && !user.isCompanyOwner) {
    return <PendingApprovalModal />;
  }

  // Check if user has required role - prevent infinite loop
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If already at root, show access restricted message instead of loop
    if (location.pathname === '/') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta área. 
              Entre em contato com o administrador da sua empresa.
            </p>
            <Button onClick={() => signOut()}>Sair</Button>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
