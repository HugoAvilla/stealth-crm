import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Activity,
  StopCircle,
  XCircle,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ProductCategory } from "@/lib/database.types";
import { MaterialDetailsModal } from "./MaterialDetailsModal";
import { HistoryAnalyticsSection } from "./HistoryAnalyticsSection";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types ---

interface HistoryMaterial {
  id: number;
  name: string;
  brand: string | null;
  type: string | null;
  unit: string;
  current_stock: number | null;
  is_active: boolean | null;
  is_open_roll: boolean | null;
  open_roll_accumulated: number | null;
  product_type_id: number | null;
  company_id: number | null;
  minimum_stock: number | null;
  average_cost: number | null;
  product_types: {
    category: ProductCategory;
    light_transmission: string | null;
    ppf_material_type: string | null;
  } | null;
}

type OperationalStatus =
  | "open_in_use"
  | "open_closed"
  | "closed_in_stock"
  | "inactive";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: typeof Activity;
}

const STATUS_MAP: Record<OperationalStatus, StatusConfig> = {
  open_in_use: {
    label: "Aberta em Uso",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Activity,
  },
  open_closed: {
    label: "Aberta Encerrada",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    icon: StopCircle,
  },
  closed_in_stock: {
    label: "Fechada em Estoque",
    color: "text-green-500",
    bg: "bg-green-500/10",
    icon: Package,
  },
  inactive: {
    label: "Inativo",
    color: "text-gray-500",
    bg: "bg-gray-500/10",
    icon: XCircle,
  },
};

// --- Helpers ---

function getOperationalStatus(material: HistoryMaterial): OperationalStatus {
  if (material.is_open_roll && material.is_active) return "open_in_use";
  if (material.is_open_roll && !material.is_active) return "open_closed";
  if (!material.is_open_roll && material.is_active) return "closed_in_stock";
  return "inactive";
}

function getCategoryFromMaterial(
  material: HistoryMaterial
): ProductCategory | null {
  if (material.product_types?.category) return material.product_types.category;
  // Fallback to materials.type (HIST-12)
  if (material.type) {
    const upper = material.type.toUpperCase();
    if (upper === "INSULFILM") return "INSULFILM";
    if (upper === "PPF") return "PPF";
  }
  return null;
}

// --- Props ---

interface MaterialHistoryTabProps {
  companyId: number | null;
}

export function MaterialHistoryTab({ companyId }: MaterialHistoryTabProps) {
  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("INSULFILM");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaterial, setSelectedMaterial] =
    useState<HistoryMaterial | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch all materials (no is_active filter) with product_types JOIN
  const { data: allMaterials, isLoading: materialsLoading } = useQuery({
    queryKey: ["history-materials", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("materials")
        .select(
          "*, product_types(category, light_transmission, ppf_material_type)"
        )
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      return data as HistoryMaterial[];
    },
    enabled: !!companyId,
  });

  // Fetch last entry dates
  const { data: lastEntries } = useQuery({
    queryKey: ["history-last-entries", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("stock_movements")
        .select("material_id, created_at")
        .eq("movement_type", "Entrada")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Build last entry map
  const lastEntryMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!lastEntries) return map;
    for (const entry of lastEntries) {
      if (entry.material_id && !map.has(entry.material_id)) {
        map.set(entry.material_id, entry.created_at);
      }
    }
    return map;
  }, [lastEntries]);

  // Filter materials by category and search
  const filteredMaterials = useMemo(() => {
    if (!allMaterials) return [];
    return allMaterials.filter((m) => {
      const cat = getCategoryFromMaterial(m);
      if (cat !== activeCategory) return false;

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const nameMatch = m.name.toLowerCase().includes(lower);
        const brandMatch = (m.brand || "").toLowerCase().includes(lower);
        if (!nameMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [allMaterials, activeCategory, searchTerm]);

  // Split into open and closed rolls
  const openRolls = useMemo(
    () => filteredMaterials.filter((m) => m.is_open_roll),
    [filteredMaterials]
  );
  const closedRolls = useMemo(
    () => filteredMaterials.filter((m) => !m.is_open_roll),
    [filteredMaterials]
  );

  // Status counts for summary cards
  const statusCounts = useMemo(() => {
    const counts: Record<OperationalStatus, number> = {
      open_in_use: 0,
      open_closed: 0,
      closed_in_stock: 0,
      inactive: 0,
    };
    for (const m of filteredMaterials) {
      counts[getOperationalStatus(m)]++;
    }
    return counts;
  }, [filteredMaterials]);

  const handleDetails = (material: HistoryMaterial) => {
    setSelectedMaterial(material);
    setShowDetails(true);
  };

  // --- Render ---

  if (materialsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderSummaryCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {(Object.entries(STATUS_MAP) as [OperationalStatus, StatusConfig][]).map(
        ([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {config.label}
                    </p>
                    <p className={cn("text-2xl font-bold", config.color)}>
                      {statusCounts[key]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
      )}
    </div>
  );

  const renderMaterialRow = (material: HistoryMaterial) => {
    const status = getOperationalStatus(material);
    const statusConfig = STATUS_MAP[status];
    const lastEntry = lastEntryMap.get(material.id);

    return (
      <TableRow key={material.id}>
        <TableCell className="font-medium">
          <div
            className="cursor-pointer hover:text-primary hover:underline transition-colors"
            onClick={() => handleDetails(material)}
            title="Ver detalhes e histórico"
          >
            <p>{material.name}</p>
            {material.brand && (
              <p className="text-xs text-muted-foreground">{material.brand}</p>
            )}
          </div>
        </TableCell>
        {activeCategory === "INSULFILM" && (
          <TableCell>
            {material.product_types?.light_transmission || "-"}
          </TableCell>
        )}
        {activeCategory === "PPF" && (
          <TableCell>
            {material.product_types?.ppf_material_type ? (
              <Badge variant="outline">
                {material.product_types.ppf_material_type}
              </Badge>
            ) : (
              "-"
            )}
          </TableCell>
        )}
        <TableCell className="text-center">
          <Badge className={cn(statusConfig.bg, statusConfig.color, "border-0")}>
            {statusConfig.label}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {material.is_open_roll
            ? `${material.open_roll_accumulated || 0} ${material.unit}`
            : `${material.current_stock || 0} ${material.unit}`}
        </TableCell>
        <TableCell className="text-center text-sm">
          {lastEntry
            ? format(new Date(lastEntry), "dd/MM/yyyy", { locale: ptBR })
            : (
              <span className="text-muted-foreground">
                Sem entrada registrada
              </span>
            )}
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (
    items: HistoryMaterial[],
    emptyMessage: string
  ) => {
    if (items.length === 0) {
      return (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                {activeCategory === "INSULFILM" && (
                  <TableHead>Transmissão</TableHead>
                )}
                {activeCategory === "PPF" && (
                  <TableHead>Tipo Material</TableHead>
                )}
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="text-center">
                  Saldo / Consumo
                </TableHead>
                <TableHead className="text-center">Última Entrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{items.map(renderMaterialRow)}</TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const hasNoMaterials = filteredMaterials.length === 0 && !searchTerm;
  const hasNoResults = filteredMaterials.length === 0 && searchTerm;

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex items-center justify-between">
        <Tabs
          value={activeCategory}
          onValueChange={(v) => setActiveCategory(v as ProductCategory)}
        >
          <TabsList>
            <TabsTrigger value="INSULFILM">INSULFILM</TabsTrigger>
            <TabsTrigger value="PPF">PPF</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Empty states */}
      {hasNoMaterials && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum material de {activeCategory} registrado
            </h3>
            <p className="text-muted-foreground">
              Materiais de {activeCategory} aparecerão aqui quando forem
              cadastrados
            </p>
          </CardContent>
        </Card>
      )}

      {hasNoResults && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted-foreground">
              Nenhum material de {activeCategory} corresponde a "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Material Sections */}
      {filteredMaterials.length > 0 && (
        <div className="space-y-8">
          {/* Open Rolls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Bobinas Abertas
            </h3>
            {renderTable(
              openRolls,
              "Bobinas abertas aparecerão aqui quando materiais forem cadastrados como bobina aberta"
            )}
          </div>

          {/* Closed Rolls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Bobinas Fechadas
            </h3>
            {renderTable(
              closedRolls,
              "Bobinas fechadas aparecerão aqui quando materiais forem cadastrados"
            )}
          </div>
        </div>
      )}

      {/* Material Details Modal */}
      <MaterialDetailsModal
        open={showDetails}
        onOpenChange={setShowDetails}
        material={selectedMaterial}
      />

      {/* Analytics Section */}
      <HistoryAnalyticsSection
        companyId={companyId}
        activeCategory={activeCategory}
      />
    </div>
  );
}
