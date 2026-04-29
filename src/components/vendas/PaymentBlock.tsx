import { useState, useEffect } from "react";
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
}

const PAYMENT_METHODS = [
  { id: "Pix", label: "Pix", icon: QrCode },
  { id: "Dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "Crédito", label: "Cartão de Crédito", icon: CreditCard },
  { id: "Débito", label: "Cartão de Débito", icon: CreditCard },
  { id: "Boleto", label: "Boleto", icon: Receipt },
  { id: "Transferência", label: "Transferência", icon: Landmark },
];

export function PaymentBlock({ 
  payment, 
  onUpdate, 
  onRemove, 
  totalRemaining, 
  companyId,
  isFirst 
}: PaymentBlockProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);

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
  const isBoleto = payment.payment_method === "Boleto";

  const handleMachineChange = (id: number | null) => {
    const machine = machines.find(m => m.id === id);
    onUpdate({ 
      ...payment, 
      machine_id: id, 
      account_id: machine?.account_id || payment.account_id,
      installments: 1
    });
  };

  const currentRate = rates.find(r => r.installments === payment.installments)?.rate || 0;
  const netAmount = payment.amount * (1 - currentRate / 100);

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden bg-card/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma</Label>
            <Select 
              value={payment.payment_method} 
              onValueChange={(val) => onUpdate({ ...payment, payment_method: val })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
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

          <div className="w-32 sm:w-40 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                type="number" 
                step="0.01"
                value={payment.amount}
                onChange={(e) => onUpdate({ ...payment, amount: parseFloat(e.target.value) || 0 })}
                className="pl-8 h-10 font-semibold"
              />
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          src={`/banks/${acc.bank_code}.svg`} 
                          alt="" 
                          className="w-3.5 h-3.5 object-contain"
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

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Data / Vencimento</Label>
            <Popover>
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
                  onSelect={(date) => date && onUpdate({ ...payment, due_date: date.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
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
                    {machines.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {payment.machine_id && (
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
                      {Array.from({ length: machines.find(m => m.id === payment.machine_id)?.max_installments || 1 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {payment.machine_id && (
              <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Líquido (Taxa {currentRate}%):</span>
                <span className="font-bold text-green-600">
                  R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
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
