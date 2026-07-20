import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { payInstallment, reverseInstallment } from "@/pages/Compras/services/purchaseService";
import { toast } from "sonner";

interface MonthBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  onSuccess?: () => void;
}

interface InstallmentWithPurchase {
  id: number;
  purchase_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: "pendente" | "paga";
  paid_at: string | null;
  purchases: {
    supplier_name_snapshot: string;
    installments_count: number;
  };
}

export function MonthBillsModal({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: MonthBillsModalProps) {
  const [installments, setInstallments] = useState<InstallmentWithPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchMonthBills = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("purchase_installments")
        .select(`
          id, purchase_id, installment_number, amount, due_date, status, paid_at,
          purchases!inner (
            supplier_name_snapshot,
            installments_count,
            company_id
          )
        `)
        .eq("purchases.company_id", companyId)
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setInstallments((data as any) || []);
    } catch (error) {
      console.error("[MonthBillsModal] Error fetching monthly bills:", error);
      toast.error("Erro ao carregar contas do mês");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMonthBills();
    }
  }, [open, companyId]);

  const handlePay = async (id: number) => {
    setProcessingId(id);
    try {
      const ok = await payInstallment(id);
      if (ok) {
        toast.success("Parcela marcada como paga!");
        await fetchMonthBills();
        onSuccess?.();
      } else {
        toast.error("Erro ao pagar parcela");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar pagamento");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReverse = async (id: number) => {
    setProcessingId(id);
    try {
      const ok = await reverseInstallment(id);
      if (ok) {
        toast.success("Pagamento estornado com sucesso!");
        await fetchMonthBills();
        onSuccess?.();
      } else {
        toast.error("Erro ao estornar parcela");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar estorno");
    } finally {
      setProcessingId(null);
    }
  };

  const currentMonthName = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Compromissos de {currentMonthName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Listagem de todas as parcelas com vencimento no mês corrente.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Carregando compromissos...
            </div>
          ) : installments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/10">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/60" />
              <p className="text-sm font-semibold text-foreground">Tudo limpo!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma conta a pagar encontrada para este mês.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {installments.map((inst) => {
                const isPaid = inst.status === "paga";
                const isOverdue = !isPaid && inst.due_date < format(new Date(), "yyyy-MM-dd");
                const isProcessing = processingId === inst.id;

                return (
                  <div
                    key={inst.id}
                    className={cn(
                      "flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 rounded-lg border transition-all gap-4",
                      isPaid
                        ? "bg-green-500/5 border-green-500/20"
                        : isOverdue
                          ? "bg-red-500/5 border-red-500/20 animate-pulse-subtle"
                          : "bg-card border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {/* Informações da Conta */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate text-foreground">
                          {inst.purchases?.supplier_name_snapshot}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                          Parcela {inst.installment_number}/{inst.purchases?.installments_count}
                        </Badge>
                        {isPaid ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/10 text-[9px] py-0 px-1.5">
                            Paga
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1.5 animate-pulse">
                            Atrasada
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Vence em: {format(parseISO(inst.due_date), "dd/MM/yyyy")}
                        </span>
                        {isPaid && inst.paid_at && (
                          <span className="text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pago em: {format(parseISO(inst.paid_at), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preço e Botão de Ação */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                          Valor
                        </span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          R$ {inst.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="w-24 flex justify-end">
                        {isPaid ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-red-500/30 text-red-500 hover:bg-red-500/10 w-full"
                            onClick={() => handleReverse(inst.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Estornar"
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white w-full"
                            onClick={() => handlePay(inst.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Pagar"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
