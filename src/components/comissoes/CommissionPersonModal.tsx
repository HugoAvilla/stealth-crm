import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type CommissionPersonType = 'VENDEDOR' | 'INSTALADOR_INSULFILM' | 'INSTALADOR_PPF';

interface CommissionPerson {
  id: number;
  company_id: number;
  name: string;
  type: CommissionPersonType;
  commission_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CommissionPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: CommissionPerson | null;
  onSuccess: () => void;
}

const CommissionPersonModal = ({ open, onOpenChange, person, onSuccess }: CommissionPersonModalProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CommissionPersonType | "">("");
  const [percentage, setPercentage] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isEditing = !!person;

  useEffect(() => {
    if (open) {
      if (person) {
        setName(person.name);
        setType(person.type);
        setPercentage(person.commission_percentage.toString());
        setIsActive(person.is_active);
      } else {
        setName("");
        setType("");
        setPercentage("");
        setIsActive(true);
      }
    }
  }, [open, person]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    if (!type) {
      toast.error("Selecione o tipo do comissionado.");
      return;
    }
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Percentual deve ser entre 0 e 100.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && person) {
        const { error } = await supabase
          .from('commission_people')
          .update({
            name: name.trim(),
            type,
            commission_percentage: pct,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', person.id);

        if (error) throw error;
        toast.success("Comissionado atualizado com sucesso!");
      } else {
        // Get company_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user?.id || '')
          .single();

        if (!profile?.company_id) {
          toast.error("Erro ao identificar empresa.");
          return;
        }

        const { error } = await supabase
          .from('commission_people')
          .insert({
            company_id: profile.company_id,
            name: name.trim(),
            type,
            commission_percentage: pct,
            is_active: isActive,
          });

        if (error) throw error;
        toast.success("Comissionado cadastrado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving commission person:', error);
      toast.error("Erro ao salvar comissionado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              {isEditing ? (
                <Percent className="h-5 w-5 text-primary" />
              ) : (
                <UserPlus className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isEditing ? "Editar Comissionado" : "Novo Comissionado"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Altere os dados do comissionado"
                  : "Preencha os dados para cadastrar um comissionado"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              placeholder="Nome do comissionado"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as CommissionPersonType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                <SelectItem value="INSTALADOR_INSULFILM">Instalador Insulfilm</SelectItem>
                <SelectItem value="INSTALADOR_PPF">Instalador PPF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Percentual */}
          <div className="space-y-2">
            <Label>Percentual de Comissão (%) *</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="10.00"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label>Status Ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionPersonModal;
