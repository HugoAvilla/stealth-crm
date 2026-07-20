import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
  commission_percentage: number | null;
}

interface NewServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editService?: Service | null;
  onSuccess?: () => void;
}

export function NewServiceModal({ open, onOpenChange, editService, onSuccess }: NewServiceModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editService) {
      setName(editService.name);
      setPrice(editService.base_price.toString());
      setDescription(editService.description || "");
      setCommissionPercent(editService.commission_percentage?.toString() || "");
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

  const handleSubmit = async () => {
    if (!name || !price) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
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

      const serviceData = {
        name,
        base_price: parseFloat(price),
        description: description || null,
        commission_percentage: commissionPercent ? parseFloat(commissionPercent) : null,
        company_id: profile.company_id,
      };

      if (editService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editService.id);

        if (error) throw error;
        toast.success("Serviço atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);

        if (error) throw error;
        toast.success("Serviço criado com sucesso!");
      }

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Erro ao salvar serviço");
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço (R$) *</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                placeholder="10"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição do serviço..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : editService ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
