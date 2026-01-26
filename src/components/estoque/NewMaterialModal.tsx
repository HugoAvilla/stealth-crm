import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface NewMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMaterialModal({ open, onOpenChange }: NewMaterialModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [minStock, setMinStock] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  const handleSubmit = () => {
    if (!name || !category || !unit) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success("Material cadastrado com sucesso!");
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setUnit("");
    setMinStock("");
    setCostPerUnit("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Material *</Label>
            <Input
              placeholder="Ex: Película PPF Metro"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPF">PPF</SelectItem>
                  <SelectItem value="Vitrificação">Vitrificação</SelectItem>
                  <SelectItem value="Polimento">Polimento</SelectItem>
                  <SelectItem value="Insulfilm">Insulfilm</SelectItem>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                  <SelectItem value="Acessórios">Acessórios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidade">Unidade</SelectItem>
                  <SelectItem value="metro">Metro</SelectItem>
                  <SelectItem value="litro">Litro</SelectItem>
                  <SelectItem value="ml">Mililitro</SelectItem>
                  <SelectItem value="kg">Quilograma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={minStock}
                onChange={e => setMinStock(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Custo Unitário (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={costPerUnit}
                onChange={e => setCostPerUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Cadastrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
