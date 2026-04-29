import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BankSelect from "@/components/contas/BankSelect";
import { getBankByCode } from "@/constants/bankCatalog";

interface Account {
  id: number;
  name: string;
  account_type: string | null;
  current_balance: number | null;
  is_main: boolean | null;
  is_active: boolean | null;
  bank_code?: string | null;
}

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onAccountUpdated: () => void;
  onAccountDeleted: (accountId: number) => void;
  canDelete: boolean;
}

export function EditAccountModal({ 
  open, 
  onOpenChange, 
  account,
  onAccountUpdated,
  onAccountDeleted,
  canDelete
}: EditAccountModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [balance, setBalance] = useState("");
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.account_type || "");
      setBalance((account.current_balance || 0).toString());
      setBankCode(account.bank_code || null);
      setIsPrimary(account.is_main || false);
    }
  }, [account]);

  const handleSubmit = async () => {
    if (!name || !type || !account || !user?.id) {
      toast.error("Preencha todos os campos obrigatórios");
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

      // If this account becomes primary, remove primary from others first
      if (isPrimary && !account.is_main) {
        await supabase
          .from("accounts")
          .update({ is_main: false })
          .eq("company_id", profile.company_id);
      }

      const { error } = await supabase
        .from("accounts")
        .update({
          name,
          account_type: type,
          current_balance: parseFloat(balance) || 0,
          is_main: isPrimary,
          bank_code: bankCode,
          bank_name: bankCode ? getBankByCode(bankCode)?.name : null,
        })
        .eq("id", account.id);

      if (error) throw error;

      toast.success("Conta atualizada com sucesso!");
      onAccountUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Erro ao atualizar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    
    if (!canDelete) {
      toast.error("Não é possível excluir a única conta");
      return;
    }

    if (account.is_main) {
      toast.error("Não é possível excluir a conta principal");
      return;
    }

    setLoading(true);

    try {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: false })
        .eq("id", account.id);

      if (error) throw error;

      toast.success("Conta excluída com sucesso!");
      onAccountDeleted(account.id);
      onOpenChange(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Conta *</Label>
              <Input
                placeholder="Ex: Conta Empresarial"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Banco (Opcional)</Label>
              <BankSelect 
                value={bankCode} 
                onValueChange={setBankCode} 
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
              <Label>Saldo Atual</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={balance}
                onChange={e => setBalance(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Conta Principal</Label>
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="destructive" 
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!canDelete || account.is_main || loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{account?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
