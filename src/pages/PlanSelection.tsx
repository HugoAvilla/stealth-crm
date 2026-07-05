import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type PlanPrice = {
  plan_code: string;
  billing_period: 'monthly' | 'annual';
  price: number;
};

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);

  const [searchParams] = useSearchParams();
  const isUpgrade = searchParams.get('mode') === 'upgrade';

  useEffect(() => {
    const fetchPricesAndRequests = async () => {
      try {
        // Fetch prices
        const { data: priceData, error: priceError } = await supabase
          .from('plan_prices')
          .select('plan_code, billing_period, price');

        if (priceError) throw priceError;
        if (priceData) setPrices(priceData as PlanPrice[]);

        // Fetch pending upgrade requests for the user's subscription
        if (user?.id && isUpgrade) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (subData) {
            const { data: reqData, error: reqError } = await supabase
              .from('upgrade_requests')
              .select('id')
              .eq('subscription_id', subData.id)
              .in('status', ['pending_payment', 'payment_submitted'])
              .maybeSingle();

            if (!reqError && reqData) {
              setHasPendingUpgrade(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching plan prices/requests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPricesAndRequests();
  }, [user, isUpgrade]);

  const getPrice = (plan: string, period: 'monthly' | 'annual') => {
    const found = prices.find(p => p.plan_code === plan && p.billing_period === period);
    return found ? found.price : 0;
  };

  const handleSelectPlan = (planCode: string) => {
    if (planCode === 'premium') return;
    const period = isAnnual ? 'annual' : 'monthly';
    if (isUpgrade) {
      navigate(`/assinatura?mode=upgrade&target=${planCode}&period=${period}`);
    } else {
      navigate(`/assinatura?plan=${planCode}&period=${period}`);
    }
  };

  const features = [
    { name: "Dashboard", basic: true, ultra: true, premium: true },
    { name: "Gestão de Vendas", basic: true, ultra: true, premium: true },
    { name: "Gestão de Boxes", basic: true, ultra: true, premium: true },
    { name: "Financeiro", basic: true, ultra: true, premium: true },
    { name: "CAC (Custo de Aquisição)", basic: true, ultra: true, premium: true },
    { name: "Compras", basic: false, ultra: true, premium: true },
    { name: "Integração Bancária", basic: false, ultra: true, premium: true },
    { name: "Gestão de Clientes", basic: true, ultra: true, premium: true },
    { name: "Relatórios", basic: true, ultra: true, premium: true },
    { name: "Comissões", basic: false, ultra: true, premium: true },
    { name: "Garantias", basic: true, ultra: true, premium: true },
    { name: "Ordens de Serviço", basic: true, ultra: true, premium: true },
    { name: "Estoque", basic: false, ultra: true, premium: true },
    { name: "Controle de Perdas", basic: false, ultra: true, premium: true },
    { name: "Perfis e Permissões", basic: false, ultra: true, premium: true },
    { name: "IA Integrada", basic: false, ultra: false, premium: true },
    { name: "Suporte ao usuário", basic: true, ultra: true, premium: true },
  ];

  const renderFeatureValue = (val: boolean | string) => {
    if (typeof val === 'string') return <span className="font-medium">{val}</span>;
    return val ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const basicPrice = getPrice('basic', isAnnual ? 'annual' : 'monthly');
  const ultraPrice = getPrice('ultra', isAnnual ? 'annual' : 'monthly');

  // Calculate monthly equivalent for annual
  const basicMonthlyEq = basicPrice / 12;
  const ultraMonthlyEq = ultraPrice / 12;

  const currentPlan = user?.planCode || 'basic';

  const handleBack = async () => {
    if (isUpgrade) {
      navigate(-1);
    } else {
      await signOut();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {isUpgrade ? "Aprimore seu plano" : "Escolha o plano ideal para seu negócio"}
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            {isUpgrade
              ? "O módulo Estoque e Perdas estão disponíveis a partir do plano Ultra."
              : "Ferramentas poderosas para alavancar suas vendas e gestão."}
          </p>
        </div>

        <div className="mt-12 flex justify-center items-center gap-4">
          <Label htmlFor="billing-toggle" className={`text-sm ${!isAnnual ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500'}`}>Mensal</Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle" className={`text-sm flex items-center gap-2 ${isAnnual ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
            Anual
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Economize 20%
            </span>
          </Label>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Basic Plan */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm flex flex-col">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Básico</h3>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para profissionais independentes e pequenos negócios.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(isAnnual ? basicMonthlyEq : basicPrice)}</span>
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
            </p>
            {isAnnual && (
              <p className="mt-1 text-sm text-gray-500">Cobrado {formatPrice(basicPrice)} anualmente</p>
            )}
            <Button
              className="mt-8 w-full"
              variant="outline"
              disabled={isUpgrade && currentPlan === 'basic'}
              onClick={() => handleSelectPlan('basic')}
            >
              {isUpgrade && currentPlan === 'basic' ? "Seu Plano Atual" : "Começar com Básico"}
            </Button>
          </div>

          {/* Ultra Plan */}
          <div className="rounded-2xl border-2 border-primary bg-white dark:bg-gray-800 p-8 shadow-md relative flex flex-col">
            <div className="absolute top-0 right-6 -translate-y-1/2 transform">
              <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold tracking-wider text-primary-foreground uppercase">
                Recomendado
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ultra</h3>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para equipes em crescimento que precisam de mais poder.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatPrice(isAnnual ? ultraMonthlyEq : ultraPrice)}</span>
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">/mês</span>
            </p>
            {isAnnual && (
              <p className="mt-1 text-sm text-gray-500">Cobrado {formatPrice(ultraPrice)} anualmente</p>
            )}
            <Button
              className="mt-8 w-full"
              disabled={hasPendingUpgrade || (isUpgrade && currentPlan === 'ultra')}
              onClick={() => handleSelectPlan('ultra')}
            >
              {hasPendingUpgrade
                ? "Upgrade em análise"
                : isUpgrade && currentPlan === 'ultra'
                  ? "Seu Plano Atual"
                  : isUpgrade
                    ? "Fazer Upgrade para Ultra"
                    : "Assinar Ultra"}
            </Button>
            {hasPendingUpgrade && (
              <p className="mt-2 text-xs text-yellow-600 text-center font-medium">
                Seu upgrade já foi solicitado e está aguardando aprovação.
              </p>
            )}
          </div>

          {/* Premium Plan */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 opacity-75 flex flex-col">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Premium</h3>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Para operações avançadas e grandes volumes.</p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-400">Em breve</span>
            </p>
            <Button
              className="mt-8 w-full opacity-50 cursor-not-allowed"
              variant="secondary"
              disabled
            >
              Em breve
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-24">
          <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">Compare os recursos</h3>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-4 px-6 font-semibold text-gray-900 dark:text-white w-1/4">Recurso</th>
                  <th className="py-4 px-6 font-semibold text-center text-gray-900 dark:text-white w-1/4">Básico</th>
                  <th className="py-4 px-6 font-semibold text-center text-primary w-1/4">Ultra</th>
                  <th className="py-4 px-6 font-semibold text-center text-gray-500 w-1/4">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {features.map((feature, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300 font-medium">{feature.name}</td>
                    <td className="py-4 px-6 text-center">{renderFeatureValue(feature.basic)}</td>
                    <td className="py-4 px-6 text-center">{renderFeatureValue(feature.ultra)}</td>
                    <td className="py-4 px-6 text-center opacity-50">{renderFeatureValue(feature.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Comparison view */}
          <div className="lg:hidden space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-center">Básico</h4>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex justify-between py-3 px-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{feature.name}</span>
                    <span>{renderFeatureValue(feature.basic)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-primary overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-primary/20">
                <h4 className="font-semibold text-center text-primary">Ultra</h4>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex justify-between py-3 px-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{feature.name}</span>
                    <span>{renderFeatureValue(feature.ultra)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
