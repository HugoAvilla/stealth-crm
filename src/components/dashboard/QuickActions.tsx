import { Plus, Car, UserPlus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant: 'success' | 'info' | 'accent' | 'secondary';
}

const actionStyles = {
  success: 'bg-success hover:bg-success/90 text-success-foreground',
  info: 'bg-info hover:bg-info/90 text-info-foreground',
  accent: 'bg-accent hover:bg-accent/90 text-accent-foreground',
  secondary: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground border border-border',
};

interface QuickActionsProps {
  onNewSale: () => void;
  onNewSlot: () => void;
  onNewClient: () => void;
  onViewPipeline: () => void;
}

export function QuickActions({
  onNewSale,
  onNewSlot,
  onNewClient,
  onViewPipeline,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    { label: 'Nova Venda', icon: Plus, onClick: onNewSale, variant: 'success' },
    { label: 'Preencher Vaga', icon: Car, onClick: onNewSlot, variant: 'info' },
    { label: 'Novo Cliente', icon: UserPlus, onClick: onNewClient, variant: 'accent' },
    { label: 'Ver Pipeline', icon: Target, onClick: onViewPipeline, variant: 'secondary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            onClick={action.onClick}
            className={cn(
              "h-14 flex items-center justify-center gap-2 font-medium rounded-xl transition-all",
              actionStyles[action.variant]
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
