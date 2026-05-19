import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Clock } from "lucide-react";

type PlanPrice = {
  plan_code: string;
  billing_period: 'monthly' | 'annual';
  price: number;
};

export default function Upgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUpgrade, setPendingUpgrade] = useState(false);

  const isOwnerOrAdmin = user?.isCompanyOwner || user?.role === 'ADMIN';

  useEffect(() => {
    // If user is already on ultra or premium, they shouldn't be here
    if (user?.planCode === 'ultra' || user?.planCode === 'premium') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Fetch prices
        const { data: priceData, error: priceError } = await supabase
          .from('plan_prices')
          .select('plan_code, billing_period, price');
        
        if (priceError) throw priceError;
        if (priceData) setPrices(priceData as PlanPrice[]);

        // 2. Check for pending upgrade requests if they are admin
        if (isOwnerOrAdmin && user?.companyId) {
          const { data: pendingData, error: pendingError } = await supabase
            .from('upgrade_requests')
            .select('id')
            .eq('company_id', user.companyId)
            .eq('status', 'payment_submitted')
            .maybeSingle();
            
          if (pendingError) throw pendingError;
          if (pendingData) {
            setPendingUpgrade(true);
          }
        }
      } catch (error) {
        console.error('Error fetching upgrade data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, navigate, isOwnerOrAdmin]);

  const getPrice = (plan: string, period: 'monthly' | 'annual') => {
    const found = prices.find(p => p.plan_code === plan && p.billing_period === period);
    return found ? found.price : 0;
  };

  const handleSelectUpgrade = (planCode: string) => {
    if (planCode === 'premium' || pendingUpgrade) return;
    navigate(`/assinatura?mode=upgrade&target=${planCode}`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  // If not admin/owner, show message to contact admin
  if (!isOwnerOrAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            O recurso que você tentou acessar não está disponível no plano atual da empresa.
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-8">
            Fale com o administrador ou dono da empresa para solicitar um upgrade de plano.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const ultraMonthly = getPrice('ultra', 'monthly');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Aprimore seu plano
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Libere recursos exclusivos como o Controle de Estoque e suporte a mais usuários.
          </p>
        </div>

        {pendingUpgrade && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Upgrade em processamento</h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                Identificamos que você já possui uma solicitação de upgrade em andamento. 
                Aguarde a compensação do pagamento e a liberação pelo administrador do sistema.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 justify-center max-w-4xl mx-auto">
          {/* Ultra Plan */}
          <div className="rounded-2xl border-2 border-primary bg-white dark:bg-gray-800 p-8 shadow-md relative flex flex-col">
            <div className="absolute top-0 right-6 -translate-y-1/2 transform">
              <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold tracking-wider text-primary-foreground uppercase">
                Recomendado
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ultra</h3>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Tenha acesso completo ao Controle de Estoque, suporte prioritário e até 3 usuários base.
            </p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(ultraMonthly)}</span>
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
            </p>
            
            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-300">Controle de Estoque Completo</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-300">3 Usuários Inclusos (Adicionais R$49,90)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-300">Suporte Prioritário</span>
              </li>
            </ul>

            <Button 
              className="mt-8 w-full" 
              onClick={() => handleSelectUpgrade('ultra')}
              disabled={pendingUpgrade}
            >
              Fazer Upgrade para Ultra
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 opacity-75 flex flex-col">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Premium</h3>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Para operações avançadas, grandes equipes e necessidades de integração via API.
            </p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-400">Em breve</span>
            </p>
            
            <ul className="mt-8 space-y-4 flex-1 opacity-60">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Até 10 Usuários Inclusos</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Acesso ao Painel Master</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">API de Integração</span>
              </li>
            </ul>

            <Button 
              className="mt-8 w-full opacity-50 cursor-not-allowed" 
              variant="secondary"
              disabled
            >
              Em breve
            </Button>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
