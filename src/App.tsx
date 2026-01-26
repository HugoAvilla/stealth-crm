import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { PlaceholderPage } from "./components/PlaceholderPage";

const queryClient = new QueryClient();

// Placeholder pages for each module
const VendasPage = () => <PlaceholderPage title="Vendas" description="Gerencie suas vendas, orçamentos e histórico de transações." />;
const EspacoPage = () => <PlaceholderPage title="Espaço (Vagas)" description="Controle as vagas disponíveis e ocupadas no seu estabelecimento." />;
const FinanceiroPage = () => <PlaceholderPage title="Financeiro" description="Acompanhe entradas, saídas e o fluxo de caixa da empresa." />;
const ContasPage = () => <PlaceholderPage title="Contas" description="Gerencie suas contas bancárias e carteiras." />;
const ClientesPage = () => <PlaceholderPage title="Clientes" description="Cadastre e gerencie seus clientes e veículos." />;
const RelatoriosPage = () => <PlaceholderPage title="Relatórios" description="Visualize relatórios detalhados de performance." />;
const ServicosPage = () => <PlaceholderPage title="Serviços" description="Configure os serviços oferecidos e preços." />;
const GarantiasPage = () => <PlaceholderPage title="Garantias" description="Gerencie certificados de garantia dos serviços." />;
const EstoquePage = () => <PlaceholderPage title="Estoque" description="Controle de materiais e insumos." />;
const PipelinePage = () => <PlaceholderPage title="Pipeline" description="Visualize o fluxo de produção no formato Kanban." />;
const PerfilPage = () => <PlaceholderPage title="Perfil" description="Edite suas informações pessoais e senha." />;
const EmpresaPage = () => <PlaceholderPage title="Sua Empresa" description="Configure os dados da empresa e personalização." />;
const AdminPage = () => <PlaceholderPage title="Admin" description="Gestão de usuários e permissões do sistema." />;

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

      {/* Protected Routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/vendas" element={<VendasPage />} />
      <Route path="/espaco" element={<EspacoPage />} />
      <Route path="/financeiro" element={<FinanceiroPage />} />
      <Route path="/contas" element={<ContasPage />} />
      <Route path="/clientes" element={<ClientesPage />} />
      <Route path="/relatorios" element={<RelatoriosPage />} />
      <Route path="/servicos" element={<ServicosPage />} />
      <Route path="/garantias" element={<GarantiasPage />} />
      <Route path="/estoque" element={<EstoquePage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/perfil" element={<PerfilPage />} />
      <Route path="/empresa" element={<EmpresaPage />} />
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminPage />
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
