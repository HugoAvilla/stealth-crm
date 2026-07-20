import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlanPrice } from '../types';

export function usePlanPrices(isUpgrade: boolean) {
    const { user } = useAuth();
    const [prices, setPrices] = useState<PlanPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);

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

    return {
        prices,
        loading,
        hasPendingUpgrade,
        getPrice
    };
}
