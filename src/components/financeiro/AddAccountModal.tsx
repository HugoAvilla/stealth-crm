import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [balance, setBalance] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !type) {
      toast.error("Preencha todos os campos obrigatórios");
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

      const initialBalance = balance ? parseFloat(balance) : 0;

      // If this account is primary, remove primary from others first
      if (isPrimary) {
        await supabase
          .from("accounts")
          .update({ is_main: false })
          .eq("company_id", profile.company_id);
      }

      const { error } = await supabase.from("accounts").insert({
        name,
        account_type: type,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        is_main: isPrimary,
        is_active: true,
        company_id: profile.company_id,
      });

      if (error) throw error;

      toast.success("Conta criada com sucesso!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Conta Principal</Label>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Criar Conta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
