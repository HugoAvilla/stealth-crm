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
import { CAC_ORIGIN_OPTIONS, CacOrigin } from "@/constants/origins";
import { format } from "date-fns";
interface Account {
  id: number;
  name: string;
  accepted_payment_methods?: string[] | null;
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
  defaultAccountId?: string;
}

export function AddTransactionModal({ open, onOpenChange, type, onSuccess, defaultAccountId }: AddTransactionModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [installments, setInstallments] = useState<{ date: string, value: string }[]>([]);
  const [includeInCac, setIncludeInCac] = useState(false);
  const [cacBucket, setCacBucket] = useState<'marketing' | 'vendas' | ''>('');
  const [cacOrigin, setCacOrigin] = useState<CacOrigin | ''>('');

  useEffect(() => {
    if (open) {
      if (defaultAccountId) {
        setAccountId(defaultAccountId);
      }
      fetchData();
    } else {
      resetForm();
    }
  }, [open, user?.id, type, defaultAccountId]);

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
        .select("id, name, accepted_payment_methods")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      // Fetch categories
      const typeFilter = type === 'entrada' ? 'Entrada' : 'Saida';
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("company_id", profile.company_id)
        .eq("type", typeFilter);

      setAccounts((accountsData || []) as any);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const generateInstallments = (count: number, currentAmount: string, currentDate: string) => {
    const totalAmount = parseFloat(currentAmount) || 0;
    const baseAmount = Number((totalAmount / count).toFixed(2));

    let sum = 0;
    const newInstallments = Array.from({ length: count }).map((_, i) => {
      let dStr = currentDate;
      if (currentDate) {
        const d = new Date(currentDate + "T12:00:00");
        d.setMonth(d.getMonth() + i + 1);
        dStr = d.toISOString().split('T')[0];
      }

      let val = baseAmount;
      if (i === count - 1) {
        val = Number((totalAmount - sum).toFixed(2));
      } else {
        sum += baseAmount;
      }

      return {
        date: dStr,
        value: val.toString()
      };
    });
    setInstallments(newInstallments);
  };

  useEffect(() => {
    if (isRecurring && type === 'saida') {
      generateInstallments(installmentsCount, amount, date);
    }
  }, [amount, date, isRecurring, installmentsCount, type]);

  const handleInstallmentChange = (index: number, field: 'date' | 'value', val: string) => {
    const newInst = [...installments];
    newInst[index][field] = val;
    setInstallments(newInst);
  };

  const handleSubmit = async () => {
    if (!amount || !name || !categoryId || !accountId || !companyId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (type === 'saida' && includeInCac && !cacBucket) {
      toast.error("Para controle de CAC, informe se o custo foi Vendas ou Marketing.");
      return;
    }

    if (paymentMethod && paymentMethod !== "Crédito" && paymentMethod !== "Débito") {
      const account = accounts.find(a => a.id.toString() === accountId.toString());
      if (account && account.accepted_payment_methods && !account.accepted_payment_methods.includes(paymentMethod)) {
        toast.error(`A forma de pagamento "${paymentMethod}" não é aceita pela conta selecionada.`);
        return;
      }
    }

    setLoading(true);

    try {
      const transactionType = type === 'entrada' ? 'Entrada' : 'Saida';
      const amountValue = parseFloat(amount);

      const transactionsToInsert = [];
      const isSaidaRecurring = type === 'saida' && isRecurring;

      if (isSaidaRecurring && installments.length > 0) {
        let currentInstallment = 1;
        for (const inst of installments) {
          transactionsToInsert.push({
            company_id: companyId,
            name: installmentsCount > 1 ? `${name} (${currentInstallment}/${installmentsCount})` : name,
            description: description || null,
            amount: parseFloat(inst.value) || 0,
            type: transactionType,
            category_id: parseInt(categoryId),
            account_id: parseInt(accountId),
            payment_method: paymentMethod || null,
            transaction_date: inst.date,
            is_paid: currentInstallment === 1 ? isPaid : false,
            include_in_cac: includeInCac,
            cac_bucket: includeInCac ? cacBucket : null,
            cac_origin: includeInCac ? cacOrigin : null,
          });
          currentInstallment++;
        }
      } else {
        transactionsToInsert.push({
          company_id: companyId,
          name: name,
          description: description || null,
          amount: amountValue,
          type: transactionType,
          category_id: parseInt(categoryId),
          account_id: parseInt(accountId),
          payment_method: paymentMethod || null,
          transaction_date: date,
          is_paid: isPaid,
          include_in_cac: type === 'saida' ? includeInCac : false,
          cac_bucket: (type === 'saida' && includeInCac) ? cacBucket : null,
          cac_origin: (type === 'saida' && includeInCac) ? cacOrigin : null,
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
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsPaid(true);
    setIsRecurring(false);
    setInstallmentsCount(2);
    setInstallments([]);
    setIncludeInCac(false);
    setCacBucket('');
    setCacOrigin('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md p-4 sm:p-6 max-h-[90dvh] overflow-y-auto overflow-x-hidden flex flex-col gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {paymentMethod && accountId && !accounts.find(a => a.id.toString() === accountId)?.accepted_payment_methods?.includes(paymentMethod) && accounts.find(a => a.id.toString() === accountId)?.accepted_payment_methods && (
                <div className="mt-2 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 p-2 rounded-md">
                  Atenção: A conta selecionada não costuma aceitar a forma de pagamento "{paymentMethod}".
                </div>
              )}
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
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 gap-3">
              <div className="flex-1 space-y-0.5 min-w-0">
                <Label className="text-sm font-semibold truncate block">A entrada foi paga?</Label>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
                className="shrink-0"
              />
            </div>
          )}

          {type === 'saida' && (
            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20 gap-3">
                <div className="flex-1 space-y-0.5 min-w-0">
                  <Label className="text-sm font-semibold truncate block">Custo Aquisição (CAC)?</Label>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    Se for comissão/marketing a ser rateado, ative.
                  </p>
                </div>
                <Switch
                  checked={includeInCac}
                  onCheckedChange={setIncludeInCac}
                  className="shrink-0"
                />
              </div>

              {includeInCac && (
                <div className="p-3 border rounded-lg bg-orange-500/5 border-orange-500/20 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-orange-700 dark:text-orange-300">Área do Custo *</Label>
                    <Select value={cacBucket} onValueChange={(v) => setCacBucket(v as any)}>
                      <SelectTrigger className="border-orange-500/30">
                        <SelectValue placeholder="Foi Marketing ou Vendas?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing (ex: Tráfego)</SelectItem>
                        <SelectItem value="vendas">Vendas (ex: Comissão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-orange-700 dark:text-orange-300">Origem Principal</Label>
                    <Select value={cacOrigin} onValueChange={(v) => setCacOrigin(v as any)}>
                      <SelectTrigger className="border-orange-500/30">
                        <SelectValue placeholder="Canal Específico ou Geral?" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAC_ORIGIN_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4 gap-3">
                <div className="flex-1 space-y-0.5 min-w-0">
                  <Label className="text-sm font-semibold truncate block">Essa saída será parcelada?</Label>
                </div>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                  className="shrink-0"
                />
              </div>

              {isRecurring && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-3">
                    <Label>Quantidade de vezes</Label>
                    <Select
                      value={installmentsCount.toString()}
                      onValueChange={(val) => setInstallmentsCount(parseInt(val))}
                    >
                      <SelectTrigger className="w-full bg-background border-input">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 36 }).map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {installments.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <Label className="text-sm font-medium">Datas e Valores das Parcelas</Label>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {installments.map((inst, idx) => (
                          <div key={idx} className="flex flex-row items-center gap-2">
                            <div className="flex items-center justify-center bg-muted/50 rounded-md w-8 sm:w-10 h-10 border border-input text-xs font-semibold shrink-0">
                              {idx + 1}x
                            </div>
                            <Input
                              type="date"
                              value={inst.date}
                              onChange={(e) => handleInstallmentChange(idx, 'date', e.target.value)}
                              className="flex-1 bg-background min-w-[100px] text-xs sm:text-sm px-2 sm:px-3"
                            />
                            <div className="relative w-[100px] sm:flex-1 shrink-0">
                              <span className="absolute left-2.5 top-2.5 text-xs sm:text-sm text-muted-foreground font-medium">R$</span>
                              <Input
                                type="number"
                                className="pl-7 bg-background font-medium text-xs sm:text-sm w-full"
                                value={inst.value}
                                onChange={(e) => handleInstallmentChange(idx, 'value', e.target.value)}
                                step="0.01"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 mt-auto">
            <Button variant="outline" className="w-full sm:w-auto sm:flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className={`w-full sm:w-auto sm:flex-1 ${type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
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
