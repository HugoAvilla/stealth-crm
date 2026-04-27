import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, DollarSign, TrendingUp } from "lucide-react";

type CommissionPersonType = 'VENDEDOR' | 'INSTALADOR_INSULFILM' | 'INSTALADOR_PPF';

interface CommissionPersonWithMetrics {
  id: number;
  company_id: number;
  name: string;
  type: CommissionPersonType;
  commission_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_sales: number;
  total_commission: number;
}

interface CommissionPersonCardProps {
  person: CommissionPersonWithMetrics;
  onClick: () => void;
  onEdit: () => void;
}

const TYPE_LABELS: Record<CommissionPersonType, string> = {
  'VENDEDOR': 'Vendedor',
  'INSTALADOR_INSULFILM': 'Inst. Insulfilm',
  'INSTALADOR_PPF': 'Inst. PPF',
};

const TYPE_COLORS: Record<CommissionPersonType, string> = {
  'VENDEDOR': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  'INSTALADOR_INSULFILM': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  'INSTALADOR_PPF': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

const CommissionPersonCard = ({ person, onClick, onEdit }: CommissionPersonCardProps) => {
  return (
    <Card
      className="bg-card/50 border-border/50 cursor-pointer hover:border-primary/40 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">{person.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={TYPE_COLORS[person.type]}>
                {TYPE_LABELS[person.type]}
              </Badge>
              {!person.is_active && (
                <Badge variant="outline" className="text-muted-foreground">
                  Inativo
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Comissão</p>
            <p className="text-sm font-bold text-primary">{person.commission_percentage}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="text-sm font-bold flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {person.total_sales}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-green-500 flex items-center justify-center gap-0.5">
              <DollarSign className="h-3 w-3" />
              {person.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionPersonCard;
export type { CommissionPersonWithMetrics, CommissionPersonType };
