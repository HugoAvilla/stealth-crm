import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp } from "lucide-react";
import { type Material } from "@/lib/mockData";
import { toast } from "sonner";

interface StockExitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

export function StockExitModal({ open, onOpenChange, material }: StockExitModalProps) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Informe a quantidade");
      return;
    }

    if (parseFloat(quantity) > (material?.current_stock || 0)) {
      toast.error("Quantidade maior que o estoque disponível");
      return;
    }

    toast.success(`Saída de ${quantity} ${material?.unit} registrada!`);
    onOpenChange(false);
    setQuantity("");
    setReason("");
    setNotes("");
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
              Estoque atual: {material.current_stock} {material.unit}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              placeholder={`0 ${material.unit}`}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              max={material.current_stock}
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
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSubmit}>
              Confirmar Saída
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
