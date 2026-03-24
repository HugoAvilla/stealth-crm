import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { NewCategoryModal } from "./NewCategoryModal";
interface Account {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'entrada' | 'saida';
  onSuccess?: () => void;
}

export function AddTransactionModal({ open, onOpenChange, type, onSuccess }: AddTransactionModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(1);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user?.id, type]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return;

      setCompanyId(profile.company_id);

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      // Fetch categories
      const typeFilter = type === 'entrada' ? 'Entrada' : 'Saida';
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("company_id", profile.company_id)
        .eq("type", typeFilter);

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !name || !categoryId || !accountId || !companyId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const transactionType = type === 'entrada' ? 'Entrada' : 'Saida';
      const amountValue = parseFloat(amount);

      const transactionsToInsert = [];
      const monthsCount = (type === 'saida' && isRecurring) ? recurringMonths : 1;

      for (let i = 0; i < monthsCount; i++) {
        const d = new Date(date + "T12:00:00");
        d.setMonth(d.getMonth() + i);
        const nextDate = d.toISOString().split('T')[0];

        transactionsToInsert.push({
          company_id: companyId,
          name: monthsCount > 1 ? `${name} (${i + 1}/${monthsCount})` : name,
          description: description || null,
          amount: amountValue,
          type: transactionType,
          category_id: parseInt(categoryId),
          account_id: parseInt(accountId),
          payment_method: paymentMethod || null,
          transaction_date: nextDate,
          is_paid: i === 0 ? isPaid : false,
        });
      }

      const { error } = await supabase.from("transactions").insert(transactionsToInsert);

      if (error) throw error;

      toast.success(`${type === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Erro ao registrar transação");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setName("");
    setDescription("");
    setCategoryId("");
    setAccountId("");
    setPaymentMethod("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsPaid(true);
    setIsRecurring(false);
    setRecurringMonths(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className={type === 'entrada' ? 'text-green-500' : 'text-red-500'}>
            Nova {type === 'entrada' ? 'Entrada' : 'Saída'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Valor *</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              placeholder="Ex: Pagamento cliente"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição da transação..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline"
                  onClick={() => setNewCategoryModalOpen(true)}
                  title="Nova categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conta *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {type === 'entrada' && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>A entrada foi paga?</Label>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
            </div>
          )}

          {type === 'saida' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Essa saída vai se repetir nos próximos meses?</Label>
                </div>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                  <Label>A saída irá se repetir por quantos meses?</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setRecurringMonths(Math.max(1, recurringMonths - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold min-w-[3ch] text-center">
                      {recurringMonths} {recurringMonths === 1 ? 'mês' : 'meses'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setRecurringMonths(recurringMonths + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              className={`flex-1 ${type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <NewCategoryModal
        open={newCategoryModalOpen}
        onOpenChange={setNewCategoryModalOpen}
        defaultType={type}
        onSuccess={(newCategoryId) => {
          fetchData();
          setCategoryId(newCategoryId.toString());
        }}
      />
    </Dialog>
  );
}
