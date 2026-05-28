import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [status, setStatus] = useState<"fechada" | "aberta">("fechada");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error(material?.unit === "Metros" ? "Informe o comprimento da bobina" : "Informe a quantidade");
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

      // Adiciona a nova bobina via RPC add_material_roll
      const { error } = await supabase.rpc("add_material_roll", {
        p_material_id: material.id,
        p_length: parseFloat(quantity),
        p_status: status,
        p_notes: notes || `Entrada de nova bobina (${status})`,
        p_user_id: user.id,
        p_company_id: profile.company_id,
      });

      if (error) throw error;

      toast.success(
        material.unit === "Metros"
          ? `Nova bobina de ${quantity}m (${status}) adicionada!`
          : `Entrada de ${quantity} ${material.unit} registrada!`
      );
      onOpenChange(false);
      setQuantity("");
      setStatus("fechada");
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

  const isMeters = material.unit === "Metros";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-500">
            <ArrowDown className="h-5 w-5" /> {isMeters ? "Entrada de Bobina" : "Entrada de Estoque"}
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
            <Label>{isMeters ? "Comprimento da Bobina (m) *" : "Quantidade *"}</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={isMeters ? "Ex: 30.00" : `0 ${material.unit}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {isMeters && (
            <div className="space-y-2">
              <Label>Estado da Bobina *</Label>
              <Select value={status} onValueChange={(v: "fechada" | "aberta") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fechada">Bobina Fechada (Nova)</SelectItem>
                  <SelectItem value="aberta">Bobina Aberta (Em Uso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder={isMeters ? "Ex: Bobina comprada do fornecedor X..." : "Ex: Compra fornecedor X..."}
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
