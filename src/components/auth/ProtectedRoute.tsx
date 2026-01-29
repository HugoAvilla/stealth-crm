import { Navigate } from 'react-router-dom';
import { useAuth, SubscriptionStatus } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/lib/database.types';
import { PendingApprovalModal } from './PendingApprovalModal';

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
  const { user, isAuthenticated, isLoading } = useAuth();

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
    return <Navigate to="/empresa/cadastro" replace />;
  }

  // User has role NENHUM - pending approval (only for users with company)
  if (user.role === 'NENHUM' && user.companyId) {
    return <PendingApprovalModal />;
  }

  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
