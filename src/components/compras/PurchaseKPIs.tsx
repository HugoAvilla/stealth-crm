import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Calendar, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseKPIsProps {
  metrics: {
    totalMonthDue: number;
    monthBillsCount: number;
    totalOpenPurchases: number;
    totalOverduePurchases: number;
  };
  monthlyAverage: number;
  loading?: boolean;
  onBillsClick?: () => void;
}

export function PurchaseKPIs({ metrics, monthlyAverage, loading, onBillsClick }: PurchaseKPIsProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total a Pagar no Mês */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-4 top-4 opacity-10 text-primary">
          <Calendar size={60} />
        </div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full min-h-[110px]">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Compromissos do Mês
            </p>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {formatCurrency(metrics.totalMonthDue || 0)}
            </p>
          </div>
          <div className="mt-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={onBillsClick}>
            <span className="inline-flex items-center bg-background/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-foreground border border-border/50">
              {metrics.monthBillsCount || 0} {metrics.monthBillsCount === 1 ? "título pendente" : "títulos pendentes"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compras em Aberto */}
      <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-4 top-4 opacity-10 text-blue-500">
          <DollarSign size={60} />
        </div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full min-h-[110px]">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Compras em Aberto
            </p>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {metrics.totalOpenPurchases}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" /> Contratos com saldo pendente
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compras em Atraso */}
      <Card className={cn(
        "bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between",
        metrics.totalOverduePurchases > 0 && "border-red-500/30 bg-red-500/5"
      )}>
        <div className="absolute right-4 top-4 opacity-10 text-red-500">
          <AlertTriangle size={60} />
        </div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full min-h-[110px]">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Títulos em Atraso
            </p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              metrics.totalOverduePurchases > 0 ? "text-red-500 animate-pulse" : "text-foreground"
            )}>
              {metrics.totalOverduePurchases}
            </p>
          </div>
          <div className="mt-3">
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
              metrics.totalOverduePurchases > 0 
                ? "bg-red-500/10 border-red-500/20 text-red-500"
                : "bg-background/50 border-border/50 text-muted-foreground"
            )}>
              {metrics.totalOverduePurchases > 0 ? "Atenção necessária" : "Nenhum atraso"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Média Mensal de Gastos */}
      <Card className="bg-card/50 border-border/50 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-4 top-4 opacity-10 text-green-500">
          <TrendingUp size={60} />
        </div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full min-h-[110px]">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Média Mensal de Gastos
            </p>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {formatCurrency(monthlyAverage)}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Histórico consolidado
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
