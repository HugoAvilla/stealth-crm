import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Loader2, Copy, Check, CreditCard, MessageCircle, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SystemConfig {
  pix_key: string;
  pix_qr_code_url: string | null;
  beneficiary_name: string;
  beneficiary_cnpj: string;
  bank_name: string;
  agency: string;
  account: string;
}

export default function Subscription() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || 'new'; // 'new' or 'upgrade'
  
  // For 'new' mode
  const planCode = searchParams.get('plan') || 'basic';
  const billingPeriod = searchParams.get('period') || 'monthly';
  
  // For 'upgrade' mode
  const targetPlan = searchParams.get('target') || 'ultra';

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Price & Pro-rata states
  const [finalPrice, setFinalPrice] = useState(0);
  const [planPrice, setPlanPrice] = useState(0);
  const [upgradeData, setUpgradeData] = useState<any>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast({ title: 'Erro ao sair', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchConfigAndData();
    }
  }, [user]);

  // If "new" mode and user already active, redirect out
  useEffect(() => {
    if (mode === 'new') {
      if (user?.subscriptionStatus === 'active') {
        if (user.companyId) {
          navigate('/');
        } else {
          navigate('/empresa/cadastro');
        }
      } else if (user?.subscriptionStatus === 'payment_submitted') {
        navigate('/aguardando-liberacao');
      }
    }
  }, [user, navigate, mode]);

  const fetchConfigAndData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Get system config for PIX details
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 1)
        .single();
      if (configError) throw configError;
      setConfig(configData as SystemConfig);

      let currentSub = null;
      if (user?.id) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (subData) {
          currentSub = subData;
          setSubscription(subData);
        }
      }

      if (mode === 'upgrade' && currentSub) {
        // Mode upgrade: compute prorata
        const targetPeriod = currentSub.billing_period || 'monthly';
        const { data: prorataData, error: prorataError } = await supabase.rpc('calculate_upgrade_prorata', {
          p_subscription_id: currentSub.id,
          p_target_plan: targetPlan,
          p_target_period: targetPeriod
        });
        
        if (prorataError) throw prorataError;
        
        setUpgradeData(prorataData);
        setFinalPrice(prorataData.amount_due);
        setPlanPrice(prorataData.target_price);
      } else {
        // Mode new: fetch exact plan price
        const { data: priceData, error: priceError } = await supabase
          .from('plan_prices')
          .select('price')
          .eq('plan_code', planCode)
          .eq('billing_period', billingPeriod)
          .single();
          
        if (priceError) throw priceError;
        setPlanPrice(priceData.price);
        setFinalPrice(priceData.price);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar informações de assinatura',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixKey = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.pix_key);
      setCopied(true);
      toast({ title: 'Chave PIX copiada!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmed || !user) return;

    setIsSubmitting(true);

    try {
      if (mode === 'upgrade' && subscription) {
        // Execute upgrade RPC
        const targetPeriod = subscription.billing_period || 'monthly';
        const { error: upgradeError } = await supabase.rpc('request_plan_upgrade', {
          p_subscription_id: subscription.id,
          p_target_plan: targetPlan,
          p_target_period: targetPeriod
        });
        
        if (upgradeError) throw upgradeError;

        await refreshUser();
        navigate('/');
        toast({ title: 'Solicitação de upgrade enviada!' });
      } else {
        // Mode new: Update subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'payment_submitted',
            plan_code: planCode,
            billing_period: billingPeriod,
            plan_price: planPrice,
            final_price: finalPrice
          })
          .eq('user_id', user.id);

        if (subError) throw subError;

        await refreshUser();
        navigate('/aguardando-liberacao');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Erro ao confirmar pagamento',
        description: 'Tente novamente em alguns instantes',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isUpgrade = mode === 'upgrade';
  const displayPlanName = isUpgrade ? targetPlan : planCode;
  const displayPeriod = isUpgrade ? (subscription?.billing_period || 'monthly') : billingPeriod;
  
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
              onClick={() => navigate(isUpgrade ? '/upgrade' : '/planos')}
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
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plano {planNameFormatted} ({periodFormatted})
              </CardTitle>
              <CardDescription>Resumo do pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price Display */}
              <div className="text-center py-4 bg-primary/10 rounded-lg space-y-1">
                {isUpgrade && upgradeData && upgradeData.credit_amount > 0 && (
                  <div className="text-sm text-green-600 font-medium mb-2">
                    Crédito pro-rata: - R$ {upgradeData.credit_amount.toFixed(2).replace('.', ',')}
                  </div>
                )}
                <span className="text-4xl font-bold text-primary">
                  R$ {finalPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-muted-foreground">/{displayPeriod === 'annual' ? 'ano' : 'mês'}</span>
              </div>

              {isUpgrade && upgradeData && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/30 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Valor do plano alvo:</span>
                    <span>R$ {upgradeData.target_price.toFixed(2).replace('.', ',')}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Dias restantes do plano atual:</span>
                    <span>{upgradeData.days_remaining} dias</span>
                  </p>
                  <p className="flex justify-between font-medium text-green-600">
                    <span className="">Desconto do saldo não utilizado:</span>
                    <span>- R$ {upgradeData.credit_amount.toFixed(2).replace('.', ',')}</span>
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => navigate(isUpgrade ? '/upgrade' : '/planos')}>
                  Trocar Plano
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pagamento via PIX
              </CardTitle>
              <CardDescription>Copie a chave PIX abaixo e faça a transferência</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PIX Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Chave PIX (Email)</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {config?.pix_key || 'Carregando...'}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyPixKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-2 text-sm p-4 bg-muted/30 rounded-lg">
                <p><span className="text-muted-foreground">Beneficiário:</span> {config?.beneficiary_name || ''}</p>
                <p><span className="text-muted-foreground">Banco:</span> {config?.bank_name || ''}</p>
              </div>

              {/* Value to pay */}
              <div className="text-center py-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {finalPrice.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={finalPrice === 0 && isUpgrade}
                >
                  {finalPrice === 0 ? 'Concluir' : 'Já fiz o pagamento'}
                </Button>
                <a
                  href="https://wa.me/5517992573141?text=Preciso%20de%20ajuda%20com%20o%20pagamento%20do%20WFE%20Evolution%20CRM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Preciso de ajuda
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Você realmente efetuou o pagamento de R$ {finalPrice.toFixed(2).replace('.', ',')} via PIX?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Após confirmar, envie o comprovante via WhatsApp para agilizar a liberação.
            </p>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Confirmo que realizei o pagamento
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={!confirmed || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar e Aguardar Liberação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
