import { useEffect, useState } from "react";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface InstallmentDraft {
  installmentNumber: number;
  amount: number;
  dueDate: string;
}

interface InstallmentGeneratorProps {
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: string;
  installments: InstallmentDraft[];
  onChange: (installments: InstallmentDraft[]) => void;
}

export function InstallmentGenerator({
  totalAmount,
  installmentsCount,
  firstDueDate,
  installments,
  onChange,
}: InstallmentGeneratorProps) {
  const [localErrors, setLocalErrors] = useState<string | null>(null);

  // Efeito para gerar as parcelas iniciais quando as dependências básicas mudam
  useEffect(() => {
    if (totalAmount <= 0 || installmentsCount <= 0 || !firstDueDate) {
      onChange([]);
      return;
    }

    const baseAmount = Math.floor((totalAmount / installmentsCount) * 100) / 100;
    const generated: InstallmentDraft[] = [];
    const baseDate = parseISO(firstDueDate);

    let sum = 0;
    for (let i = 0; i < installmentsCount; i++) {
      const isLast = i === installmentsCount - 1;
      const installmentDate = addMonths(baseDate, i);
      const installmentDateStr = format(installmentDate, "yyyy-MM-dd");

      let amount = baseAmount;
      if (isLast) {
        // A última parcela recebe o residual
        amount = Math.round((totalAmount - sum) * 100) / 100;
      } else {
        sum += baseAmount;
      }

      generated.push({
        installmentNumber: i + 1,
        amount: amount,
        dueDate: installmentDateStr,
      });
    }

    onChange(generated);
  }, [totalAmount, installmentsCount, firstDueDate]);

  // Efeito para validar a soma das parcelas
  useEffect(() => {
    if (installments.length === 0) {
      setLocalErrors(null);
      return;
    }

    const sum = installments.reduce((acc, inst) => acc + Number(inst.amount), 0);
    const difference = Math.round((totalAmount - sum) * 100) / 100;

    if (Math.abs(difference) > 0.01) {
      setLocalErrors(
        `A soma das parcelas (R$ ${sum.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}) difere do valor total (R$ ${totalAmount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}). Diferença: R$ ${difference.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`
      );
    } else {
      setLocalErrors(null);
    }
  }, [installments, totalAmount]);

  const handleAmountChange = (index: number, newAmountStr: string) => {
    const updated = [...installments];
    const cleanStr = newAmountStr.replace(",", ".");
    const newAmount = Number(cleanStr);
    
    if (!isNaN(newAmount)) {
      updated[index] = {
        ...updated[index],
        amount: newAmount,
      };
      onChange(updated);
    }
  };

  const handleDateChange = (index: number, newDateStr: string) => {
    const updated = [...installments];
    updated[index] = {
      ...updated[index],
      dueDate: newDateStr,
    };
    onChange(updated);
  };

  // Restaura e divide de forma igual com residual no final
  const handleRecalculateEqually = () => {
    const baseAmount = Math.floor((totalAmount / installments.length) * 100) / 100;
    const updated = installments.map((inst, i) => {
      const isLast = i === installments.length - 1;
      let amount = baseAmount;
      if (isLast) {
        const sum = baseAmount * (installments.length - 1);
        amount = Math.round((totalAmount - sum) * 100) / 100;
      }
      return {
        ...inst,
        amount: amount,
      };
    });
    onChange(updated);
  };

  if (installments.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h4 className="text-sm font-semibold text-foreground">Distribuição das Parcelas</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={handleRecalculateEqually}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Dividir Igualmente
        </Button>
      </div>

      {localErrors && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{localErrors}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto pr-1 py-1 scrollbar-thin">
        {installments.map((inst, index) => (
          <div
            key={inst.installmentNumber}
            className="flex flex-col p-3 rounded-lg border border-border bg-card/40 hover:bg-card/75 transition-colors gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase">
                Parcela {inst.installmentNumber}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {inst.dueDate ? format(parseISO(inst.dueDate), "MMM/yyyy", { locale: ptBR }) : ""}
              </span>
            </div>

            <div className="space-y-3 mt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground">Vencimento</span>
                <div className="relative">
                  <Input
                    type="date"
                    value={inst.dueDate}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    className="h-8 text-xs px-2 [color-scheme:dark] w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground">Valor (R$)</span>
                <Input
                  type="text"
                  value={inst.amount}
                  onChange={(e) => handleAmountChange(index, e.target.value)}
                  placeholder="0,00"
                  className="h-8 text-xs font-mono font-medium px-2 w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
