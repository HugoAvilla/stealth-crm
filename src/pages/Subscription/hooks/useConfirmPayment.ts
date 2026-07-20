import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UseConfirmPaymentProps {
    mode: string;
    subscription: any;
    targetPlan: string;
    targetPeriod: string;
    planCode: string;
    billingPeriod: string;
    planPrice: number;
    finalPrice: number;
}

export function useConfirmPayment({
    mode,
    subscription,
    targetPlan,
    targetPeriod,
    planCode,
    billingPeriod,
    planPrice,
    finalPrice,
}: UseConfirmPaymentProps) {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const confirmPayment = async (onSuccess: () => void) => {
        if (!user) return;

        setIsSubmitting(true);

        try {
            // Abrir WhatsApp com mensagem estruturada
            const msg = encodeURIComponent(`Olá, realizei o pagamento do WFE Evolution CRM. Segue o comprovante para conferencia.`);
            const whatsappUrl = `https://wa.me/5517992573141?text=${msg}`;
            window.open(whatsappUrl, '_blank');

            if (mode === 'upgrade' && subscription) {
                // Execute upgrade RPC
                const { error: upgradeError } = await supabase.rpc('request_plan_upgrade', {
                    p_subscription_id: subscription.id,
                    p_target_plan: targetPlan,
                    p_target_period: targetPeriod
                });

                if (upgradeError) throw upgradeError;

                await refreshUser();
                navigate('/');
                toast({ title: 'Solicitação de upgrade enviada! Abertura do WhatsApp iniciada.' });
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
                toast({ title: 'Pagamento enviado para aprovação! Abertura do WhatsApp iniciada.' });
            }
            onSuccess();
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

    return { confirmPayment, isSubmitting };
}
