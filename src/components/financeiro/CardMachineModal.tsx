import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Percent, CreditCard, Clock, Calendar as CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rate {
  installments: number;
  rate: number;
}

interface CardMachineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId?: number | null;
  onSuccess: () => void;
}

interface MachineFormData {
  name: string;
  account_id: string;
  machine_type: "credit" | "debit" | "both";
  max_installments: number;
  is_anticipated: boolean;
  anticipation_type: "hours" | "days";
  anticipation_value: number;
  debit_rate: number;
  is_active: boolean;
}

export function CardMachineModal({ open, onOpenChange, machineId, onSuccess }: CardMachineModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  // Texto digitado em cada input de taxa (evita que o React apague a vírgula durante a digitação)
  const [rateInputs, setRateInputs] = useState<Map<number, string>>(new Map());
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<MachineFormData>({
    defaultValues: {
      name: "",
      account_id: "none",
      machine_type: "credit",
      max_installments: 12,
      is_anticipated: false,
      anticipation_type: "days",
      anticipation_value: 1,
      debit_rate: 0,
      is_active: true
    }
  });

  const isAnticipated = watch("is_anticipated");
  const anticipationType = watch("anticipation_type");
  const maxInstallments = watch("max_installments");
  const machineType = watch("machine_type");

  useEffect(() => {
    if (open) {
      fetchAccounts();
      if (machineId) {
        fetchMachineData();
      } else {
        reset({
          name: "",
          account_id: "none",
          machine_type: "credit",
          max_installments: 12,
          is_anticipated: false,
          anticipation_type: "days",
          anticipation_value: 1,
          debit_rate: 0,
          is_active: true
        });
        // Initialize default rates (0%)
        const initialRates = Array.from({ length: 12 }, (_, i) => ({
          installments: i + 1,
          rate: 0
        }));
        setRates(initialRates);
        setRateInputs(new Map(initialRates.map(r => [r.installments, ""])));
      }
    }
  }, [open, machineId]);

  // Adjust rates array when maxInstallments changes
  useEffect(() => {
    const currentMax = rates.length;
    if (maxInstallments > currentMax) {
      const newRates = [...rates];
      for (let i = currentMax + 1; i <= maxInstallments; i++) {
        newRates.push({ installments: i, rate: 0 });
      }
      setRates(newRates);
    } else if (maxInstallments < currentMax) {
      setRates(rates.slice(0, maxInstallments));
    }
  }, [maxInstallments]);

  const fetchAccounts = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchMachineData = async () => {
    setFetching(true);
    try {
      const { data: machine, error: mError } = await supabase
        .from("card_machines")
        .select("*")
        .eq("id", machineId)
        .single();

      if (mError) throw mError;

      reset({
        name: machine.name,
        account_id: machine.account_id?.toString() || "none",
        machine_type: machine.machine_type || "credit",
        max_installments: machine.max_installments || 12,
        is_anticipated: machine.is_anticipated || false,
        anticipation_type: (machine.anticipation_type as any) || "days",
        anticipation_value: machine.anticipation_value || 1,
        debit_rate: machine.debit_rate || 0,
        is_active: machine.is_active ?? true
      });

      const { data: ratesData, error: rError } = await supabase
        .from("card_machine_rates")
        .select("installments, rate")
        .eq("machine_id", machineId)
        .order("installments", { ascending: true });

      if (rError) throw rError;

      // Ensure we have rates for all installments up to max_installments
      const fullRates = Array.from({ length: machine.max_installments || 12 }, (_, i) => {
        const existing = ratesData?.find(r => r.installments === i + 1);
        return existing || { installments: i + 1, rate: 0 };
      });
      
      setRates(fullRates);
      setRateInputs(new Map(fullRates.map(r => [r.installments, r.rate ? r.rate.toString().replace(".", ",") : ""])));
    } catch (error) {
      console.error("Error fetching machine data:", error);
      toast.error("Erro ao carregar dados da maquininha");
    } finally {
      setFetching(false);
    }
  };

  const handleRateInputChange = (installments: number, value: string) => {
    // Aceita apenas dígitos, vírgula e ponto
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setRateInputs(prev => new Map(prev).set(installments, sanitized));
    const numValue = parseFloat(sanitized.replace(",", ".")) || 0;
    setRates(prev => prev.map(r =>
      r.installments === installments ? { ...r, rate: numValue } : r
    ));
  };

  const handleRateInputBlur = (installments: number) => {
    // Ao sair do campo, normaliza o texto para o valor numérico armazenado
    const rate = rates.find(r => r.installments === installments);
    if (rate !== undefined) {
      setRateInputs(prev => new Map(prev).set(installments, rate.rate ? rate.rate.toString().replace(".", ",") : ""));
    }
  };

  const onSubmit = async (data: MachineFormData) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const isDebitOnly = data.machine_type === "debit";
      const isCredit = data.machine_type === "credit" || data.machine_type === "both";
      const isDebit = data.machine_type === "debit" || data.machine_type === "both";

      const machinePayload = {
        company_id: profile.company_id,
        name: data.name,
        account_id: (data.account_id && data.account_id !== "none") ? parseInt(data.account_id) : null,
        machine_type: data.machine_type,
        max_installments: isCredit ? data.max_installments : 1,
        is_anticipated: isCredit ? data.is_anticipated : false,
        anticipation_type: isCredit && data.is_anticipated ? data.anticipation_type : null,
        anticipation_value: isCredit && data.is_anticipated ? data.anticipation_value : null,
        debit_rate: isDebit ? data.debit_rate : 0,
        is_active: data.is_active
      };

      let currentMachineId = machineId;

      if (machineId) {
        const { error } = await supabase
          .from("card_machines")
          .update(machinePayload)
          .eq("id", machineId);
        if (error) throw error;
      } else {
        const { data: newMachine, error } = await supabase
          .from("card_machines")
          .insert(machinePayload)
          .select()
          .single();
        if (error) throw error;
        currentMachineId = newMachine.id;
      }

      // Upsert rates
      // First delete existing rates to avoid conflicts or leftovers if max_installments decreased
      const { error: delError } = await supabase
        .from("card_machine_rates")
        .delete()
        .eq("machine_id", currentMachineId);
      
      if (delError) throw delError;

      // For debit ONLY machines, we don't need to insert card_machine_rates anymore
      // We rely on debit_rate column in card_machines.
      // But for backward compatibility or ease, let's just use the debit_rate column directly
      // and only insert credit rates into card_machine_rates if it's credit or both.
      if (isCredit) {
        const ratesPayload = rates.map(r => ({
          company_id: profile.company_id,
          machine_id: currentMachineId,
          installments: r.installments,
          rate: r.rate
        }));

        const { error: ratesError } = await supabase
          .from("card_machine_rates")
          .insert(ratesPayload);

        if (ratesError) throw ratesError;
      }

      toast.success(machineId ? "Maquininha atualizada!" : "Maquininha cadastrada!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving card machine:", error);
      toast.error(error.message || "Erro ao salvar maquininha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {machineId ? "Editar Maquininha" : "Nova Maquininha"}
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form id="card-machine-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Maquininha</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Getnet, Stone, PagSeguro" 
                  {...register("name", { required: "Nome é obrigatório" })}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Conta de Recebimento</Label>
                <Select 
                  value={watch("account_id")} 
                  onValueChange={(val) => setValue("account_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta vinculada</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Maquininha: Crédito ou Débito */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tipo de Maquininha</Label>
              <div className="flex p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant={machineType === "credit" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 text-sm gap-2"
                  onClick={() => setValue("machine_type", "credit")}
                >
                  <CreditCard className="h-4 w-4" />
                  Crédito
                </Button>
                <Button
                  type="button"
                  variant={machineType === "debit" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 text-sm gap-2"
                  onClick={() => {
                    setValue("machine_type", "debit");
                    setValue("max_installments", 1);
                    setValue("is_anticipated", false);
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  Débito
                </Button>
                <Button
                  type="button"
                  variant={machineType === "both" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-9 text-sm gap-2"
                  onClick={() => setValue("machine_type", "both")}
                >
                  <CreditCard className="h-4 w-4" />
                  Ambos
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(machineType === "credit" || machineType === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="max_installments">Máximo de Parcelas</Label>
                  <Input 
                    id="max_installments" 
                    type="number" 
                    min={1} 
                    max={24}
                    {...register("max_installments", { valueAsNumber: true })}
                  />
                </div>
              )}

              <div className={cn(
                "flex items-center justify-between p-3 border rounded-lg bg-muted/30",
                machineType === "debit" && "col-span-full"
              )}>
                <div className="space-y-0.5">
                  <Label>Maquininha Ativa</Label>
                  <p className="text-[10px] text-muted-foreground">Disponível para novos pagamentos</p>
                </div>
                <Switch 
                  checked={watch("is_active")} 
                  onCheckedChange={(val) => setValue("is_active", val)} 
                />
              </div>
            </div>

            {/* --- DÉBITO: apenas taxa única --- */}
            {(machineType === "debit" || machineType === "both") && (
              <div className="space-y-4 p-4 border rounded-xl bg-primary/5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Taxa no Débito</Label>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-2">
                  Toda venda no débito será em 1x com essa taxa aplicada.
                </p>
                <div className="max-w-[200px]">
                  <div className="relative">
                    <Input 
                      className="pr-6 text-sm"
                      value={watch("debit_rate") ? watch("debit_rate").toString().replace(".", ",") : ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(",", ".")) || 0;
                        setValue("debit_rate", val);
                      }}
                      placeholder="0,00"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- CRÉDITO: antecipação + taxas por parcela --- */}
            {(machineType === "credit" || machineType === "both") && (
              <>
                <div className="space-y-4 p-4 border rounded-xl bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Label className="text-base font-semibold">Antecipação Automática</Label>
                    </div>
                    <Switch 
                      checked={isAnticipated} 
                      onCheckedChange={(val) => setValue("is_anticipated", val)} 
                    />
                  </div>

                  {isAnticipated ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Tipo de Prazo</Label>
                        <div className="flex p-1 bg-muted rounded-lg">
                          <Button
                            type="button"
                            variant={anticipationType === "hours" ? "default" : "ghost"}
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => setValue("anticipation_type", "hours")}
                          >
                            <Clock className="h-3 w-3 mr-1" /> Horas
                          </Button>
                          <Button
                            type="button"
                            variant={anticipationType === "days" ? "default" : "ghost"}
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => setValue("anticipation_type", "days")}
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" /> Dias
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor do Prazo</Label>
                        {anticipationType === "hours" ? (
                          <Select 
                            value={watch("anticipation_value").toString()} 
                            onValueChange={(val) => setValue("anticipation_value", parseInt(val))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hora</SelectItem>
                              <SelectItem value="2">2 horas</SelectItem>
                              <SelectItem value="24">24 horas</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            type="number" 
                            min={1} 
                            max={31}
                            {...register("anticipation_value", { valueAsNumber: true })}
                            placeholder="Ex: 1 dia"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Prazo de Recebimento Padrão (Dias úteis)</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min={0} 
                            max={60}
                            {...register("anticipation_value", { valueAsNumber: true })}
                            placeholder="Ex: 30"
                            className="max-w-[120px]"
                          />
                          <span className="text-sm text-muted-foreground">dias (D+X)</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Prazo padrão para recebimento de vendas no crédito sem antecipação.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Percent className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold">Taxas por Parcela</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {rates.map((rate) => (
                      <div key={rate.installments} className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase">{rate.installments}x</Label>
                        <div className="relative">
                          <Input 
                            className="pr-6 text-sm"
                            value={rateInputs.get(rate.installments) ?? (rate.rate ?? 0).toString().replace(".", ",")}
                            onChange={(e) => handleRateInputChange(rate.installments, e.target.value)}
                            onBlur={() => handleRateInputBlur(rate.installments)}
                            placeholder="0,00"
                            inputMode="decimal"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </form>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button form="card-machine-form" type="submit" disabled={loading || fetching}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {machineId ? "Salvar Alterações" : "Cadastrar Maquininha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
