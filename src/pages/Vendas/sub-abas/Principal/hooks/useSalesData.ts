import { useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaleWithDetails } from "@/types/sales";

export function useSalesData(currentDate: Date) {
    const { user } = useAuth();
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    const monthStartStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const monthEndStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const fetchSales = useCallback(async (silently: boolean = false) => {
        if (!user?.id || !user?.companyId) return;
        if (!silently) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    client:clients(id, name, phone),
                    vehicle:vehicles(id, brand, model, year, plate, size),
                    sale_items(
                        id, service_id, quantity, unit_price, total_price,
                        service:services(id, name, base_price)
                    )
                `)
                .eq('company_id', user.companyId)
                .is('deleted_at', null)
                .gte('sale_date', monthStartStr)
                .lte('sale_date', monthEndStr)
                .order('sale_date', { ascending: false });

            if (data) {
                const transformedSales: SaleWithDetails[] = data.map((sale: any) => ({
                    ...sale,
                    sale_items: sale.sale_items || [],
                }));
                setSales(transformedSales);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            if (!silently) setLoading(false);
        }
    }, [user?.id, user?.companyId, monthStartStr, monthEndStr]);

    return {
        sales,
        setSales,
        loading,
        fetchSales
    };
}
