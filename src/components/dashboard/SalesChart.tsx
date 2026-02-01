import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';

const paymentMethodLabels: Record<string, string> = {
  Pix: 'Pix',
  Dinheiro: 'Dinheiro',
  Débito: 'Débito',
  Crédito: 'Crédito',
  Boleto: 'Boleto',
  Transferência: 'Transferência',
};

const paymentColors: Record<string, string> = {
  Pix: 'hsl(var(--success))',
  Dinheiro: 'hsl(var(--primary))',
  Débito: 'hsl(var(--info))',
  Crédito: 'hsl(var(--chart-4))',
  Boleto: 'hsl(var(--warning))',
  Transferência: 'hsl(var(--muted-foreground))',
};

export function SalesChart() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSalesData = async () => {
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

        const now = new Date();
        const monthStart = startOfMonth(now).toISOString().split('T')[0];
        const monthEnd = endOfMonth(now).toISOString().split('T')[0];

        const { data: salesData } = await supabase
          .from('sales')
          .select('total, payment_method')
          .eq('company_id', profile.company_id)
          .gte('sale_date', monthStart)
          .lte('sale_date', monthEnd);

        const breakdown: Record<string, number> = {};
        (salesData || []).forEach(sale => {
          const method = sale.payment_method || 'Pix';
          breakdown[method] = (breakdown[method] || 0) + sale.total;
        });

        setPaymentBreakdown(breakdown);
      } catch (error) {
        console.error('Error fetching sales chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [user?.id]);

  const data = Object.entries(paymentBreakdown)
    .map(([key, value]) => ({
      name: paymentMethodLabels[key] || key,
      value,
      color: paymentColors[key] || 'hsl(var(--primary))',
    }))
    .filter(item => item.value > 0);

  const total = Object.values(paymentBreakdown).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Resumo de Vendas por Método
        </h3>
        <span className="text-lg font-semibold text-success">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          Nenhuma venda no período
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis 
                  type="number" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Valor'
                  ]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
