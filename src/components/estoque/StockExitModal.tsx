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
import { useQuery } from "@tanstack/react-query";
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

  // Fetch active rolls for this material to show the status
  const { data: rolls, refetch: refetchRolls } = useQuery({
    queryKey: ['material-rolls-for-exit', material?.id],
    queryFn: async () => {
      if (!material?.id) return [];
      const { data, error } = await supabase
        .from("material_rolls")
        .select("id, status, remaining_length_meters")
        .eq("material_id", material.id)
        .in("status", ["aberta", "fechada"]);
      if (error) throw error;
      return data;
    },
    enabled: !!material?.id && open,
  });

  const openRollsCount = rolls?.filter(r => r.status === "aberta").length || 0;
  const closedRollsCount = rolls?.filter(r => r.status === "fechada").length || 0;
  const isMeters = material?.unit === "Metros";

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

      if (isMeters) {
        // Usa a RPC manual_exit_material_rolls para atualizar de forma atômica
        const { data: rpcData, error } = await supabase.rpc("manual_exit_material_rolls", {
          p_material_id: material.id,
          p_meters: parseFloat(quantity),
          p_reason: fullReason,
          p_user_id: user.id,
          p_company_id: profile.company_id,
        });

        if (error) throw error;

        const response = rpcData as any;
        if (response && response.warning) {
          toast.error(
            `Estoque insuficiente: necessário ${response.required_meters}m, disponível ${response.available_meters}m`
          );
          setLoading(false);
          return;
        }

        toast.success(`Saída de ${quantity}m registrada com sucesso!`);
      } else {
        // Para outras unidades, insere diretamente em stock_movements (caso ainda exista trigger ou faremos manualmente)
        const { error } = await supabase.from("stock_movements").insert({
          material_id: material.id,
          movement_type: "Saida",
          quantity: parseFloat(quantity),
          reason: fullReason,
          user_id: user.id,
          company_id: profile.company_id,
        });

        if (error) throw error;

        // Atualiza materials.current_stock manualmente caso o trigger legado esteja desabilitado
        await supabase
          .from("materials")
          .update({
            current_stock: Math.max(0, currentStock - parseFloat(quantity)),
          })
          .eq("id", material.id);

        toast.success(`Saída de ${quantity} ${material.unit} registrada!`);
      }

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
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium text-foreground">{material.name}</p>
            <p className="text-sm text-muted-foreground">
              Estoque atual: {material.current_stock || 0} {material.unit}
            </p>
            {isMeters && (
              <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t mt-1">
                <span>🟢 {openRollsCount} bobina(s) aberta(s)</span>
                <span>🔵 {closedRollsCount} bobina(s) fechada(s)</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{isMeters ? "Quantidade a Retirar (m) *" : "Quantidade *"}</Label>
            <Input
              type="number"
              step="0.01"
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
