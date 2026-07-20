import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PhoneInputWithDDI from "@/components/ui/PhoneInputWithDDI";
import { Loader2 } from "lucide-react";

interface EditInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInfoModal({ open, onOpenChange }: EditInfoModalProps) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.profile?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.profile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name, phone })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshUser();
      toast.success("Informações atualizadas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erro ao atualizar informações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Informações</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled
            />
            <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <PhoneInputWithDDI
              value={phone}
              onChange={setPhone}
            />
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
      </DialogContent>
    </Dialog>
  );
}
