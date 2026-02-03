import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Account {
  id: number;
  name: string;
}

interface AddTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddTransferModal({ open, onOpenChange, onSuccess }: AddTransferModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open, user?.id]);

  const fetchAccounts = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return;

      setCompanyId(profile.company_id);

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      setAccounts(accountsData || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !fromAccountId || !toAccountId || !companyId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("Selecione contas diferentes");
      return;
    }

    setLoading(true);

    try {
      const amountValue = parseFloat(amount);
      const today = new Date().toISOString().split('T')[0];

      // Create transfer record
      const { error } = await supabase.from("transfers").insert({
        company_id: companyId,
        from_account_id: parseInt(fromAccountId),
        to_account_id: parseInt(toAccountId),
        amount: amountValue,
        description: description || null,
        transfer_date: today,
      });

      if (error) throw error;

      toast.success("Transferência realizada com sucesso!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Erro ao realizar transferência");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setFromAccountId("");
    setToAccountId("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-500">Nova Transferência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor *</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-2">
              <Label>De *</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta origem..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

            <div className="flex-1 space-y-2">
              <Label>Para *</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta destino..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Reserva mensal"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={loading}>
              {loading ? "Transferindo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
