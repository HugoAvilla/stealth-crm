import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SystemConfig } from '../types';
import { useToast } from '@/hooks/use-toast';

export function useSubscriptionData(
    mode: string,
    planCode: string,
    billingPeriod: string,
    targetPlan: string,
    searchParams: URLSearchParams
) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [finalPrice, setFinalPrice] = useState(0);
    const [planPrice, setPlanPrice] = useState(0);

    useEffect(() => {
        if (user) {
            fetchConfigAndData();
        }
    }, [user]);

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
                // Mode upgrade: fetch full target plan price (no pro-rata)
                const targetPeriod = searchParams.get('period') || currentSub.billing_period || 'monthly';
                const { data: priceData, error: priceError } = await supabase
                    .from('plan_prices')
                    .select('price')
                    .eq('plan_code', targetPlan)
                    .eq('billing_period', targetPeriod)
                    .single();

                if (priceError) throw priceError;
                setPlanPrice(priceData.price);
                setFinalPrice(priceData.price);
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

    return { config, subscription, isLoading, finalPrice, planPrice };
}
