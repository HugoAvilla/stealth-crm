import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useInstantSearch(searchTerm: string) {
    const { user } = useAuth();
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        sales: any[];
        clients: any[];
        vehicles: any[];
    }>({ sales: [], clients: [], vehicles: [] });

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            const cleanQuery = searchTerm.trim();
            if (cleanQuery.length < 2) {
                setSearchResults({ sales: [], clients: [], vehicles: [] });
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const companyId = user?.companyId;
                if (!companyId) return;
                const term = `%${cleanQuery}%`;

                const { data: clientsData } = await supabase
                    .from('clients')
                    .select('id, name, phone')
                    .eq('company_id', companyId)
                    .or(`name.ilike.${term},phone.ilike.${term}`)
                    .limit(5);

                const clientIds = (clientsData || []).map(c => c.id);

                const { data: vehiclesData } = await supabase
                    .from('vehicles')
                    .select('id, brand, model, plate, client:clients(name)')
                    .eq('company_id', companyId)
                    .or(`brand.ilike.${term},model.ilike.${term},plate.ilike.${term}`)
                    .limit(5);

                const vehicleIds = (vehiclesData || []).map(v => v.id);

                let salesQuery = supabase
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
                    .eq('company_id', companyId)
                    .is('deleted_at', null);

                const filters = [];
                if (!isNaN(Number(cleanQuery))) {
                    filters.push(`id.eq.${Number(cleanQuery)}`);
                }
                if (clientIds.length > 0) {
                    filters.push(`client_id.in.(${clientIds.join(',')})`);
                }
                if (vehicleIds.length > 0) {
                    filters.push(`vehicle_id.in.(${vehicleIds.join(',')})`);
                }

                if (filters.length > 0) {
                    salesQuery = salesQuery.or(filters.join(','));
                } else {
                    salesQuery = salesQuery.ilike('observations', term);
                }

                const { data: salesData } = await salesQuery.limit(5);

                setSearchResults({
                    sales: salesData || [],
                    clients: clientsData || [],
                    vehicles: vehiclesData || []
                });
            } catch (err) {
                console.error("Erro na busca instantânea:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, user?.companyId]);

    // Handle clicking outside of search results
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-container')) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return {
        showSearchResults,
        setShowSearchResults,
        isSearching,
        searchResults,
        setSearchResults
    };
}
