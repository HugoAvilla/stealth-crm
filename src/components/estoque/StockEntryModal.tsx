import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown } from "lucide-react";
import { type Material } from "@/lib/mockData";
import { toast } from "sonner";

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

export function StockEntryModal({ open, onOpenChange, material }: StockEntryModalProps) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Informe a quantidade");
      return;
    }

    toast.success(`Entrada de ${quantity} ${material?.unit} registrada!`);
    onOpenChange(false);
    setQuantity("");
    setNotes("");
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
            />
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Ex: Compra fornecedor X..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
              Confirmar Entrada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
