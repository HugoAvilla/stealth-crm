import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Landmark,
  DollarSign,
  Calendar as CalendarIcon,
  Trash2,
  AlertCircle,
  QrCode,
  Banknote,
  Receipt
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  calculateCardMachineFeeAmount,
  calculateCardMachineNetAmount,
  formatCardMachineRatePercent,
} from "@/lib/cardMachineFees";

export interface SalePayment {
  tempId: string;
  payment_method: string;
  amount: number;
  account_id: number | null;
  machine_id: number | null;
  installments: number;
  due_date: string;
  status: 'pending' | 'received';
}

interface PaymentBlockProps {
  payment: SalePayment;
  onUpdate: (updated: SalePayment) => void;
  onRemove: () => void;
  totalRemaining: number;
  companyId: number;
  isFirst?: boolean;
  hidePaymentMethod?: boolean;
  hideInstallments?: boolean;
  removePaymentMethod?: boolean;
}

const PAYMENT_METHODS = [
  { id: "Pix", label: "Pix", icon: QrCode },
  { id: "Dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "Crédito", label: "Cartão de Crédito", icon: CreditCard },
  { id: "Débito", label: "Cartão de Débito", icon: CreditCard },
  { id: "Boleto", label: "Boleto", icon: Receipt },
  { id: "Transferência", label: "Transferência", icon: Landmark },
];

/** Masked currency input — Brazilian Real (R$) format: 1.234,56 */
function CurrencyInput({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const formatCurrency = (cents: number): string => {
    const reais = (cents / 100).toFixed(2);
    const [intPart, decPart] = reais.split(".");
    // Add thousand separators
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedInt},${decPart}`;
  };

  const [display, setDisplay] = useState(() => {
    if (value === 0) return "";
    return formatCurrency(Math.round(value * 100));
  });

  // Sync display when value changes externally (e.g., auto-fill from total)
  useEffect(() => {
    const currentCents = parseCurrencyToCents(display);
    const externalCents = Math.round(value * 100);
    if (currentCents !== externalCents) {
      if (value === 0) {
        setDisplay("");
      } else {
        setDisplay(formatCurrency(externalCents));
      }
    }
  }, [value]);

  const parseCurrencyToCents = (str: string): number => {
    const digits = str.replace(/\D/g, "");
    return parseInt(digits || "0", 10);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");

    if (digits === "" || digits === "0" || digits === "00") {
      setDisplay("");
      onChange(0);
      return;
    }

    const cents = parseInt(digits, 10);
    const formatted = formatCurrency(cents);
    setDisplay(formatted);
    onChange(cents / 100);
  };

  return (
    <div className="relative">
      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0,00"
        value={display}
        onChange={handleChange}
        className="pl-8 h-10 font-semibold"
      />
    </div>
  );
}

export function PaymentBlock({
  payment,
  onUpdate,
  onRemove,
  totalRemaining,
  companyId,
  isFirst,
  hidePaymentMethod,
  hideInstallments,
  removePaymentMethod
}: PaymentBlockProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    const [accRes, macRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("company_id", companyId).eq("is_active", true),
      supabase.from("card_machines").select("*").eq("company_id", companyId).eq("is_active", true)
    ]);
    setAccounts(accRes.data || []);
    setMachines(macRes.data || []);
  };

  useEffect(() => {
    if (payment.machine_id) {
      fetchRates(payment.machine_id);
    }
  }, [payment.machine_id]);

  const fetchRates = async (machineId: number) => {
    const { data } = await supabase
      .from("card_machine_rates")
      .select("*")
      .eq("machine_id", machineId)
      .order("installments");
    setRates(data || []);
  };

  const isCard = payment.payment_method === "Crédito" || payment.payment_method === "Débito";
  const isDebit = payment.payment_method === "Débito";
  const isBoleto = payment.payment_method === "Boleto";

  // Filter machines by type matching the payment method
  const filteredMachines = machines.filter(m => {
    if (isDebit) return (m as any).machine_type === 'debit' || (m as any).machine_type === 'both';
    if (payment.payment_method === "Crédito") return (m as any).machine_type === 'credit' || (m as any).machine_type === 'both';
    return true;
  });

  const handleMachineChange = (id: number | null) => {
    const machine = machines.find(m => m.id === id);
    const isDebitMachine = (machine as any)?.machine_type === 'debit';
    onUpdate({
      ...payment,
      machine_id: id,
      account_id: machine?.account_id || payment.account_id,
      installments: isDebitMachine ? 1 : 1
    });
  };

  const currentRate = isDebit
    ? machines.find(m => m.id === payment.machine_id)?.debit_rate || 0
    : rates.find(r => r.installments === payment.installments)?.rate || 0;
  const discountAmount = calculateCardMachineFeeAmount(payment.amount, currentRate);
  const netAmount = calculateCardMachineNetAmount(payment.amount, currentRate);
  const currentRateFormatted = formatCardMachineRatePercent(currentRate);

  const selectedAccount = accounts.find(a => a.id === payment.account_id);
  const availableMethods = selectedAccount?.accepted_payment_methods
    ? PAYMENT_METHODS.filter(m => selectedAccount.accepted_payment_methods.includes(m.id) || m.id === "Crédito" || m.id === "Débito")
    : PAYMENT_METHODS;

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden bg-card/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {!removePaymentMethod && (
            !hidePaymentMethod ? (
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma</Label>
                <Select
                  value={payment.payment_method}
                  onValueChange={(val) => onUpdate({ ...payment, payment_method: val, installments: 1, machine_id: null })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <m.icon className="h-4 w-4 text-primary/70" />
                          {m.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma (Definida na Compra)</Label>
                <div className="h-10 border rounded-md bg-muted/60 flex items-center px-3 text-muted-foreground">
                  {(() => {
                    const methodObj = PAYMENT_METHODS.find(m => m.id === payment.payment_method);
                    const Icon = methodObj?.icon || Banknote;
                    return (
                      <div className="flex items-center gap-2 opacity-80">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{methodObj?.label || payment.payment_method}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )
          )}

          <div className="w-36 sm:w-44 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</Label>
            <CurrencyInput
              value={payment.amount}
              onChange={(val) => onUpdate({ ...payment, amount: val })}
            />
          </div>

          {!isFirst && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className={cn("grid grid-cols-1 gap-4", isBoleto ? (hideInstallments ? "md:grid-cols-2" : "md:grid-cols-3") : "md:grid-cols-1")}>
          {!isCard && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Conta de Destino</Label>
              <Select
                value={payment.account_id?.toString()}
                onValueChange={(val) => onUpdate({ ...payment, account_id: parseInt(val) })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      <div className="flex items-center gap-2">
                        {acc.bank_code && (
                          <img
                            src={`/banks/${acc.bank_code}.png`}
                            alt=""
                            className="w-3.5 h-3.5 object-contain filter drop-shadow-sm brightness-110"
                            onError={(e) => (e.target as any).style.display = 'none'}
                          />
                        )}
                        {acc.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isBoleto && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{hideInstallments ? "Data do Pagamento" : "Data / Vencimento"}</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !payment.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payment.due_date ? format(new Date(payment.due_date), "dd 'de' MMMM", { locale: ptBR }) : <span>Selecione a data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(payment.due_date)}
                      onSelect={(date) => {
                        if (date) {
                          onUpdate({ ...payment, due_date: date.toISOString() });
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!hideInstallments && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Parcelas</Label>
                  <Select
                    value={payment.installments.toString()}
                    onValueChange={(val) => onUpdate({ ...payment, installments: parseInt(val) })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => {
                        const installmentVal = payment.amount / n;
                        return (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x de R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        {isCard && (
          <div className="pt-2 border-t border-dashed space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Maquininha</Label>
                <Select
                  value={payment.machine_id?.toString() || "none"}
                  onValueChange={(val) => handleMachineChange(val === "none" ? null : parseInt(val))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione a maquininha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem maquininha</SelectItem>
                    {filteredMachines.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {payment.machine_id && !isDebit && !hideInstallments && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Parcelas</Label>
                  <Select
                    value={payment.installments.toString()}
                    onValueChange={(val) => onUpdate({ ...payment, installments: parseInt(val) })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: machines.find(m => m.id === payment.machine_id)?.max_installments || 1 }, (_, i) => i + 1).map(n => {
                        const r = rates.find(rateObj => rateObj.installments === n);
                        const ratePercent = r ? r.rate : 0;
                        const installmentVal = payment.amount / n;
                        return (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x de R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Taxa: {formatCardMachineRatePercent(ratePercent)}%)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {payment.machine_id && (
              <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10 space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa da maquininha ({currentRateFormatted}%):</span>
                  <span className="font-semibold text-red-500">
                    R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Líquido:</span>
                  <span className="font-bold text-green-600">
                    R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {isBoleto && (
          <div className="pt-2 border-t border-dashed flex items-start gap-2 text-[11px] text-amber-600 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>O boleto será registrado como pendente. Você poderá gerenciar as parcelas e emitir o documento após salvar a venda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
