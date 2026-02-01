import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp } from "lucide-react";
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

interface StockExitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSuccess?: () => void;
}

export function StockExitModal({ open, onOpenChange, material, onSuccess }: StockExitModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Informe a quantidade");
      return;
    }

    const currentStock = material?.current_stock || 0;
    if (parseFloat(quantity) > currentStock) {
      toast.error("Quantidade maior que o estoque disponível");
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

      // Build reason text
      const reasonTexts: Record<string, string> = {
        uso_servico: "Uso em Serviço",
        perda: "Perda/Desperdício",
        vencido: "Vencido",
        ajuste: "Ajuste de Inventário",
        outro: "Outro",
      };
      const reasonText = reason ? reasonTexts[reason] || reason : "Saída manual";
      const fullReason = notes ? `${reasonText}: ${notes}` : reasonText;

      // Insert stock movement (trigger will update current_stock)
      const { error } = await supabase.from("stock_movements").insert({
        material_id: material.id,
        movement_type: "saida",
        quantity: parseFloat(quantity),
        reason: fullReason,
        user_id: user.id,
        company_id: profile.company_id,
      });

      if (error) throw error;

      toast.success(`Saída de ${quantity} ${material.unit} registrada!`);
      onOpenChange(false);
      setQuantity("");
      setReason("");
      setNotes("");
      onSuccess?.();
    } catch (error) {
      console.error("Error registering exit:", error);
      toast.error("Erro ao registrar saída");
    } finally {
      setLoading(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <ArrowUp className="h-5 w-5" /> Saída de Estoque
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
              max={material.current_stock || 0}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uso_servico">Uso em Serviço</SelectItem>
                <SelectItem value="perda">Perda/Desperdício</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Detalhes adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Saída"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
