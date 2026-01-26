import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companySettings } from "@/lib/mockData";
import { toast } from "sonner";

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompanyModal({ open, onOpenChange }: EditCompanyModalProps) {
  const [name, setName] = useState(companySettings.name);
  const [cnpj, setCnpj] = useState(companySettings.cnpj);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [address, setAddress] = useState(companySettings.address);

  const handleSubmit = () => {
    if (!name || !phone || !email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success("Dados da empresa atualizados!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Dados da Empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+55 (00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número - Bairro, Cidade/UF"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
