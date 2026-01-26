import { dashboardStats } from '@/lib/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, Clock } from 'lucide-react';

export function ConversionFunnel() {
  const { conversionRate } = dashboardStats;
  const totalBudgets = 25; // Mock
  const approved = Math.round(totalBudgets * (conversionRate / 100));
  const pending = totalBudgets - approved;

  const data = [
    { name: 'Aprovados', value: approved, color: 'hsl(var(--success))' },
    { name: 'Pendentes', value: pending, color: 'hsl(var(--warning))' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Funil de Orçamentos
      </h3>

      <div className="flex items-center gap-6">
        {/* Chart */}
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

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Total no mês</p>
            <p className="text-2xl font-bold">{totalBudgets}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm">
              <span className="font-medium text-success">{approved}</span>
              <span className="text-muted-foreground"> aprovados</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm">
              <span className="font-medium text-warning">{pending}</span>
              <span className="text-muted-foreground"> pendentes</span>
            </span>
          </div>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Taxa de conversão</span>
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
