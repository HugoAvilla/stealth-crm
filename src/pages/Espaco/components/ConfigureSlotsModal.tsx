import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ConfigureSlotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTotal: number;
  onSuccess: () => void;
}

export function ConfigureSlotsModal({
  open,
  onOpenChange,
  currentTotal,
  onSuccess,
}: ConfigureSlotsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalSlots, setTotalSlots] = useState<string>(currentTotal.toString());

  useEffect(() => {
    if (open) {
      setTotalSlots(currentTotal.toString());
    }
  }, [open, currentTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;

    setIsSubmitting(true);
    try {
      const newTotal = parseInt(totalSlots, 10);

      // Try to update existing record first
      const { data: updateData, error: updateError } = await supabase
        .from("company_settings")
        .update({ total_slots: newTotal })
        .eq("company_id", user.companyId)
        .select("id");

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      // If no row was updated, insert a new one
      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from("company_settings")
          .insert({ company_id: user.companyId, total_slots: newTotal });

        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Quantidade de vagas atualizada com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating slots:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar a quantidade de vagas.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Quantidade de Vagas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="slots">Total de Vagas Disponíveis</Label>
            <Select value={totalSlots} onValueChange={setTotalSlots}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }).map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Defina o máximo de vagas que seu estabelecimento possui.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
