import { useState, useEffect } from "react";
import { Landmark, CreditCard, ChevronDown, Check, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Account {
  id: number;
  name: string;
  bank_code: string | null;
  bank_name: string | null;
  account_type: string | null;
}

interface CardMachine {
  id: number;
  name: string;
  account_id: number | null;
  max_installments: number | null;
}

interface Rate {
  installments: number;
  rate: number;
}

interface AccountSelectCardProps {
  selectedAccountId: number | null;
  onAccountChange: (id: number) => void;
  selectedMachineId: number | null;
  onMachineChange: (id: number | null) => void;
  paymentMethod: string;
  totalAmount: number;
  installments: number;
  onInstallmentsChange: (n: number) => void;
}

export function AccountSelectCard({
  selectedAccountId,
  onAccountChange,
  selectedMachineId,
  onMachineChange,
  paymentMethod,
  totalAmount,
  installments,
  onInstallmentsChange
}: AccountSelectCardProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [machines, setMachines] = useState<CardMachine[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchInitialData();
    }
  }, [user?.id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile) return;

      const [accountsRes, machinesRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("company_id", profile.company_id).eq("is_active", true).order("is_main", { ascending: false }),
        supabase.from("card_machines").select("*").eq("company_id", profile.company_id).eq("is_active", true).order("name")
      ]);

      setAccounts(accountsRes.data || []);
      setMachines(machinesRes.data || []);

      // Auto-select main account if none selected
      if (!selectedAccountId && accountsRes.data && accountsRes.data.length > 0) {
        onAccountChange(accountsRes.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMachineId) {
      fetchRates(selectedMachineId);
      
      // Auto-select linked account if machine has one
      const machine = machines.find(m => m.id === selectedMachineId);
      if (machine?.account_id && machine.account_id !== selectedAccountId) {
        onAccountChange(machine.account_id);
      }
    } else {
      setRates([]);
    }
  }, [selectedMachineId]);

  const fetchRates = async (machineId: number) => {
    try {
      const { data } = await supabase
        .from("card_machine_rates")
        .select("installments, rate")
        .eq("machine_id", machineId)
        .order("installments", { ascending: true });
      setRates(data || []);
    } catch (error) {
      console.error("Error fetching rates:", error);
    }
  };

  const isCard = paymentMethod === "Crédito" || paymentMethod === "Débito";
  const currentRate = rates.find(r => r.installments === installments)?.rate || 0;
  const discountAmount = (totalAmount * currentRate) / 100;
  const netAmount = totalAmount - discountAmount;

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  return (
    <Card className="border-border/50 bg-card/50 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="h-4 w-4 text-primary" />
          <Label className="font-semibold">Destino do Recebimento</Label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Conta</Label>
            <Select 
              value={selectedAccountId?.toString()} 
              onValueChange={(val) => onAccountChange(parseInt(val))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>
                    <div className="flex items-center gap-2">
                      {acc.bank_code ? (
                        <img 
                          src={`/banks/${acc.bank_code}.svg`} 
                          alt="" 
                          className="w-4 h-4 object-contain rounded-sm"
                          onError={(e) => (e.target as any).style.display = 'none'}
                        />
                      ) : <Landmark className="h-3 w-3" />}
                      <span>{acc.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCard && (
            <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
              <Label className="text-xs text-muted-foreground">Maquininha</Label>
              <Select 
                value={selectedMachineId?.toString() || "none"} 
                onValueChange={(val) => onMachineChange(val === "none" ? null : parseInt(val))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a maquininha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem maquininha</SelectItem>
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3 w-3" />
                        <span>{m.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isCard && selectedMachineId && (
          <div className="pt-2 space-y-4 animate-in fade-in zoom-in-95">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Número de Parcelas</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: machines.find(m => m.id === selectedMachineId)?.max_installments || 1 }, (_, i) => i + 1).map(n => (
                  <Button
                    key={n}
                    type="button"
                    variant={installments === n ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 w-10 text-xs p-0",
                      installments === n && "bg-primary text-primary-foreground shadow-md"
                    )}
                    onClick={() => onInstallmentsChange(n)}
                  >
                    {n}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Taxa aplicada ({currentRate}%):</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>O valor líquido considera apenas a taxa da maquininha.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-medium text-red-500">
                  - R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-base font-bold">
                <span>Valor Líquido:</span>
                <span className="text-green-600">
                  R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
