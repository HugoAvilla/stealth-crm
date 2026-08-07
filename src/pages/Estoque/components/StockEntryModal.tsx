import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Material {
  id: number;
  name: string;
  unit: string;
  current_stock: number | null;
  company_id: number | null;
  average_cost?: number | null;
  product_types?: { cost_per_meter: number | null } | null;
}

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSuccess?: () => void;
}

export function StockEntryModal({ open, onOpenChange, material, onSuccess }: StockEntryModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Custo atual do material (preço da última entrada) para servir de referência
  const currentCost = material?.average_cost || material?.product_types?.cost_per_meter || 0;
  const costLabel = material?.unit === "Metros" ? "Custo / Metro (R$)" : "Custo Unitário (R$)";

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Informe a quantidade");
      return;
    }

    if (!user?.id || !material) {
      toast.error("Dados inválidos");
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Preço informado nesta entrada (opcional). Quando informado, vira o custo atual do material.
      const parsedCost = unitCost ? parseFloat(unitCost.toString().replace(",", ".")) : NaN;
      const unitCostVal = !isNaN(parsedCost) && parsedCost > 0 ? parsedCost : null;

      let error;
      if (material.unit === "Metros") {
        // Para materiais medidos em metros, registrar a entrada como uma nova bobina física
        const { error: rpcError } = await supabase.rpc("add_material_roll", {
          p_material_id: material.id,
          p_length: parseFloat(quantity),
          p_status: "fechada",
          p_notes: notes || "Entrada manual",
          p_user_id: user.id,
          p_company_id: profile.company_id,
          p_unit_cost: unitCostVal,
        });
        error = rpcError;
      } else {
        // Para outras unidades, inserir movimentação e o trigger inteligente atualizará o estoque
        const { error: insertError } = await supabase.from("stock_movements").insert({
          material_id: material.id,
          movement_type: "Entrada",
          quantity: parseFloat(quantity),
          reason: notes || "Entrada manual",
          user_id: user.id,
          company_id: profile.company_id,
          unit_cost: unitCostVal,
        });
        error = insertError;
        // O custo médio ponderado é recalculado pelo trigger update_stock_on_movement
        // a partir do unit_cost informado — não sobrescrever average_cost aqui.
      }

      if (error) throw error;

      toast.success(`Entrada de ${quantity} ${material.unit} registrada!`);
      onOpenChange(false);
      setQuantity("");
      setUnitCost("");
      setNotes("");
      onSuccess?.();
    } catch (error) {
      console.error("Error registering entry:", error);
      toast.error("Erro ao registrar entrada");
    } finally {
      setLoading(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-500">
            <ArrowDown className="h-5 w-5" /> Entrada de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium">{material.name}</p>
            <p className="text-sm text-muted-foreground">
              Estoque atual: {material.current_stock || 0} {material.unit}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              placeholder={`0 ${material.unit}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{costLabel}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={currentCost > 0 ? currentCost.toFixed(2) : "Ex: 119.00"}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {currentCost > 0
                ? `Preço atual: ${currentCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Informe o preço desta entrada — se deixar em branco, o preço atual é mantido.`
                : "Informe o preço pago nesta entrada para acompanhar a evolução dos preços."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Ex: Compra fornecedor X..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Entrada"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
