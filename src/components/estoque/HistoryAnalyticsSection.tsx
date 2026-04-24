import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ProductCategory } from "@/lib/database.types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

interface HistoryAnalyticsSectionProps {
  companyId: number | null;
  activeCategory: ProductCategory;
}

const PPF_TYPE_COLORS: Record<string, string> = {
  TPU: "#3b82f6",
  TPH: "#f59e0b",
  PVC: "#10b981",
};

export function HistoryAnalyticsSection({
  companyId,
  activeCategory,
}: HistoryAnalyticsSectionProps) {
  // Fetch top 10 most consumed materials
  const { data: consumptionData, isLoading } = useQuery({
    queryKey: ["history-analytics-consumption", companyId, activeCategory],
    queryFn: async () => {
      if (!companyId) return [];

      // Get all relevant stock movements with material and product_type info
      const { data, error } = await supabase
        .from("stock_movements")
        .select(
          "quantity, material_id, is_open_roll_closure, materials(name, product_type_id, company_id, product_types(category))"
        )
        .in("movement_type", ["Saida", "open_roll_use"])
        .eq("is_open_roll_closure", false);

      if (error) throw error;
      if (!data) return [];

      // Group by material and sum consumption, filtering by category and company
      const materialMap = new Map<
        number,
        { name: string; total: number }
      >();

      for (const mov of data) {
        const mat = mov.materials as unknown as {
          name: string;
          product_type_id: number | null;
          company_id: number | null;
          product_types: { category: string } | null;
        };

        if (!mat || mat.company_id !== companyId) continue;
        if (mat.product_types?.category !== activeCategory) continue;
        if (!mov.material_id) continue;

        const existing = materialMap.get(mov.material_id);
        if (existing) {
          existing.total += mov.quantity;
        } else {
          materialMap.set(mov.material_id, {
            name: mat.name,
            total: mov.quantity,
          });
        }
      }

      // Sort and take top 10
      return Array.from(materialMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
    enabled: !!companyId,
  });

  // Fetch PPF type distribution
  const { data: ppfDistribution } = useQuery({
    queryKey: ["history-analytics-ppf-distribution", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("product_types")
        .select("ppf_material_type")
        .eq("company_id", companyId)
        .eq("category", "PPF")
        .not("ppf_material_type", "is", null);

      if (error) throw error;

      // Count by type
      const counts: Record<string, number> = {};
      for (const pt of data || []) {
        const type = pt.ppf_material_type as string;
        counts[type] = (counts[type] || 0) + 1;
      }

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    enabled: !!companyId && activeCategory === "PPF",
  });

  const hasConsumptionData = consumptionData && consumptionData.length > 0;
  const hasPpfDistribution =
    activeCategory === "PPF" && ppfDistribution && ppfDistribution.length > 0;

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasConsumptionData && !hasPpfDistribution) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Análises do Histórico</h3>
          <p className="text-muted-foreground">
            Dados insuficientes para gerar análise
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 10 most consumed materials */}
      {hasConsumptionData && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top 10 — Materiais Mais Usados ({activeCategory})
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

      {/* PPF Distribution by Type */}
      {hasPpfDistribution && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Distribuição PPF por Tipo de Material
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
                    {ppfDistribution!.map((entry) => (
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
