import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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

// Protected Route for admin-only pages
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

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

      {/* Protected Routes - wrapped in MainLayout */}
      <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
      <Route path="/vendas" element={<MainLayout><Vendas /></MainLayout>} />
      <Route path="/espaco" element={<MainLayout><Espaco /></MainLayout>} />
      <Route path="/financeiro" element={<MainLayout><Financeiro /></MainLayout>} />
      <Route path="/contas" element={<MainLayout><Contas /></MainLayout>} />
      <Route path="/clientes" element={<MainLayout><Clientes /></MainLayout>} />
      <Route path="/relatorios" element={<MainLayout><Relatorios /></MainLayout>} />
      <Route path="/servicos" element={<MainLayout><Servicos /></MainLayout>} />
      <Route path="/garantias" element={<MainLayout><Garantias /></MainLayout>} />
      <Route path="/estoque" element={<MainLayout><Estoque /></MainLayout>} />
      <Route path="/pipeline" element={<MainLayout><Pipeline /></MainLayout>} />
      <Route path="/perfil" element={<MainLayout><Perfil /></MainLayout>} />
      <Route path="/empresa" element={<MainLayout><Empresa /></MainLayout>} />
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <MainLayout><Admin /></MainLayout>
          </AdminRoute>
        } 
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
