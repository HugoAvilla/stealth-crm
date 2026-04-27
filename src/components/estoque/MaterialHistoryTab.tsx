import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Package,
  Search,
  StopCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCategory } from "@/lib/database.types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  getCategoryFromMaterial,
  getHistoryRangeStart,
  getOperationalStatus,
  HISTORY_RANGE_LABELS,
  HistoryRange,
  materialMatchesHistoryRange,
  OperationalStatus,
} from "@/lib/stockHistory";
import { HistoryAnalyticsSection } from "./HistoryAnalyticsSection";
import { MaterialDetailsModal } from "./MaterialDetailsModal";

interface HistoryMaterial {
  id: number;
  name: string;
  brand: string | null;
  type: string | null;
  created_at: string;
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

interface MaterialHistoryTabProps {
  companyId: number | null;
}

export function MaterialHistoryTab({ companyId }: MaterialHistoryTabProps) {
  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("INSULFILM");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("1y");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaterial, setSelectedMaterial] =
    useState<HistoryMaterial | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const rangeStart = useMemo(
    () => getHistoryRangeStart(historyRange),
    [historyRange]
  );

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

  const { data: historyMovements } = useQuery({
    queryKey: ["history-movements", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("stock_movements")
        .select("material_id, movement_type, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { lastMovementMap, lastEntryMap } = useMemo(() => {
    const movementMap = new Map<number, string>();
    const entryMap = new Map<number, string>();

    (historyMovements || []).forEach((movement) => {
      if (!movement.material_id) return;
      if (new Date(movement.created_at) < rangeStart) return;

      if (!movementMap.has(movement.material_id)) {
        movementMap.set(movement.material_id, movement.created_at);
      }

      if (
        movement.movement_type === "Entrada" &&
        !entryMap.has(movement.material_id)
      ) {
        entryMap.set(movement.material_id, movement.created_at);
      }
    });

    return {
      lastMovementMap: movementMap,
      lastEntryMap: entryMap,
    };
  }, [historyMovements, rangeStart]);

  const filteredMaterials = useMemo(() => {
    if (!allMaterials) return [];

    return allMaterials.filter((material) => {
      const category = getCategoryFromMaterial(material);
      if (category !== activeCategory) return false;

      if (
        !materialMatchesHistoryRange(
          material,
          lastMovementMap.get(material.id),
          rangeStart
        )
      ) {
        return false;
      }

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = material.name.toLowerCase().includes(search);
        const brandMatch = (material.brand || "")
          .toLowerCase()
          .includes(search);

        if (!nameMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [activeCategory, allMaterials, lastMovementMap, rangeStart, searchTerm]);

  const openRolls = useMemo(
    () => filteredMaterials.filter((material) => material.is_open_roll),
    [filteredMaterials]
  );
  const closedRolls = useMemo(
    () => filteredMaterials.filter((material) => !material.is_open_roll),
    [filteredMaterials]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<OperationalStatus, number> = {
      open_in_use: 0,
      open_closed: 0,
      closed_in_stock: 0,
      inactive: 0,
    };

    filteredMaterials.forEach((material) => {
      counts[getOperationalStatus(material)] += 1;
    });

    return counts;
  }, [filteredMaterials]);

  const handleDetails = (material: HistoryMaterial) => {
    setSelectedMaterial(material);
    setShowDetails(true);
  };

  if (materialsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderSummaryCards = () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {(Object.entries(STATUS_MAP) as [OperationalStatus, StatusConfig][]).map(
        ([key, config]) => {
          const Icon = config.icon;

          return (
            <Card key={key} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", config.bg)}>
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
            className="cursor-pointer transition-colors hover:text-primary hover:underline"
            onClick={() => handleDetails(material)}
            title="Ver detalhes e historico"
          >
            <p>{material.name}</p>
            {material.brand && (
              <p className="text-xs text-muted-foreground">{material.brand}</p>
            )}
          </div>
        </TableCell>
        {activeCategory === "INSULFILM" && (
          <TableCell>{material.product_types?.light_transmission || "-"}</TableCell>
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
          {lastEntry ? (
            format(new Date(lastEntry), "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span className="text-muted-foreground">Sem entrada no periodo</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (items: HistoryMaterial[], emptyMessage: string) => {
    if (!items.length) {
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
                  <TableHead>Transmissao</TableHead>
                )}
                {activeCategory === "PPF" && (
                  <TableHead>Tipo Material</TableHead>
                )}
                <TableHead className="text-center">Situacao</TableHead>
                <TableHead className="text-center">Saldo / Consumo</TableHead>
                <TableHead className="text-center">Ultima Entrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{items.map(renderMaterialRow)}</TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const hasNoMaterials = filteredMaterials.length === 0 && !searchTerm;
  const hasNoResults = filteredMaterials.length === 0 && !!searchTerm;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as ProductCategory)}
        >
          <TabsList>
            <TabsTrigger value="INSULFILM">INSULFILM</TabsTrigger>
            <TabsTrigger value="PPF">PPF</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou marca..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="w-full md:w-[180px]">
          <Select
            value={historyRange}
            onValueChange={(value) => setHistoryRange(value as HistoryRange)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HISTORY_RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderSummaryCards()}

      {hasNoMaterials && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              Nenhum material de {activeCategory} registrado
            </h3>
            <p className="text-muted-foreground">
              Nenhum material de {activeCategory} teve atividade nos ultimos{" "}
              {HISTORY_RANGE_LABELS[historyRange].toLowerCase()}.
            </p>
          </CardContent>
        </Card>
      )}

      {hasNoResults && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted-foreground">
              Nenhum material de {activeCategory} corresponde a "{searchTerm}"
              {" "}no periodo selecionado.
            </p>
          </CardContent>
        </Card>
      )}

      {filteredMaterials.length > 0 && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium">
              <Package className="h-5 w-5 text-blue-500" />
              Bobinas Abertas
            </h3>
            {renderTable(
              openRolls,
              "Bobinas abertas aparecerao aqui quando houver movimentacao no periodo selecionado."
            )}
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium">
              <Package className="h-5 w-5 text-primary" />
              Bobinas Fechadas
            </h3>
            {renderTable(
              closedRolls,
              "Bobinas fechadas aparecerao aqui quando houver movimentacao ou cadastro no periodo selecionado."
            )}
          </div>
        </div>
      )}

      <MaterialDetailsModal
        open={showDetails}
        onOpenChange={setShowDetails}
        material={selectedMaterial}
      />

      <HistoryAnalyticsSection
        companyId={companyId}
        activeCategory={activeCategory}
        filteredMaterials={filteredMaterials}
        rangeStart={rangeStart}
      />
    </div>
  );
}
