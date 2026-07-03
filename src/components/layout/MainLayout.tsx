import { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TopNavigation } from './TopNavigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SupportButton } from '@/components/support/SupportButton';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isReadOnly = user?.subscriptionStatus === 'pending_payment' && !user?.isMaster;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center animate-pulse">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-primary-foreground"
              fill="currentColor"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {isReadOnly && (
        <div className="fixed top-0 left-0 right-0 h-10 bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 z-[60] shadow-md transition-all duration-300">
          <AlertTriangle className="h-4 w-4 animate-pulse text-amber-100" />
          <span>Modo de Leitura: Sua assinatura está aguardando pagamento.</span>
          <a 
            href="https://wa.me/5517992573141?text=Olá!%20Minha%20assinatura%20está%20aguardando%20pagamento%20e%20gostaria%20de%20regularizar." 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-amber-100 font-bold ml-1"
          >
            Regularizar no WhatsApp
          </a>
        </div>
      )}
      <TopNavigation />
      <main className={`overflow-x-hidden transition-all duration-300 ${isReadOnly ? 'pt-[104px]' : 'pt-16'}`}>
        <PullToRefresh onRefresh={async () => {
          // Pequeno delay para a animação de refresh aparecer
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.reload();
        }}>
          <div className={isReadOnly ? "min-h-[calc(100vh-104px)]" : "min-h-[calc(100vh-64px)]"}>
            {children}
          </div>
        </PullToRefresh>
      </main>
      <SupportButton />
    </div>
  );
}
