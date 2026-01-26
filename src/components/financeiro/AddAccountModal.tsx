import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [balance, setBalance] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const handleSubmit = () => {
    if (!name || !type) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    toast.success("Conta criada com sucesso!");
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setType("");
    setBalance("");
    setIsPrimary(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Conta *</Label>
            <Input
              placeholder="Ex: Conta Empresarial"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                <SelectItem value="Poupança">Poupança</SelectItem>
                <SelectItem value="Carteira">Carteira</SelectItem>
                <SelectItem value="Investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Saldo Inicial</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Conta Principal</Label>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Criar Conta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
