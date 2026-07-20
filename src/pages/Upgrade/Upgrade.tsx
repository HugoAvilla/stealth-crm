import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

import { useUpgradeData } from './hooks/useUpgradeData';
import { RestrictedAccess } from './components/RestrictedAccess';
import { UpgradeCards } from './components/UpgradeCards';

export default function Upgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOwnerOrAdmin = Boolean(user?.isCompanyOwner || user?.role === 'ADMIN');

  useEffect(() => {
    // If user is already on ultra or premium, they shouldn't be here
    if (user?.planCode === 'ultra' || user?.planCode === 'premium') {
      navigate('/');
    }
  }, [user, navigate]);

  const { loading, pendingUpgrade, getPrice } = useUpgradeData(isOwnerOrAdmin, user?.companyId);

  const handleSelectUpgrade = (planCode: string) => {
    if (pendingUpgrade) return;
    navigate(`/assinatura?mode=upgrade&target=${planCode}`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If not admin/owner, show message to contact admin
  if (!isOwnerOrAdmin) {
    return <RestrictedAccess />;
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

        <UpgradeCards
          ultraMonthly={ultraMonthly}
          pendingUpgrade={pendingUpgrade}
          onSelectUpgrade={handleSelectUpgrade}
          formatPrice={formatPrice}
        />

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
