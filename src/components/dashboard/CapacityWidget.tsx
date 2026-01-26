import { dashboardStats } from '@/lib/mockData';
import { Car } from 'lucide-react';

export function CapacityWidget() {
  const { occupiedSlots, totalSlots } = dashboardStats;
  const percentage = (occupiedSlots / totalSlots) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Gestão de Capacidade
        </h3>
        <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center">
          <Car className="w-4 h-4 text-info" />
        </div>
      </div>

      {/* Capacity Display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{occupiedSlots}</span>
          <span className="text-lg text-muted-foreground">/ {totalSlots}</span>
          <span className="text-sm text-muted-foreground">vagas</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-info to-success rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-xs text-muted-foreground mb-1">Em processo</p>
          <p className="text-lg font-semibold text-warning">{occupiedSlots}</p>
        </div>
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-xs text-muted-foreground mb-1">Disponíveis</p>
          <p className="text-lg font-semibold text-success">{totalSlots - occupiedSlots}</p>
        </div>
      </div>
    </div>
  );
}
