import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, CreditCard, Users, Database, Headphones, RefreshCw, MessageCircle, QrCode, Tag, X } from 'lucide-react';
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
  const { user, refreshUser } = useAuth();
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

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    // Redirect if already active or submitted
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
      // Use defaults
      setConfig({
        pix_key: 'pix@wfeevolution.com.br',
        pix_qr_code_url: null,
        beneficiary_name: 'WFE Evolution LTDA',
        beneficiary_cnpj: '00.000.000/0000-00',
        bank_name: 'Banco do Brasil',
        agency: '0000',
        account: '00000-0',
        monthly_price: 297.00
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

      // Calculate discount
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
      
      // Update subscription with coupon info
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

      // If coupon was applied, record usage
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

  const openWhatsApp = () => {
    window.open('https://wa.me/5500000000000?text=Preciso de ajuda com o pagamento do WFE Evolution CRM', '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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

              <ul className="space-y-3">
                {[
                  { icon: Users, text: 'Usuários ilimitados' },
                  { icon: Database, text: 'Clientes ilimitados' },
                  { icon: Database, text: 'Armazenamento ilimitado' },
                  { icon: Headphones, text: 'Suporte prioritário' },
                  { icon: RefreshCw, text: 'Atualizações automáticas' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Pagamento via PIX
              </CardTitle>
              <CardDescription>Escaneie o QR Code ou copie a chave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                {config?.pix_qr_code_url ? (
                  <img 
                    src={config.pix_qr_code_url} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 rounded-lg border"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">QR Code</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PIX Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Chave PIX</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {config?.pix_key}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyPixKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Beneficiário:</span> {config?.beneficiary_name}</p>
                <p><span className="text-muted-foreground">CNPJ:</span> {config?.beneficiary_cnpj}</p>
                <p><span className="text-muted-foreground">Banco:</span> {config?.bank_name}</p>
                <p><span className="text-muted-foreground">Agência:</span> {config?.agency}</p>
                <p><span className="text-muted-foreground">Conta:</span> {config?.account}</p>
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
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Preciso de ajuda
                </Button>
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
                <p>Escaneie o QR Code com o app do seu banco ou copie a chave PIX</p>
              </div>
              <div className="flex-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p>Realize o pagamento de R$ {config?.monthly_price?.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="flex-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p>Clique em "Já fiz o pagamento" e aguarde a liberação (até 5 minutos)</p>
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
              Você realmente efetuou o pagamento de R$ {config?.monthly_price?.toFixed(2).replace('.', ',')} via PIX?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Nosso sistema irá verificar automaticamente. Pagamentos falsos resultarão em bloqueio permanente.
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
