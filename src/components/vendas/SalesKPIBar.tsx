import { Card } from "@/components/ui/card";
import { SaleWithDetails } from "@/types/sales";
import { DollarSign, Clock, TrendingUp, Percent } from "lucide-react";

interface SalesKPIBarProps {
  sales: SaleWithDetails[];
}

const SalesKPIBar = ({ sales }: SalesKPIBarProps) => {
  // Use is_open field: false = closed, true = open
  const closedSales = sales.filter((s) => s.is_open === false);
  const openSales = sales.filter((s) => s.is_open === true);

  const totalClosed = closedSales.reduce((sum, s) => sum + s.total, 0);
  const totalOpen = openSales.reduce((sum, s) => sum + s.total, 0);
  const totalPending = openSales.reduce((sum, s) => sum + (s.total - (s.discount || 0)), 0);
  const averageTicket = sales.length > 0 ? (totalClosed + totalOpen) / sales.length : 0;

  // Simulated card fees (2.5% average)
  const cardFees = closedSales
    .filter((s) => s.payment_method === "Crédito" || s.payment_method === "Débito")
    .reduce((sum, s) => sum + s.total * 0.025, 0);

  const kpis = [
    {
      label: "Total de vendas",
      value: `R$ ${(totalClosed + totalOpen).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/20"
    },
    {
      label: "Fechadas",
      value: `${closedSales.length} | R$ ${totalClosed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/20"
    },
    {
      label: "Em aberto",
      value: `${openSales.length} | R$ ${totalOpen.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/20"
    },
    {
      label: "Valor pendente",
      value: `R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/20"
    },
    {
      label: "Ticket médio",
      value: `R$ ${averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/20"
    },
    {
      label: "Taxas maquininha",
      value: `R$ ${cardFees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Percent,
      color: "text-destructive",
      bgColor: "bg-destructive/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
            <span className="text-xs text-muted-foreground">{kpi.label}</span>
          </div>
          <p className={`text-sm font-semibold ${kpi.color}`}>{kpi.value}</p>
        </Card>
      ))}
    </div>
  );
};

export default SalesKPIBar;
