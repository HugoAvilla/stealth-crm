import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ClientRanking {
  id: number;
  name: string;
  total_spent: number;
  sales_count: number;
}

export function TopClientsRanking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topClients, setTopClients] = useState<ClientRanking[]>([]);

  useEffect(() => {
    const fetchTopClients = async () => {
      if (!user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) {
          setLoading(false);
          return;
        }

        // Fetch sales grouped by client
        const { data: salesData } = await supabase
          .from('sales')
          .select(`
            total,
            client:clients(id, name)
          `)
          .eq('company_id', profile.company_id);

        // Aggregate by client
        const clientMap = new Map<number, ClientRanking>();
        (salesData || []).forEach(sale => {
          if (sale.client) {
            const existing = clientMap.get(sale.client.id);
            if (existing) {
              existing.total_spent += sale.total;
              existing.sales_count += 1;
            } else {
              clientMap.set(sale.client.id, {
                id: sale.client.id,
                name: sale.client.name,
                total_spent: sale.total,
                sales_count: 1,
              });
            }
          }
        });

        // Sort and take top 5
        const sorted = Array.from(clientMap.values())
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 5);

        setTopClients(sorted);
      } catch (error) {
        console.error('Error fetching top clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopClients();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Top 5 Clientes
      </h3>
      
      {topClients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum cliente com vendas ainda
        </div>
      ) : (
        <div className="space-y-3">
          {topClients.map((client, index) => (
            <div
              key={client.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {/* Ranking Badge */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                index === 0 && "bg-primary text-primary-foreground",
                index === 1 && "bg-muted-foreground/30 text-foreground",
                index === 2 && "bg-warning/30 text-warning",
                index > 2 && "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {client.sales_count} {client.sales_count === 1 ? 'serviço' : 'serviços'}
                </p>
              </div>

              {/* Value */}
              <div className="text-right">
                <p className="text-sm font-semibold text-success">
                  R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
