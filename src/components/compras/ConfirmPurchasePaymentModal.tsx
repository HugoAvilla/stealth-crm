import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus, Check, Loader2 } from "lucide-react";
import { PaymentBlock, SalePayment } from "@/components/vendas/PaymentBlock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConfirmPurchasePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installmentAmount: number;
  companyId: number;
  defaultAccountId: number | null;
  purchasePaymentMethod: string;
  onConfirm: (payments: SalePayment[]) => Promise<void>;
}

export function ConfirmPurchasePaymentModal({
  open,
  onOpenChange,
  installmentAmount,
  companyId,
  defaultAccountId,
  purchasePaymentMethod,
  onConfirm
}: ConfirmPurchasePaymentModalProps) {
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [isPaying, setIsPaying] = useState(false);

  // Inicializar o pagamento com o valor da parcela e conta padrão da compra
  useEffect(() => {
    if (open) {
      setPayments([
        {
          tempId: Math.random().toString(36).substring(2, 9),
          payment_method: "Boleto",
          amount: installmentAmount,
          account_id: defaultAccountId,
          machine_id: null,
          installments: 1,
          due_date: new Date().toISOString(),
          status: 'received'
        }
      ]);
    }
  }, [open, installmentAmount, defaultAccountId, purchasePaymentMethod]);

  const handleAddPayment = () => {
    const paidTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const remaining = Math.max(0, installmentAmount - paidTotal);

    setPayments([
      ...payments,
      {
        tempId: Math.random().toString(36).substring(2, 9),
        payment_method: "Boleto",
        amount: remaining,
        account_id: payments[0]?.account_id || defaultAccountId,
        machine_id: null,
        installments: 1,
        due_date: new Date().toISOString(),
        status: 'received'
      }
    ]);
  };

  const handleUpdatePayment = (updated: SalePayment) => {
    setPayments(payments.map(item => item.tempId === updated.tempId ? updated : item));
  };

  const handleRemovePayment = (tempId: string) => {
    setPayments(payments.filter(item => item.tempId !== tempId));
  };

  const handleConfirm = async () => {
    if (payments.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }

    if (payments.some(p => !p.account_id)) {
      toast.error("Selecione a conta para todos os pagamentos");
      return;
    }

    const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(paidTotal - installmentAmount) > 0.01) {
      toast.error(
        `O valor total pago (R$ ${paidTotal.toFixed(2)}) deve ser igual ao valor da parcela (R$ ${installmentAmount.toFixed(2)})`
      );
      return;
    }

    setIsPaying(true);
    try {
      await onConfirm(payments);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
    } finally {
      setIsPaying(false);
    }
  };

  const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0);
  const diff = paidTotal - installmentAmount;
  const isBalanced = Math.abs(diff) < 0.01;
  const isExcess = diff > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl rounded-lg max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <DollarSign className="h-5 w-5 text-green-500" />
            Confirmar Pagamento
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Confirme as formas de pagamento antes de registrar o recebimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Seção de Pagamentos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Pagamentos</Label>
            </div>

            <div className="space-y-3">
              {payments.map((p, index) => (
                <PaymentBlock
                  key={p.tempId}
                  payment={p}
                  isFirst={index === 0}
                  companyId={companyId}
                  totalRemaining={installmentAmount - payments.reduce((acc, curr, i) => i < index ? acc + curr.amount : acc, 0)}
                  onUpdate={handleUpdatePayment}
                  onRemove={() => handleRemovePayment(p.tempId)}
                  removePaymentMethod={true}
                  hideInstallments={true}
                />
              ))}
            </div>

            {/* Resumo do total pago vs total da parcela */}
            <div className={cn(
              "p-3 rounded-lg text-sm font-medium space-y-1 border",
              isBalanced
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : isExcess
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              <div className="flex justify-between items-center">
                <span>Total Pago: R$ {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span>Total Parcela: R$ {installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {!isBalanced && (
                <div className={cn(
                  "text-xs pt-1 border-t flex items-center gap-1.5",
                  isExcess ? "border-amber-500/20" : "border-red-500/20"
                )}>
                  {isExcess ? (
                    <span>⚠ Valor superior em <strong>R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  ) : (
                    <span>⚠ Restam <strong>R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para concluir</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 justify-end sm:justify-end">
          <Button variant="outline" className="border-border" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-600/90 text-white gap-2"
            onClick={handleConfirm}
            disabled={isPaying}
          >
            {isPaying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
