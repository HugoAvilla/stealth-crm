import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";

interface Material {
  id: number;
  name: string;
  type: string | null;
  unit: string;
}

interface ConsumptionRule {
  id?: number;
  material_type: string;
  size_p: number | null;
  size_m: number | null;
  size_g: number | null;
  company_id: number | null;
}

interface ConsumptionRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumptionRulesModal({ open, onOpenChange }: ConsumptionRulesModalProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rules, setRules] = useState<Record<string, ConsumptionRule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      // Fetch materials
      const { data: materialsData } = await supabase
        .from("materials")
        .select("id, name, type, unit")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name");

      // Fetch existing rules
      const { data: rulesData } = await supabase
        .from("consumption_rules")
        .select("*")
        .eq("company_id", profile.company_id);

      setMaterials(materialsData || []);

      // Create rules map indexed by material_type
      const rulesMap: Record<string, ConsumptionRule> = {};
      (rulesData || []).forEach((rule) => {
        rulesMap[rule.material_type] = rule;
      });

      setRules(rulesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = (
    materialType: string,
    size: "p" | "m" | "g",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;

    setRules((prev) => {
      const existingRule = prev[materialType] || {
        material_type: materialType,
        size_p: 0,
        size_m: 0,
        size_g: 0,
        company_id: companyId,
      };

      return {
        ...prev,
        [materialType]: {
          ...existingRule,
          [`size_${size}`]: numValue,
        } as ConsumptionRule,
      };
    });
  };

  const saveRules = async () => {
    if (!companyId) return;

    setSaving(true);

    try {
      // Save each rule with upsert
      for (const [materialType, rule] of Object.entries(rules)) {
        // Check if rule already exists
        const { data: existingRule } = await supabase
          .from("consumption_rules")
          .select("id")
          .eq("company_id", companyId)
          .eq("material_type", materialType)
          .single();

        if (existingRule) {
          // Update existing
          await supabase
            .from("consumption_rules")
            .update({
              size_p: rule.size_p || 0,
              size_m: rule.size_m || 0,
              size_g: rule.size_g || 0,
            })
            .eq("id", existingRule.id);
        } else {
          // Insert new
          await supabase.from("consumption_rules").insert({
            material_type: materialType,
            size_p: rule.size_p || 0,
            size_m: rule.size_m || 0,
            size_g: rule.size_g || 0,
            company_id: companyId,
          });
        }
      }

      toast.success("Regras de consumo salvas com sucesso!");
    } catch (error) {
      console.error("Error saving rules:", error);
      toast.error("Erro ao salvar regras de consumo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras de Consumo (P/M/G)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Define a quantidade de material consumido automaticamente por tamanho do veículo 
            (P = Pequeno, M = Médio, G = Grande).
          </p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum material cadastrado</p>
              <p className="text-sm">Cadastre materiais no Estoque para configurar regras de consumo</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-center w-24">P</TableHead>
                    <TableHead className="text-center w-24">M</TableHead>
                    <TableHead className="text-center w-24">G</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => {
                    const materialType = material.type || material.name;
                    const rule: ConsumptionRule = rules[materialType] || {
                      material_type: materialType,
                      size_p: 0,
                      size_m: 0,
                      size_g: 0,
                      company_id: companyId,
                    };

                    return (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.type || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{material.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rule.size_p || 0}
                            onChange={(e) => handleRuleChange(materialType, "p", e.target.value)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rule.size_m || 0}
                            onChange={(e) => handleRuleChange(materialType, "m", e.target.value)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rule.size_g || 0}
                            onChange={(e) => handleRuleChange(materialType, "g", e.target.value)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button onClick={saveRules} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Regras"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
