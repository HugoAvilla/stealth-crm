import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCategory } from "@/lib/database.types";
import { supabase } from "@/integrations/supabase/client";

interface HistoryAnalyticsSectionProps {
  companyId: number | null;
  activeCategory: ProductCategory;
  filteredMaterials: {
    id: number;
    name: string;
    product_types: {
      ppf_material_type: string | null;
    } | null;
  }[];
  rangeStart: Date;
}

const PPF_TYPE_COLORS: Record<string, string> = {
  TPU: "#3b82f6",
  TPH: "#f59e0b",
  PVC: "#10b981",
};

export function HistoryAnalyticsSection({
  companyId,
  activeCategory,
  filteredMaterials,
  rangeStart,
}: HistoryAnalyticsSectionProps) {
  const eligibleMaterialIds = useMemo(
    () => filteredMaterials.map((material) => material.id),
    [filteredMaterials]
  );

  const materialNameMap = useMemo(() => {
    const map = new Map<number, string>();
    filteredMaterials.forEach((material) => {
      map.set(material.id, material.name);
    });
    return map;
  }, [filteredMaterials]);

  const { data: consumptionData, isLoading } = useQuery({
    queryKey: [
      "history-analytics-consumption",
      companyId,
      activeCategory,
      rangeStart.toISOString(),
      eligibleMaterialIds.join(","),
    ],
    queryFn: async () => {
      if (!companyId || !eligibleMaterialIds.length) return [];

      const { data, error } = await supabase
        .from("stock_movements")
        .select("quantity, material_id, created_at, is_open_roll_closure")
        .eq("company_id", companyId)
        .in("movement_type", ["Saida", "open_roll_use"])
        .eq("is_open_roll_closure", false)
        .in("material_id", eligibleMaterialIds)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;
      if (!data) return [];

      const materialMap = new Map<number, { name: string; total: number }>();

      data.forEach((movement) => {
        if (!movement.material_id) return;

        const existing = materialMap.get(movement.material_id);
        if (existing) {
          existing.total += movement.quantity;
          return;
        }

        materialMap.set(movement.material_id, {
          name:
            materialNameMap.get(movement.material_id) ||
            `Material ${movement.material_id}`,
          total: movement.quantity,
        });
      });

      return Array.from(materialMap.values())
        .sort((left, right) => right.total - left.total)
        .slice(0, 10);
    },
    enabled: !!companyId,
  });

  const ppfDistribution = useMemo(() => {
    if (activeCategory !== "PPF") return [];

    const counts: Record<string, number> = {};
    filteredMaterials.forEach((material) => {
      const type = material.product_types?.ppf_material_type;
      if (!type) return;
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeCategory, filteredMaterials]);

  const hasConsumptionData = !!consumptionData?.length;
  const hasPpfDistribution =
    activeCategory === "PPF" && ppfDistribution.length > 0;

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasConsumptionData && !hasPpfDistribution) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Analises do Historico</h3>
          <p className="text-muted-foreground">
            Dados insuficientes para gerar analise no periodo selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hasConsumptionData && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top 10 - Materiais Mais Usados ({activeCategory})
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consumptionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)}m`,
                      "Consumo",
                    ]}
                  />
                  <Bar
                    dataKey="total"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {hasPpfDistribution && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <BarChart3 className="h-5 w-5 text-primary" />
              Distribuicao PPF por Tipo de Material
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ppfDistribution}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, "Tipos cadastrados"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {ppfDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PPF_TYPE_COLORS[entry.name] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
