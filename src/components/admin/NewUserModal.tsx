import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewUserModal({ open, onOpenChange }: NewUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("");

  const handleSubmit = () => {
    if (!name || !email || !role) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    toast.success(`Usuário criado! Senha temporária: ${tempPassword}`);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="Nome do usuário"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="+55 (00) 00000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Papel *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Uma senha temporária será gerada automaticamente. O usuário deverá alterá-la no primeiro acesso.
          </p>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Criar Usuário
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
