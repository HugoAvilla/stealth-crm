import { useState } from "react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";
import { CAC_ORIGIN_OPTIONS } from "@/constants/origins";
import { createExpenseTransaction } from "@/lib/financialTransactions";

interface RoasEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RoasEntryModal({ open, onOpenChange, onSuccess }: RoasEntryModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [origin, setOrigin] = useState<string>("Google Ads");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) {
      toast({ title: "Empresa não vinculada", variant: "destructive" });
      return;
    }

    const valorInvestido = parseFloat(amount.replace(",", "."));
    if (isNaN(valorInvestido) || valorInvestido <= 0) {
      toast({ title: "Digite um valor válido maior que 0", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Buscar conta principal da empresa
      const { data: mainAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("company_id", user.companyId)
        .eq("is_main", true)
        .single();

      if (!mainAccount) {
        toast({ title: "Conta principal não encontrada", variant: "destructive" });
        return;
      }

      const result = await createExpenseTransaction({
        name: description ? `Ads - ${description}` : `Investimento ${origin}`,
        amount: valorInvestido,
        transactionDate: entryDate,
        companyId: user.companyId,
        accountId: mainAccount.id,
        isPaid: true,
        description: `CAC - ${origin}`,
        originType: "roas",
      });

      if (!result) throw new Error("Falha ao criar transação");

      // Atualizar campos CAC na transação criada
      await supabase
        .from("transactions")
        .update({
          include_in_cac: true,
          cac_bucket: "marketing",
          cac_origin: origin,
        })
        .eq("id", result.id);

      toast({
        title: "Investimento Registrado!",
        description: `R$ ${valorInvestido.toFixed(2)} cadastrados para ${origin}. O cálculo do CAC/ROAS foi atualizado.`,
      });

      setAmount("");
      setDescription("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao registrar gasto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Registrar Investimento (Ads)</DialogTitle>
              <DialogDescription>
                Lancamento rápido de gastos com tráfego para os cálculos de ROAS e CAC.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Data</Label>
              <Input
                id="entryDate"
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin">Canal/Origem</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger id="origin">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CAC_ORIGIN_OPTIONS.filter((o) => o !== "Geral").map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Investido (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              required
              placeholder="Ex: 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição Opcional</Label>
            <Input
              id="description"
              placeholder="Ex: Campanha Dia dos Pais, Impulsionamento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Lançamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
