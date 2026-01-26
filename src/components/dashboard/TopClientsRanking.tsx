import { clients } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export function TopClientsRanking() {
  const topClients = [...clients]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Top 5 Clientes
      </h3>
      
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
    </div>
  );
}
