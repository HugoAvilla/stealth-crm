import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PricingCards } from "./components/PricingCards";
import { ComparisonTable } from "./components/ComparisonTable";
import { usePlanPrices } from "./hooks/usePlanPrices";
import { Feature } from "./types";

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  const [searchParams] = useSearchParams();
  const isUpgrade = searchParams.get('mode') === 'upgrade';

  const { loading, hasPendingUpgrade, getPrice } = usePlanPrices(isUpgrade);

  const handleSelectPlan = (planCode: string) => {
    const period = isAnnual ? 'annual' : 'monthly';
    if (isUpgrade) {
      navigate(`/assinatura?mode=upgrade&target=${planCode}&period=${period}`);
    } else {
      navigate(`/assinatura?plan=${planCode}&period=${period}`);
    }
  };

  const features: Feature[] = [
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

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const basicPrice = getPrice('basic', 'monthly');
  const ultraPrice = getPrice('ultra', isAnnual ? 'annual' : 'monthly');

  // Calculate monthly equivalent for annual
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

        <PricingCards
          isAnnual={isAnnual}
          basicPrice={basicPrice}
          ultraPrice={ultraPrice}
          ultraMonthlyEq={ultraMonthlyEq}
          currentPlan={currentPlan}
          hasPendingUpgrade={hasPendingUpgrade}
          isUpgrade={isUpgrade}
          handleSelectPlan={handleSelectPlan}
          formatPrice={formatPrice}
        />

        <ComparisonTable features={features} />

      </div>
    </div>
  );
}
