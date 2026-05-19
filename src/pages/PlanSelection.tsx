import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type PlanPrice = {
  plan_code: string;
  billing_period: 'monthly' | 'annual';
  price: number;
};

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('plan_prices')
          .select('plan_code, billing_period, price');
        
        if (error) throw error;
        if (data) setPrices(data as PlanPrice[]);
      } catch (error) {
        console.error('Error fetching plan prices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const getPrice = (plan: string, period: 'monthly' | 'annual') => {
    const found = prices.find(p => p.plan_code === plan && p.billing_period === period);
    return found ? found.price : 0;
  };

  const handleSelectPlan = (planCode: string) => {
    if (planCode === 'premium') return;
    const period = isAnnual ? 'annual' : 'monthly';
    navigate(`/assinatura?plan=${planCode}&period=${period}`);
  };

  const features = [
    { name: "Usuários Base", basic: "1", ultra: "3", premium: "10" },
    { name: "Controle de Vendas", basic: true, ultra: true, premium: true },
    { name: "Gestão de Clientes", basic: true, ultra: true, premium: true },
    { name: "Controle Financeiro", basic: true, ultra: true, premium: true },
    { name: "Cálculo de Comissões", basic: true, ultra: true, premium: true },
    { name: "Emissão de Recibos", basic: true, ultra: true, premium: true },
    { name: "Agendamento (Espaço)", basic: true, ultra: true, premium: true },
    { name: "Gestão de Garantias", basic: true, ultra: true, premium: true },
    { name: "Contas a Pagar/Receber", basic: true, ultra: true, premium: true },
    { name: "Ordem de Serviço", basic: true, ultra: true, premium: true },
    { name: "Relatórios Avançados", basic: true, ultra: true, premium: true },
    { name: "Controle de Estoque", basic: false, ultra: true, premium: true },
    { name: "Suporte Prioritário", basic: false, ultra: true, premium: true },
    { name: "API de Integração", basic: false, ultra: false, premium: true },
  ];

  const renderFeatureValue = (val: boolean | string) => {
    if (typeof val === 'string') return <span className="font-medium">{val}</span>;
    return val ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Escolha o plano ideal para seu negócio
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Ferramentas poderosas para alavancar suas vendas e gestão.
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
              onClick={() => handleSelectPlan('basic')}
            >
              Começar com Básico
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
              onClick={() => handleSelectPlan('ultra')}
            >
              Assinar Ultra
            </Button>
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
