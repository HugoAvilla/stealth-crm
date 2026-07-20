import { Car, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant: 'primary' | 'accent';
}

const actionStyles = {
  primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  accent: 'bg-accent hover:bg-accent/90 text-accent-foreground',
};

interface QuickActionsProps {
  onNewSlot: () => void;
  onNewClient: () => void;
}

export function QuickActions({
  onNewSlot,
  onNewClient,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    { label: 'Preencher Vaga', icon: Car, onClick: onNewSlot, variant: 'primary' },
    { label: 'Novo Cliente', icon: UserPlus, onClick: onNewClient, variant: 'accent' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
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
