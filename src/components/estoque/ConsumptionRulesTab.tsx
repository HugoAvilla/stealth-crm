import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, Loader2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductCategory, VehicleRegion, RegionConsumptionRule, VehicleSize } from "@/lib/database.types";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsumptionRulesTabProps {
  companyId: number | null;
}

interface ConsumptionInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

function ConsumptionInput({ value, onChange, disabled }: ConsumptionInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className="w-24 text-center"
        placeholder="0.0"
      />
      <span className="text-sm text-muted-foreground">metros</span>
    </div>
  );
}

export function ConsumptionRulesTab({ companyId }: ConsumptionRulesTabProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("INSULFILM");
  const [formValues, setFormValues] = useState<Record<number, Record<VehicleSize, number>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Query para carregar regiões
  const { data: regions, isLoading: isLoadingRegions } = useQuery({
    queryKey: ["vehicle-regions-for-rules", activeCategory, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("vehicle_regions")
        .select("id, name, description")
        .eq("company_id", companyId)
        .eq("category", activeCategory)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as Pick<VehicleRegion, "id" | "name" | "description">[];
    },
    enabled: !!companyId,
  });

  // Query para carregar regras existentes
  const { data: existingRules, refetch: refetchRules, isLoading: isLoadingRules } = useQuery({
    queryKey: ["consumption-rules", activeCategory, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("region_consumption_rules")
        .select("*")
        .eq("company_id", companyId)
        .eq("category", activeCategory);

      if (error) throw error;
      return data as RegionConsumptionRule[];
    },
    enabled: !!companyId,
  });

  // Criar mapa de regras existentes
  const rulesMap = useMemo(() => {
    const map: Record<number, Record<VehicleSize, number>> = {};
    existingRules?.forEach((rule) => {
      if (!map[rule.region_id]) map[rule.region_id] = { P: 0, M: 0, G: 0 };
      map[rule.region_id][rule.vehicle_size] = rule.meters_consumed;
    });
    return map;
  }, [existingRules]);

  // Inicializar valores do formulário quando dados carregarem
  useEffect(() => {
    if (regions && rulesMap) {
      const initialValues: Record<number, Record<VehicleSize, number>> = {};
      regions.forEach((region) => {
        initialValues[region.id] = {
          P: rulesMap[region.id]?.P || 0,
          M: rulesMap[region.id]?.M || 0,
          G: rulesMap[region.id]?.G || 0,
        };
      });
      setFormValues(initialValues);
      setIsDirty(false);
    }
  }, [regions, rulesMap]);

  // Handler de mudança de input
  const handleInputChange = (regionId: number, size: VehicleSize, value: number) => {
    setFormValues((prev) => ({
      ...prev,
      [regionId]: {
        ...prev[regionId],
        [size]: Math.max(0, value),
      },
    }));
    setIsDirty(true);
  };

  // Handler de salvar todas as regras
  const handleSaveAllRules = async () => {
    setIsSaving(true);

    try {
      // Converter formValues em array de regras
      const rulesArray: Array<{
        region_id: number;
        vehicle_size: VehicleSize;
        meters_consumed: number;
        category: ProductCategory;
        company_id: number;
      }> = [];

      Object.entries(formValues).forEach(([regionId, sizes]) => {
        (["P", "M", "G"] as VehicleSize[]).forEach((size) => {
          rulesArray.push({
            region_id: parseInt(regionId),
            vehicle_size: size,
            meters_consumed: sizes[size] || 0,
            category: activeCategory,
            company_id: companyId!,
          });
        });
      });

      // UPSERT todas as regras
      const { error } = await supabase
        .from("region_consumption_rules")
        .upsert(rulesArray, {
          onConflict: "region_id,vehicle_size,company_id",
        });

      if (error) throw error;

      toast.success("Regras de consumo salvas com sucesso!");
      setIsDirty(false);
      refetchRules();
    } catch (error: any) {
      toast.error("Erro ao salvar regras: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingRegions || isLoadingRules;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com sub-tabs e botão salvar */}
      <div className="flex items-center justify-between">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ProductCategory)}>
          <TabsList>
            <TabsTrigger value="INSULFILM">INSULFILM</TabsTrigger>
            <TabsTrigger value="PPF">PPF</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={handleSaveAllRules} disabled={!isDirty || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Todas as Regras
            </>
          )}
        </Button>
      </div>

      {/* Tabela de regras */}
      {!regions || regions.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma região cadastrada para {activeCategory}
            </h3>
            <p className="text-muted-foreground">
              Cadastre regiões na aba "Regiões do Veículo" primeiro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Região</TableHead>
                  <TableHead className="text-center">P (Pequeno)</TableHead>
                  <TableHead className="text-center">M (Médio)</TableHead>
                  <TableHead className="text-center">G (Grande)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{region.name}</p>
                        {region.description && (
                          <p className="text-sm text-muted-foreground">{region.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ConsumptionInput
                        value={formValues[region.id]?.P || 0}
                        onChange={(val) => handleInputChange(region.id, "P", val)}
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <ConsumptionInput
                        value={formValues[region.id]?.M || 0}
                        onChange={(val) => handleInputChange(region.id, "M", val)}
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <ConsumptionInput
                        value={formValues[region.id]?.G || 0}
                        onChange={(val) => handleInputChange(region.id, "G", val)}
                        disabled={isSaving}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isDirty && (
        <p className="text-sm text-muted-foreground text-center">
          * Você tem alterações não salvas
        </p>
      )}
    </div>
  );
}
