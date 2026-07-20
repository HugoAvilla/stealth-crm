import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { usePWAUpdate } from "@/hooks/use-pwa-update";

// Pages
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import PlanSelection from "./pages/PlanSelection/PlanSelection";
import Subscription from "./pages/Subscription/Subscription";
import Upgrade from "./pages/Upgrade/Upgrade";
import WaitingApproval from "./pages/WaitingApproval/WaitingApproval";
import CompanySetup from "./pages/CompanySetup/CompanySetup";
import Dashboard from "./pages/Painel/Painel";
import Vendas from "./pages/Vendas/Vendas";
import Clientes from "./pages/Clientes/Clientes";
import Espaco from "./pages/Espaco/Espaco";
import Financeiro from "./pages/Financeiro/Financeiro";
import Compras from "./pages/Compras/Compras";
import Contas from "./pages/Contas/Contas";
import Relatorios from "./pages/Relatorios/Relatorios";
import Comissoes from "./pages/Comissoes/Comissoes";
import Admin from "./pages/Admin/Admin";

import Garantias from "./pages/Garantias/Garantias";
import Estoque from "./pages/Estoque/Estoque";
import Servicos from "./pages/Servicos/Servicos";

import Perfil from "./pages/Perfil/Perfil";
import Empresa from "./pages/Empresa/Empresa";
import Funcionarios from "./pages/Funcionarios/Funcionarios";
import MaterialLosses from "./pages/MaterialLosses/MaterialLosses";
import Master from "./pages/Master/Master";
import NotFound from "./pages/NotFound";

import { MainLayout } from "./components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isUpgradeMode = searchParams.get('mode') === 'upgrade';

  // Check if the upgrade is actually needed (user doesn't already have target plan or better)
  const isUpgradeNeeded = (() => {
    if (!isUpgradeMode || !user) return false;
    const planHierarchy: Record<string, number> = { basic: 1, ultra: 2, premium: 3 };
    const targetPlan = searchParams.get('target') || 'ultra';
    const currentPlanLevel = planHierarchy[user.planCode || 'basic'] || 0;
    const targetPlanLevel = planHierarchy[targetPlan] || 0;
    return user.subscriptionStatus === 'active' && currentPlanLevel >= targetPlanLevel ? false : true;
  })();

  useEffect(() => {
    if (!isLoading) {
      const loader = document.getElementById('loader-screen');
      if (loader) {
        const startTime = (window as any).__loaderStartTime || Date.now();
        const elapsed = Date.now() - startTime;
        const MIN_DISPLAY_TIME = 1500;
        const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

        setTimeout(() => {
          loader.classList.add('hide-loader');
          setTimeout(() => {
            loader.remove();
          }, 800);
        }, remaining);
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/cadastro"
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignUp />}
      />
      <Route
        path="/esqueci-senha"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      <Route
        path="/redefinir-senha"
        element={<ResetPassword />}
      />

      {/* Subscription Flow Routes (authenticated but no company yet) */}
      <Route
        path="/planos"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : ((user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'pending_payment') && user?.companyId && (!isUpgradeMode || !isUpgradeNeeded)) ? (
            <Navigate to="/" replace />
          ) : (
            <PlanSelection />
          )
        }
      />
      <Route
        path="/assinatura"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : ((user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'pending_payment') && user?.companyId && (!isUpgradeMode || !isUpgradeNeeded)) ? (
            <Navigate to="/" replace />
          ) : (
            <Subscription />
          )
        }
      />
      <Route
        path="/upgrade"
        element={<Navigate to="/planos?mode=upgrade" replace />}
      />
      <Route
        path="/aguardando-liberacao"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'pending_payment') ? (
            user?.companyId ? <Navigate to="/" replace /> : <Navigate to="/empresa/cadastro" replace />
          ) : user?.subscriptionStatus !== 'payment_submitted' ? (
            user?.planCode ? <Navigate to="/assinatura" replace /> : <Navigate to="/planos" replace />
          ) : (
            <WaitingApproval />
          )
        }
      />
      <Route
        path="/empresa/cadastro"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (user?.subscriptionStatus !== 'active' && user?.subscriptionStatus !== 'pending_payment') ? (
            user?.planCode ? <Navigate to="/assinatura" replace /> : <Navigate to="/planos" replace />
          ) : user?.companyId ? (
            <Navigate to="/" replace />
          ) : (
            <CompanySetup />
          )
        }
      />


      {/* Protected Routes - ADMIN and FUNCIONARIO */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO']}>
          <MainLayout><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/vendas" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO']}>
          <MainLayout><Vendas /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/clientes" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO']}>
          <MainLayout><Clientes /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/espaco" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO']}>
          <MainLayout><Espaco /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/financeiro" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Financeiro /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/compras" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Compras /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/contas" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Contas /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/relatorios" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Relatorios /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/comissoes" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Comissoes /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/garantias" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO']}>
          <MainLayout><Garantias /></MainLayout>
        </ProtectedRoute>
      } />


      <Route path="/perfil" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO', 'PRODUCAO']}>
          <MainLayout><Perfil /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/empresa" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Empresa /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/funcionarios" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Funcionarios /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - ADMIN and PRODUCAO (Estoque) */}
      <Route path="/estoque" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCAO']}>
          <MainLayout><Estoque /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/perdas" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCAO', 'FUNCIONARIO']}>
          <MainLayout><ErrorBoundary><MaterialLosses /></ErrorBoundary></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - Serviços */}
      <Route path="/servicos" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'FUNCIONARIO', 'PRODUCAO']}>
          <MainLayout><Servicos /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - Master only */}
      <Route path="/master" element={
        <ProtectedRoute requireMaster>
          <MainLayout><Master /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  usePWAUpdate();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PWAInstallPrompt />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;