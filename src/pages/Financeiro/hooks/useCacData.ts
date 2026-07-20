import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CAC_ORIGIN_OPTIONS } from "@/constants/origins";

export function useCacData() {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const [loading, setLoading] = useState(false);
    const [targetRoas, setTargetRoas] = useState<number>(4);

    // Core metrics
    const [totalCac, setTotalCac] = useState(0);
    const [marketingCost, setMarketingCost] = useState(0);
    const [salesCost, setSalesCost] = useState(0);
    const [newPayingClients, setNewPayingClients] = useState(0);
    const [cohortRevenue, setCohortRevenue] = useState(0);

    // Arrays
    const [channelStats, setChannelStats] = useState<any[]>([]);
    const [cacTransactions, setCacTransactions] = useState<any[]>([]);
    const [sellerRanking, setSellerRanking] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);

    // New vs Returning
    const [newClientSales, setNewClientSales] = useState(0);
    const [returningClientSales, setReturningClientSales] = useState(0);
    const [newClientRevenue, setNewClientRevenue] = useState(0);
    const [returningClientRevenue, setReturningClientRevenue] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem("@stealth-crm:target-roas");
        if (saved) setTargetRoas(Number(saved));
    }, []);

    const handleTargetRoasChange = (val: string) => {
        if (val === '') {
            setTargetRoas(0);
            return;
        }
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setTargetRoas(num);
            localStorage.setItem("@stealth-crm:target-roas", num.toString());
        }
    };

    useEffect(() => {
        if (user?.companyId) {
            fetchSellers();
            fetchAccounts();
        }
    }, [user?.companyId]);

    const fetchSellers = async () => {
        try {
            const { data, error } = await supabase
                .from('commission_people')
                .select('id, name')
                .eq('company_id', user!.companyId)
                .eq('type', 'VENDEDOR')
                .eq('is_active', true)
                .order('name');
            if (!error) setSellers(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, name, is_main')
                .eq('company_id', user!.companyId)
                .eq('is_active', true)
                .order('name');
            if (!error) setAccounts(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchCacData();
    }, [startDate, endDate, user?.id]);

    const fetchCacData = async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.company_id) return;
            const companyId = profile.company_id;

            // 1. Fetch Expenses marked as CAC
            const { data: cacTxData } = await supabase
                .from('transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('include_in_cac', true)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate);

            const transactions = (cacTxData || []) as any[];
            setCacTransactions(transactions);

            // 1.2 Fetch Commissions in period
            const { data: commData } = await supabase
                .from('sale_commissions')
                .select(`
          commission_amount,
          commission_person_id,
          person_name_snapshot,
          person_type,
          sale:sales!inner(sale_date, status, total)
        `)
                .eq('company_id', companyId)
                .eq('sale.status', 'Fechada')
                .gte('sale.sale_date', startDate)
                .lte('sale.sale_date', endDate);

            const commissions = (commData || []) as any[];

            // Agrupar ranking de vendedores
            const sellerPerformance: Record<string, any> = {};
            commissions.forEach((c: any) => {
                if (c.person_type === 'VENDEDOR' && c.commission_person_id) {
                    const sellerId = c.commission_person_id;
                    if (!sellerPerformance[sellerId]) {
                        sellerPerformance[sellerId] = {
                            id: sellerId,
                            name: c.person_name_snapshot || 'Vendedor',
                            vendasCount: 0,
                            faturamentoTotal: 0,
                            comissaoTotal: 0
                        };
                    }
                    sellerPerformance[sellerId].vendasCount += 1;
                    sellerPerformance[sellerId].faturamentoTotal += Number(c.sale?.total || 0);
                    sellerPerformance[sellerId].comissaoTotal += Number(c.commission_amount || 0);
                }
            });
            const sellersRank = Object.values(sellerPerformance).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
            setSellerRanking(sellersRank);

            const totalComissoesVendedores = commissions
                .filter((c: any) => c.person_type === 'VENDEDOR')
                .reduce((sum: number, c: any) => sum + Number(c.commission_amount || 0), 0);

            let tCac = totalComissoesVendedores;
            let mCost = 0;
            let sCost = totalComissoesVendedores;
            const costByOrigin: Record<string, number> = {};
            let geralCost = 0;

            transactions.forEach((tx) => {
                tCac += Number(tx.amount);
                if (tx.cac_bucket === 'marketing') mCost += Number(tx.amount);
                if (tx.cac_bucket === 'vendas') sCost += Number(tx.amount);

                const origin = tx.cac_origin || 'Desconhecido';
                if (origin === 'Geral') {
                    geralCost += Number(tx.amount);
                } else {
                    costByOrigin[origin] = (costByOrigin[origin] || 0) + Number(tx.amount);
                }
            });

            setTotalCac(tCac);
            setMarketingCost(mCost);
            setSalesCost(sCost);

            // 2. Fetch New Clients
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, origem, created_at')
                .eq('company_id', companyId)
                .gte('created_at', `${startDate}T00:00:00Z`)
                .lte('created_at', `${endDate}T23:59:59Z`);

            const clients = clientsData || [];
            const clientIds = clients.map(c => c.id);

            // 3. Fetch Closed Sales
            let salesData: any[] = [];
            if (clientIds.length > 0) {
                const { data: sData } = await supabase
                    .from('sales')
                    .select('client_id, total')
                    .in('client_id', clientIds)
                    .gte('sale_date', startDate)
                    .lte('sale_date', endDate)
                    .eq('status', 'Fechada');
                salesData = sData || [];
            }

            const payingClientsByOrigin: Record<string, Set<number>> = {};
            const revenueByOrigin: Record<string, number> = {};
            let totPayingClients = 0;
            let totRevenue = 0;

            const payingClientIds = new Set(salesData.map(s => s.client_id));

            salesData.forEach(sale => {
                const client = clients.find(c => c.id === sale.client_id);
                const origin = client?.origem || 'Passante';
                revenueByOrigin[origin] = (revenueByOrigin[origin] || 0) + Number(sale.total);
                totRevenue += Number(sale.total);
            });

            clients.forEach(client => {
                if (payingClientIds.has(client.id)) {
                    const origin = client.origem || 'Passante';
                    if (!payingClientsByOrigin[origin]) payingClientsByOrigin[origin] = new Set();
                    payingClientsByOrigin[origin].add(client.id);
                }
            });

            Object.values(payingClientsByOrigin).forEach(set => {
                totPayingClients += set.size;
            });

            setNewPayingClients(totPayingClients);
            setCohortRevenue(totRevenue);

            // 4. Channel Stats
            const geralCostPerClient = totPayingClients > 0 ? geralCost / totPayingClients : 0;
            const stats = CAC_ORIGIN_OPTIONS.filter(o => o !== 'Geral').map((origin) => {
                const pClients = payingClientsByOrigin[origin]?.size || 0;
                const rev = revenueByOrigin[origin] || 0;
                const directCost = costByOrigin[origin] || 0;
                const proratedCost = pClients * geralCostPerClient;
                const totCost = directCost + proratedCost;
                const cac = pClients > 0 ? totCost / pClients : 0;
                const roas = totCost > 0 ? rev / totCost : 0;

                return { origem: origin, direto: directCost, rateado: proratedCost, custoTotal: totCost, clientesPagantes: pClients, cac, receita: rev, roas };
            });

            stats.sort((a, b) => b.clientesPagantes - a.clientesPagantes);
            setChannelStats(stats);

            // 5. Fetch New vs Returning
            const { data: allPeriodSales } = await supabase
                .from('sales')
                .select('id, client_id, total, is_new_client')
                .eq('company_id', companyId)
                .eq('status', 'Fechada')
                .gte('sale_date', startDate)
                .lte('sale_date', endDate);

            let nNew = 0, nReturn = 0, revNew = 0, revReturn = 0;
            (allPeriodSales || []).forEach((s: any) => {
                if (s.is_new_client === false) {
                    nReturn++;
                    revReturn += Number(s.total);
                } else {
                    nNew++;
                    revNew += Number(s.total);
                }
            });
            setNewClientSales(nNew);
            setReturningClientSales(nReturn);
            setNewClientRevenue(revNew);
            setReturningClientRevenue(revReturn);

        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao buscar dados CAC');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCacTransaction = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir esta despesa de CAC?")) return;
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            toast.success("Despesa de CAC excluída com sucesso!");
            fetchCacData();
        } catch (e: any) {
            toast.error(`Erro ao excluir: ${e.message}`);
        }
    };

    const avgCac = newPayingClients > 0 ? totalCac / newPayingClients : 0;
    const globalRoas = totalCac > 0 ? cohortRevenue / totalCac : 0;
    const roasProgress = targetRoas > 0 ? Math.min((globalRoas / targetRoas) * 100, 100) : 0;

    const navigateMonth = (direction: 'PREV' | 'NEXT') => {
        setCurrentMonth(prev => direction === 'PREV' ? subMonths(prev, 1) : addMonths(prev, 1));
    };
    const setMonth = (val: string) => {
        if (val) {
            const [year, month] = val.split("-").map(Number);
            setCurrentMonth(new Date(year, month - 1, 1, 12, 0, 0));
        }
    };

    return {
        loading,
        currentMonth,
        navigateMonth,
        setMonth,
        targetRoas,
        handleTargetRoasChange,
        totalCac,
        marketingCost,
        salesCost,
        newPayingClients,
        cohortRevenue,
        avgCac,
        globalRoas,
        roasProgress,
        channelStats,
        cacTransactions,
        sellerRanking,
        sellers,
        accounts,
        newClientSales,
        returningClientSales,
        newClientRevenue,
        returningClientRevenue,
        fetchCacData,
        handleDeleteCacTransaction,
        userCompanyId: user?.companyId
    };
}
