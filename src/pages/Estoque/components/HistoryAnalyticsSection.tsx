import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCategory } from "@/lib/database.types";
import { supabase } from "@/integrations/supabase/client";
import { getOperationalStatus } from "@/lib/stockHistory";

interface HistoryAnalyticsSectionProps {
  companyId: number | null;
  activeCategory: ProductCategory;
  filteredMaterials: {
    id: number;
    name: string;
    brand: string | null;
    unit: string;
    current_stock: number | null;
    is_active: boolean | null;
    is_open_roll: boolean | null;
    open_roll_accumulated: number | null;
    product_types: {
      ppf_material_type: string | null;
      light_transmission: string | null;
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
      const transmission = material.product_types?.light_transmission;
      const displayName = transmission ? `${material.name} (${transmission})` : material.name;
      map.set(material.id, displayName);
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

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      "Aberta em Uso": 0,
      "Aberta Encerrada": 0,
      "Fechada em Estoque": 0,
      "Inativo": 0,
    };

    filteredMaterials.forEach((material) => {
      const status = getOperationalStatus(material as unknown as any);
      if (status === "open_in_use") counts["Aberta em Uso"] += 1;
      else if (status === "open_closed") counts["Aberta Encerrada"] += 1;
      else if (status === "closed_in_stock") counts["Fechada em Estoque"] += 1;
      else if (status === "inactive") counts["Inativo"] += 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [filteredMaterials]);

  const brandStockData = useMemo(() => {
    const brandMap = new Map<string, number>();
    filteredMaterials.forEach((material) => {
      const stock = material.is_open_roll ? 0 : (material.current_stock || 0);
      if (stock <= 0) return;
      const brand = material.brand || "Sem Marca";
      brandMap.set(brand, (brandMap.get(brand) || 0) + stock);
    });

    return Array.from(brandMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredMaterials]);

  const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#6b7280"];
  const BRAND_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#ef4444", "#f59e0b"];

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

  const hasAnyData = hasConsumptionData || hasPpfDistribution || statusData.length > 0 || brandStockData.length > 0;

  if (!hasAnyData) {
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
      <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
        <PieIcon className="h-5 w-5 text-primary" /> Análises Visuais de Estoque ({activeCategory})
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Top 10 - Materiais Mais Usados */}
        {hasConsumptionData && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                Top 10 - Materiais Mais Usados
              </h4>
              <div className="h-72">
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
                      tick={{ fontSize: 11 }}
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

        {/* Gráfico 2: Distribuição por Situação (Pizza) */}
        {statusData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <PieIcon className="h-4 w-4 text-blue-500" />
                Situação das Bobinas / Materiais
              </h4>
              <div className="h-72 flex flex-col justify-between">
                <div className="h-[80%] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, "Materiais"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                  {statusData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}: <span className="font-semibold text-foreground">{entry.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Distribuição de Estoque por Marca (Pizza) */}
        {brandStockData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <PieIcon className="h-4 w-4 text-purple-500" />
                Volume de Estoque por Marca
              </h4>
              <div className="h-72 flex flex-col justify-between">
                <div className="h-[80%] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={brandStockData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {brandStockData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)} un/m`, "Estoque"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                  {brandStockData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_COLORS[index % BRAND_COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}: <span className="font-semibold text-foreground">{entry.value.toFixed(1)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráfico 4: Distribuição PPF */}
        {hasPpfDistribution && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                Distribuição PPF por Tipo de Material
              </h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ppfDistribution}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
    </div>
  );
}
