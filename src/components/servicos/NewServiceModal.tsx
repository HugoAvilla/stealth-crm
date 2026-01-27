import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Service } from "@/lib/mockData";
import { toast } from "sonner";

interface NewServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editService?: Service | null;
}

export function NewServiceModal({ open, onOpenChange, editService }: NewServiceModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");

  useEffect(() => {
    if (editService) {
      setName(editService.name);
      setPrice(editService.price.toString());
      setDescription(editService.description);
      setCommissionPercent(editService.commission_percent.toString());
    } else {
      resetForm();
    }
  }, [editService, open]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setDescription("");
    setCommissionPercent("");
  };

  const handleSubmit = () => {
    if (!name || !price) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success(editService ? "Serviço atualizado!" : "Serviço criado com sucesso!");
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Serviço *</Label>
            <Input
              placeholder="Ex: Vitrificação Completa"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço (R$) *</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                placeholder="10"
                value={commissionPercent}
                onChange={e => setCommissionPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição do serviço..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              {editService ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
