import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanPrice = {
    plan_code: string;
    billing_period: 'monthly' | 'annual';
    price: number;
};

export function useUpgradeData(isOwnerOrAdmin: boolean, companyId?: number) {
    const [prices, setPrices] = useState<PlanPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingUpgrade, setPendingUpgrade] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch prices
                const { data: priceData, error: priceError } = await supabase
                    .from('plan_prices')
                    .select('plan_code, billing_period, price');

                if (priceError) throw priceError;
                if (priceData) setPrices(priceData as PlanPrice[]);

                // 2. Check for pending upgrade requests if they are admin
                if (isOwnerOrAdmin && companyId) {
                    const { data: pendingData, error: pendingError } = await supabase
                        .from('upgrade_requests')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('status', 'payment_submitted')
                        .maybeSingle();

                    if (pendingError) throw pendingError;
                    if (pendingData) {
                        setPendingUpgrade(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching upgrade data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOwnerOrAdmin, companyId]);

    const getPrice = (plan: string, period: 'monthly' | 'annual') => {
        const found = prices.find(p => p.plan_code === plan && p.billing_period === period);
        return found ? found.price : 0;
    };

    return { loading, pendingUpgrade, getPrice };
}
