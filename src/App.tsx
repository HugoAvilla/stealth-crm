import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { usePWAUpdate } from "@/hooks/use-pwa-update";

// Pages
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Subscription from "./pages/Subscription";
import WaitingApproval from "./pages/WaitingApproval";
import CompanySetup from "./pages/CompanySetup";
import CompanyJoin from "./pages/CompanyJoin";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Clientes from "./pages/Clientes";
import Espaco from "./pages/Espaco";
import Financeiro from "./pages/Financeiro";
import Contas from "./pages/Contas";
import Relatorios from "./pages/Relatorios";

import Garantias from "./pages/Garantias";
import Estoque from "./pages/Estoque";
import Servicos from "./pages/Servicos";

import Perfil from "./pages/Perfil";
import Empresa from "./pages/Empresa";
import Master from "./pages/Master";
import TeamRequests from "./pages/TeamRequests";
import NotFound from "./pages/NotFound";

import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

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
        path="/assinatura" 
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user?.subscriptionStatus === 'active' && user?.companyId ? (
            <Navigate to="/" replace />
          ) : (
            <Subscription />
          )
        } 
      />
      <Route 
        path="/aguardando-liberacao" 
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user?.subscriptionStatus === 'active' ? (
            user?.companyId ? <Navigate to="/" replace /> : <Navigate to="/empresa/cadastro" replace />
          ) : user?.subscriptionStatus !== 'payment_submitted' ? (
            <Navigate to="/assinatura" replace />
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
          ) : user?.subscriptionStatus !== 'active' ? (
            <Navigate to="/assinatura" replace />
          ) : user?.companyId ? (
            <Navigate to="/" replace />
          ) : (
            <CompanySetup />
          )
        } 
      />
      <Route 
        path="/empresa/entrar" 
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user?.companyId ? (
            <Navigate to="/" replace />
          ) : (
            <CompanyJoin />
          )
        } 
      />

      {/* Protected Routes - ADMIN and VENDEDOR */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/vendas" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Vendas /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/clientes" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Clientes /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/espaco" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Espaco /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/financeiro" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Financeiro /></MainLayout>
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
      
      
      <Route path="/garantias" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Garantias /></MainLayout>
        </ProtectedRoute>
      } />
      
      
      <Route path="/perfil" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR', 'PRODUCAO']}>
          <MainLayout><Perfil /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/empresa" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Empresa /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - ADMIN and PRODUCAO (Estoque) */}
      <Route path="/estoque" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCAO']}>
          <MainLayout><Estoque /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - Serviços */}
      <Route path="/servicos" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR', 'PRODUCAO']}>
          <MainLayout><Servicos /></MainLayout>
        </ProtectedRoute>
      } />

       {/* Protected Routes - ADMIN only */}
       <Route path="/equipe/solicitacoes" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><TeamRequests /></MainLayout>
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