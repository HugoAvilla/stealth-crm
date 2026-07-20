import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowLeft } from 'lucide-react';

import { useSubscriptionData } from './hooks/useSubscriptionData';
import { useConfirmPayment } from './hooks/useConfirmPayment';
import { PlanDetailsCard } from './components/PlanDetailsCard';
import { PixPaymentCard } from './components/PixPaymentCard';
import { ConfirmPaymentModal } from './components/ConfirmPaymentModal';

export default function Subscription() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || 'new'; // 'new' or 'upgrade'
  const planCode = searchParams.get('plan') || 'basic';
  const billingPeriod = searchParams.get('period') || 'monthly';
  const targetPlan = searchParams.get('target') || 'ultra';

  const { config, subscription, isLoading, finalPrice, planPrice } = useSubscriptionData(
    mode, planCode, billingPeriod, targetPlan, searchParams
  );

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const targetPeriod = searchParams.get('period') || subscription?.billing_period || 'monthly';

  const { confirmPayment, isSubmitting } = useConfirmPayment({
    mode,
    subscription,
    targetPlan,
    targetPeriod,
    planCode,
    billingPeriod,
    planPrice,
    finalPrice
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  // Redirect logic based on user status and mode
  useEffect(() => {
    if (!user) return;

    if (mode === 'new') {
      if (user.subscriptionStatus === 'active') {
        if (user.companyId) {
          navigate('/');
        } else {
          navigate('/empresa/cadastro');
        }
      } else if (user.subscriptionStatus === 'payment_submitted') {
        navigate('/aguardando-liberacao');
      } else if (!searchParams.get('plan') || !searchParams.get('period')) {
        navigate('/planos');
      }
    } else if (mode === 'upgrade') {
      // If user is already active with the target plan or higher, redirect out
      const planHierarchy: Record<string, number> = { basic: 1, ultra: 2, premium: 3 };
      const currentPlanLevel = planHierarchy[user.planCode || 'basic'] || 0;
      const targetPlanLevel = planHierarchy[targetPlan] || 0;

      if (user.subscriptionStatus === 'active' && currentPlanLevel >= targetPlanLevel) {
        // User already has this plan or better, no need for upgrade
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate, mode, searchParams, targetPlan]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isUpgrade = mode === 'upgrade';
  const displayPlanName = isUpgrade ? targetPlan : planCode;
  const displayPeriod = isUpgrade ? (searchParams.get('period') || subscription?.billing_period || 'monthly') : billingPeriod;

  const planNameFormatted = displayPlanName === 'ultra' ? 'Ultra' : displayPlanName === 'premium' ? 'Premium' : 'Básico';
  const periodFormatted = displayPeriod === 'annual' ? 'Anual' : 'Mensal';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-2 flex justify-between">
          {!user?.companyId ? (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground -ml-4"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground -ml-4"
              onClick={() => navigate(isUpgrade ? '/planos?mode=upgrade' : '/planos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isUpgrade ? 'Concluir Upgrade' : 'Ative sua assinatura'}
          </h1>
          <p className="text-muted-foreground mb-4">
            Faça o pagamento via PIX para liberar {isUpgrade ? 'os novos recursos' : 'seu acesso completo'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <PlanDetailsCard
            isUpgrade={isUpgrade}
            planNameFormatted={planNameFormatted}
            periodFormatted={periodFormatted}
            displayPeriod={displayPeriod}
            finalPrice={finalPrice}
            planPrice={planPrice}
          />

          <PixPaymentCard
            config={config}
            finalPrice={finalPrice}
            isUpgrade={isUpgrade}
            onOpenConfirmModal={() => setShowConfirmModal(true)}
          />
        </div>
      </div>

      <ConfirmPaymentModal
        finalPrice={finalPrice}
        isOpen={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        isSubmitting={isSubmitting}
        onConfirm={() => confirmPayment(() => setShowConfirmModal(false))}
      />
    </div>
  );
}
