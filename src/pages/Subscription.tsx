import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Loader2, Copy, Check, CreditCard, Users, Database, Headphones, RefreshCw, MessageCircle, Tag, X, BarChart3, Shield, Package, Building2, DollarSign, Wrench } from 'lucide-react';
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
  monthly_price: number;
}

export default function Subscription() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast({ title: 'Erro ao sair', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (user?.subscriptionStatus === 'active') {
      if (user.companyId) {
        navigate('/');
      } else {
        navigate('/empresa/cadastro');
      }
    } else if (user?.subscriptionStatus === 'payment_submitted') {
      navigate('/aguardando-liberacao');
    }
  }, [user, navigate]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setConfig(data as SystemConfig);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({
        title: 'Erro ao carregar configurações de pagamento',
        description: 'Tente novamente em alguns instantes.',
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

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: 'Digite um código de cupom', variant: 'destructive' });
      return;
    }

    setValidatingCoupon(true);

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code_input: couponCode.toUpperCase()
      });

      if (error) throw error;

      const result = data?.[0];

      if (!result?.is_valid) {
        toast({ title: result?.message || 'Cupom inválido', variant: 'destructive' });
        return;
      }

      const basePrice = config?.monthly_price || 297;
      let discountAmount = 0;
      if (result.discount_type === 'percentage') {
        discountAmount = (basePrice * result.discount_value) / 100;
      } else {
        discountAmount = result.discount_value;
      }

      setDiscount(discountAmount);
      setCouponApplied(true);
      toast({ title: `Cupom aplicado! Desconto de R$ ${discountAmount.toFixed(2)}` });
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({ title: 'Erro ao validar cupom', variant: 'destructive' });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setDiscount(0);
    toast({ title: 'Cupom removido' });
  };

  const getFinalPrice = () => {
    const basePrice = config?.monthly_price || 297;
    return Math.max(0, basePrice - discount);
  };

  const handleConfirmPayment = async () => {
    if (!confirmed || !user) return;

    setIsSubmitting(true);

    try {
      const finalPrice = getFinalPrice();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'payment_submitted',
          coupon_code: couponApplied ? couponCode.toUpperCase() : null,
          discount_amount: discount,
          final_price: finalPrice
        })
        .eq('user_id', user.id);

      if (error) throw error;

      if (couponApplied) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (subData) {
          await supabase.rpc('apply_coupon', {
            coupon_code_input: couponCode.toUpperCase(),
            p_user_id: user.id,
            p_subscription_id: subData.id,
            p_discount_applied: discount
          });
        }
      }

      await refreshUser();
      navigate('/aguardando-liberacao');
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

  const crmFeatures = [
    { icon: DollarSign, text: 'Gestão completa de vendas' },
    { icon: Users, text: 'Cadastro e gestão de clientes' },
    { icon: CreditCard, text: 'Controle financeiro (DFC, DRE, Extrato)' },
    { icon: Building2, text: 'Gestão de espaço e vagas' },
    { icon: Shield, text: 'Emissão de garantias com envio via WhatsApp' },
    { icon: BarChart3, text: 'Relatórios completos em PDF' },
    { icon: Package, text: 'Gestão de estoque e materiais' },
    { icon: Wrench, text: 'Pipeline de produção' },
    { icon: Users, text: 'Equipe com múltiplos usuários e permissões' },
    { icon: Headphones, text: 'Suporte via WhatsApp' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-2">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground -ml-4"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Voltar para Login
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Ative sua assinatura</h1>
          <p className="text-muted-foreground">
            Faça o pagamento via PIX para liberar seu acesso completo
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plano WFE Evolution CRM
              </CardTitle>
              <CardDescription>Acesso completo a todas as funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price Display */}
              <div className="text-center py-4 bg-primary/10 rounded-lg space-y-1">
                {discount > 0 && (
                  <div className="text-lg text-muted-foreground line-through">
                    R$ {config?.monthly_price?.toFixed(2).replace('.', ',')}
                  </div>
                )}
                <span className="text-4xl font-bold text-primary">
                  R$ {getFinalPrice().toFixed(2).replace('.', ',')}
                </span>
                <span className="text-muted-foreground">/mês</span>
                {discount > 0 && (
                  <div className="text-sm text-green-500 font-medium">
                    Você economiza R$ {discount.toFixed(2).replace('.', ',')}!
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Possui um cupom de desconto?
                </label>
                {!couponApplied ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 uppercase font-mono"
                      disabled={validatingCoupon}
                    />
                    <Button
                      variant="outline"
                      onClick={validateCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                    >
                      {validatingCoupon ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Aplicar'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="font-mono font-medium">{couponCode}</span>
                      <span className="text-sm">aplicado</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* CRM Features */}
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">O que você recebe:</p>
                <ul className="space-y-2">
                  {crmFeatures.map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{item.text}</span>
                    </li>
                  ))}
                </ul>
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
                  R$ {getFinalPrice().toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowConfirmModal(true)}
                >
                  Já fiz o pagamento
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

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 text-sm text-muted-foreground">
              <div className="flex-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <p>Copie a chave PIX acima e faça a transferência pelo app do seu banco</p>
              </div>
              <div className="flex-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p>Realize o pagamento de R$ {getFinalPrice().toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="flex-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p>Clique em "Já fiz o pagamento" e envie o comprovante via WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Você realmente efetuou o pagamento de R$ {getFinalPrice().toFixed(2).replace('.', ',')} via PIX?
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
                  Confirmando...
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
