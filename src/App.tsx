import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Clientes from "./pages/Clientes";
import Espaco from "./pages/Espaco";
import Financeiro from "./pages/Financeiro";
import Contas from "./pages/Contas";
import Relatorios from "./pages/Relatorios";
import Servicos from "./pages/Servicos";
import Garantias from "./pages/Garantias";
import Estoque from "./pages/Estoque";
import Pipeline from "./pages/Pipeline";
import Perfil from "./pages/Perfil";
import Empresa from "./pages/Empresa";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
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
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Financeiro /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/contas" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Contas /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/relatorios" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Relatorios /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/servicos" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Servicos /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/garantias" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Garantias /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/pipeline" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Pipeline /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/perfil" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR', 'PRODUCAO']}>
          <MainLayout><Perfil /></MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/empresa" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
          <MainLayout><Empresa /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - ADMIN and PRODUCAO (Estoque) */}
      <Route path="/estoque" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCAO']}>
          <MainLayout><Estoque /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Protected Routes - ADMIN only */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <MainLayout><Admin /></MainLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
