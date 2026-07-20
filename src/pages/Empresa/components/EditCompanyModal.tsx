import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PhoneInputWithDDI from "@/components/ui/PhoneInputWithDDI";
import { Loader2 } from "lucide-react";

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EditCompanyModal({ open, onOpenChange, onSaved }: EditCompanyModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user?.companyId) {
      loadCompanyData();
    }
  }, [open, user?.companyId]);

  const loadCompanyData = async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("company_name, cnpj, phone, email, street, number, neighborhood, city, state, cep")
      .eq("id", user.companyId)
      .single();

    if (!error && data) {
      setName(data.company_name || "");
      setCnpj(data.cnpj || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setStreet(data.street || "");
      setNumber(data.number || "");
      setNeighborhood(data.neighborhood || "");
      setCity(data.city || "");
      setState(data.state || "");
      setCep(data.cep || "");
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!name || !phone || !email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (!user?.companyId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          company_name: name,
          cnpj: cnpj || null,
          phone,
          email,
          street: street || null,
          number: number || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
          cep: cep || null,
        })
        .eq("id", user.companyId);

      if (error) throw error;

      toast.success("Dados da empresa atualizados!");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Erro ao atualizar dados da empresa");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados da Empresa</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <PhoneInputWithDDI value={phone} onChange={setPhone} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Rua</Label>
                <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua / Avenida" />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="Nº" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={state} onChange={e => setState(e.target.value)} placeholder="UF" />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
