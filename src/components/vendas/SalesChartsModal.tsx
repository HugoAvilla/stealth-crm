import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Sale, getServiceById } from "@/lib/mockData";
import { useState } from "react";

interface SalesChartsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: Sale[];
}

const SalesChartsModal = ({ open, onOpenChange, sales }: SalesChartsModalProps) => {
  const [sortByRevenue, setSortByRevenue] = useState(false);

  // Calculate top services
  const serviceStats: Record<number, { name: string; count: number; revenue: number }> = {};

  sales.forEach((sale) => {
    sale.services.forEach((serviceId) => {
      const service = getServiceById(serviceId);
      if (service) {
        if (!serviceStats[serviceId]) {
          serviceStats[serviceId] = { name: service.name, count: 0, revenue: 0 };
        }
        serviceStats[serviceId].count += 1;
        serviceStats[serviceId].revenue += service.price;
      }
    });
  });

  const topServices = Object.values(serviceStats)
    .sort((a, b) => (sortByRevenue ? b.revenue - a.revenue : b.count - a.count))
    .slice(0, 5);

  // Calculate payment method stats
  const paymentStats: Record<string, number> = {};
  sales.forEach((sale) => {
    paymentStats[sale.payment_method] = (paymentStats[sale.payment_method] || 0) + sale.total;
  });

  const paymentData = Object.entries(paymentStats)
    .map(([method, value]) => ({ method, value }))
    .sort((a, b) => b.value - a.value);

  const totalSold = sales.reduce((sum, s) => sum + s.total, 0);

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <BarChart3 className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Gráficos das vendas</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Top Services */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">
                  5 serviços mais {sortByRevenue ? "RENTÁVEIS" : "VENDIDOS"} no período
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sortToggle" className="text-sm text-muted-foreground">
                  Mais rentáveis
                </Label>
                <Switch
                  id="sortToggle"
                  checked={sortByRevenue}
                  onCheckedChange={setSortByRevenue}
                />
              </div>
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) =>
                      sortByRevenue
                        ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : `${value}x vendido`
                    }
                  />
                  <Bar
                    dataKey={sortByRevenue ? "revenue" : "count"}
                    radius={[0, 4, 4, 0]}
                  >
                    {topServices.map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Payment Methods */}
          <Card className="p-4">
            <div className="mb-4">
              <h3 className="font-medium">Formas de pagamento mais usadas no período</h3>
              <p className="text-sm text-muted-foreground">
                R$ {totalSold.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vendido no período
              </p>
            </div>

            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="method"
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) =>
                      `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesChartsModal;
