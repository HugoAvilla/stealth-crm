import { Card } from "@/components/ui/card";
import { SaleWithDetails } from "@/types/sales";
import { DollarSign, Clock, TrendingUp, Percent } from "lucide-react";

interface SalesKPIBarProps {
  sales: SaleWithDetails[];
  className?: string;
  /**
   * Valores líquidos reconhecidos no mês (regra única — ver lib/salesRecognition).
   * Opcionais: quando ausentes (ex.: drawer por dia), cai no total bruto de `sales`.
   */
  valorTodas?: number;
  valorFechadas?: number;
  valorEmAberto?: number;
  /** Contagens que acompanham os valores (mesmo conjunto de vendas que contribuem no mês). */
  qtdFechadas?: number;
  qtdEmAberto?: number;
}

const SalesKPIBar = ({
  sales,
  className,
  valorTodas,
  valorFechadas,
  valorEmAberto,
  qtdFechadas,
  qtdEmAberto,
}: SalesKPIBarProps) => {
  // Use is_open field: false = closed, true = open
  const closedSales = sales.filter((s) => s.is_open === false);
  const openSales = sales.filter((s) => s.is_open === true);

  const totalClosed = closedSales.reduce((sum, s) => sum + s.total, 0);
  const totalOpen = openSales.reduce((sum, s) => sum + s.total, 0);
  const averageTicket = sales.length > 0 ? (totalClosed + totalOpen) / sales.length : 0;

  // Fallback para o total bruto de `sales` quando os valores de reconhecimento não são passados.
  const vTodas = valorTodas ?? totalClosed + totalOpen;
  const vFechadas = valorFechadas ?? totalClosed;
  const vEmAberto = valorEmAberto ?? totalOpen;
  // Contagens acompanham o valor; sem os props (ex.: drawer por dia), usa a contagem bruta de `sales`.
  const nFechadas = qtdFechadas ?? closedSales.length;
  const nEmAberto = qtdEmAberto ?? openSales.length;

  // Simulated card fees (2.5% average)
  const cardFees = closedSales
    .filter((s) => s.payment_method === "Crédito" || s.payment_method === "Débito")
    .reduce((sum, s) => sum + s.total * 0.025, 0);

  const kpis = [
    {
      label: "Total de vendas em aberto/fechado",
      value: `R$ ${vTodas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/20"
    },
    {
      label: "Total de vendas fechadas",
      value: `${nFechadas} | R$ ${vFechadas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/20"
    },
    {
      label: "Total de vendas em aberto",
      value: `${nEmAberto} | R$ ${vEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/20"
    },
    {
      label: "Ticket médio",
      value: `R$ ${averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
    <div className={className || "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"}>
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
