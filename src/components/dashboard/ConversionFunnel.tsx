import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ConversionFunnel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, closed: 0, open: 0 });

  useEffect(() => {
    const fetchStats = async () => {
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

        const { data: salesData } = await supabase
          .from('sales')
          .select('is_open')
          .eq('company_id', profile.company_id);

        const sales = salesData || [];
        const closed = sales.filter(s => !s.is_open).length;
        const open = sales.filter(s => s.is_open).length;

        setStats({ total: sales.length, closed, open });
      } catch (error) {
        console.error('Error fetching funnel stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  const conversionRate = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;

  const data = [
    { name: 'Fechadas', value: stats.closed, color: 'hsl(var(--success))' },
    { name: 'Abertas', value: stats.open, color: 'hsl(var(--warning))' },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Funil de Vendas
      </h3>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm">
              <span className="font-medium text-success">{stats.closed}</span>
              <span className="text-muted-foreground"> fechadas</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm">
              <span className="font-medium text-warning">{stats.open}</span>
              <span className="text-muted-foreground"> abertas</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Taxa de fechamento</span>
          <span className="text-lg font-bold text-success">{conversionRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
