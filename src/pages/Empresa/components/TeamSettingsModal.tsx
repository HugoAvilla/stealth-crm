import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TeamSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLimit: number;
  currentMembers: number;
  onSaved: () => void;
}

export function TeamSettingsModal({
  open,
  onOpenChange,
  currentLimit,
  currentMembers,
  onSaved,
}: TeamSettingsModalProps) {
  const { user } = useAuth();
  const [limit, setLimit] = useState(currentLimit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLimit(currentLimit);
  }, [currentLimit, open]);

  const handleIncrement = () => {
    if (limit < 50) setLimit(limit + 1);
  };

  const handleDecrement = () => {
    // Não permitir diminuir abaixo do número atual de membros
    if (limit > Math.max(1, currentMembers)) {
      setLimit(limit - 1);
    }
  };

  const handleSave = async () => {
    if (!user?.companyId) return;

    // Validação: limite não pode ser menor que membros atuais
    if (limit < currentMembers) {
      toast.error(`Limite não pode ser menor que o número atual de membros (${currentMembers})`);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ max_members: limit })
        .eq("id", user.companyId);

      if (error) throw error;

      toast.success("Limite de membros atualizado!");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating limit:", error);
      toast.error("Erro ao atualizar limite");
    } finally {
      setIsSaving(false);
    }
  };

  const minLimit = Math.max(1, currentMembers);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações da Equipe</DialogTitle>
          <DialogDescription>
            Defina o número máximo de membros que podem fazer parte da sua empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Limite de Membros</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={limit <= minLimit}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={limit}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || minLimit;
                  setLimit(Math.min(50, Math.max(minLimit, val)));
                }}
                min={minLimit}
                max={50}
                className="text-center w-20"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={limit >= 50}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo: {minLimit} | Máximo: 50
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Membros atuais: <span className="font-medium text-foreground">{currentMembers}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || limit === currentLimit}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
