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
import { type Account } from "@/lib/mockData";
import { Trash2 } from "lucide-react";

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onAccountUpdated: (account: Account) => void;
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
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [balance, setBalance] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(account.balance.toString());
      setIsPrimary(account.is_primary);
    }
  }, [account]);

  const handleSubmit = () => {
    if (!name || !type || !account) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const updatedAccount: Account = {
      ...account,
      name,
      type: type as Account['type'],
      balance: parseFloat(balance) || 0,
      is_primary: isPrimary
    };

    onAccountUpdated(updatedAccount);
    toast.success("Conta atualizada com sucesso!");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!account) return;
    
    if (!canDelete) {
      toast.error("Não é possível excluir a única conta");
      return;
    }

    if (account.is_primary) {
      toast.error("Não é possível excluir a conta principal");
      return;
    }

    onAccountDeleted(account.id);
    toast.success("Conta excluída com sucesso!");
    onOpenChange(false);
    setShowDeleteConfirm(false);
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
                disabled={!canDelete || account.is_primary}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
