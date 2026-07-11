// @ts-nocheck
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  Calendar,
  Clock,
  Search,
  DollarSign,
  User,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  QrCode,
  Banknote,
  CreditCard,
  Receipt,
  Landmark,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaymentBlock, SalePayment } from "@/components/vendas/PaymentBlock";
import { createTransactionFromSale } from "@/lib/stockConsumption";
import {
  reverseAllSaleTransactions,
  createBoletoInstallmentTransactions,
} from "@/lib/financialTransactions";

interface UnpaidExitedVehicle {
  id: number;
  name: string;
  client_id: number | null;
  vehicle_id: number | null;
  sale_id: number | null;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  has_exited: boolean | null;
  payment_status: string | null;
  observations: string | null;
  tag: string | null;
  discount: number | null;
  services_data?: any[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  client?: {
    id: number;
    name: string;
    phone: string;
    birth_date: string | null;
  } | null;
  vehicle?: {
    id: number;
    brand: string;
    model: string;
    plate: string | null;
    year: number | null;
  } | null;
  sale?: {
    id: number;
    total: number;
    subtotal: number;
    discount: number | null;
    is_open: boolean;
    sale_items?: {
      id: number;
      total_price: number;
      service?: {
        id: number;
        name: string;
      } | null;
    }[];
  } | null;
}

interface UnpaidExitedVehiclesProps {
  refreshTrigger?: number;
  onSpaceClick?: (space: UnpaidExitedVehicle) => void;
}

const UnpaidExitedVehicles = ({ refreshTrigger, onSpaceClick }: UnpaidExitedVehiclesProps) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<UnpaidExitedVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  const [confirmSpace, setConfirmSpace] = useState<UnpaidExitedVehicle | null>(null);
  const [payments, setPayments] = useState<SalePayment[]>([]);

  const companyId = user?.companyId;

  useEffect(() => {
    if (companyId) {
      fetchUnpaidExitedVehicles();
    }
  }, [companyId, refreshTrigger]);

  const fetchUnpaidExitedVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          *,
          client:clients(id, name, phone, birth_date, email),
          vehicle:vehicles(id, brand, model, plate, year),
          sale:sales(
            id, total, subtotal, discount, is_open,
            sale_items(
              id,
              total_price,
              service:services(id, name)
            )
          )
        `)
        .eq("company_id", companyId)
        .or("payment_status.neq.paid,payment_status.is.null")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setVehicles((data || []) as unknown as UnpaidExitedVehicle[]);
    } catch (error) {
      console.error("Erro ao buscar veículos não pagos:", error);
      toast.error("Erro ao carregar veículos não pagos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (spaceId: number, saleId: number | null, paymentsList: SalePayment[]) => {
    if (!saleId) {
      toast.error("Vaga sem venda vinculada. Abra os detalhes e exporte-a para uma venda antes de receber.");
      return;
    }

    if (paymentsList.length === 0) {
      toast.error("Por favor, adicione pelo menos uma forma de pagamento.");
      return;
    }

    // Validate accounts
    if (paymentsList.some(p => !p.account_id)) {
      toast.error("Por favor, selecione a conta de destino para todos os pagamentos.");
      return;
    }

    const totalToReceive = confirmSpace?.sale?.total || 0;
    const paymentsTotal = paymentsList.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(paymentsTotal - totalToReceive) > 0.01) {
      toast.error(`A soma dos pagamentos (R$ ${paymentsTotal.toFixed(2)}) deve ser igual ao total a receber (R$ ${totalToReceive.toFixed(2)})`);
      return;
    }

    setMarkingPaidId(spaceId);
    try {
      const hasBoleto = paymentsList.some(p => p.payment_method === "Boleto");
      const newPaymentStatus = hasBoleto ? "pending" : "paid";

      // Update space payment status
      const { error: spaceError } = await supabase
        .from("spaces")
        .update({ payment_status: newPaymentStatus })
        .eq("id", spaceId);

      if (spaceError) throw spaceError;

      // Close linked sale and update payment method info
      const finalPaymentMethod = paymentsList.length === 1
        ? paymentsList[0].payment_method
        : paymentsList.map(p => p.payment_method).filter((v, i, a) => a.indexOf(v) === i).join(" + ");

      const { error: saleError } = await supabase
        .from("sales")
        .update({ is_open: false, status: "Fechada", payment_method: finalPaymentMethod })
        .eq("id", saleId);

      if (saleError) throw saleError;

      // Clean existing payments and transactions to prevent duplicates
      await supabase.from("sale_payments").delete().eq("sale_id", saleId);
      await reverseAllSaleTransactions(saleId, "delete");

      // Fetch client details
      const { data: saleData } = await supabase
        .from('sales')
        .select('id, total, sale_date, client_id, company_id')
        .eq('id', saleId)
        .single();

      let clientName = 'Cliente';
      if (saleData?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', saleData.client_id)
          .single();
        if (clientData) clientName = clientData.name;
      }

      if (saleData && companyId) {
        const saleDateStr = saleData.sale_date;

        for (const p of paymentsList) {
          // Calculate net amount if card
          let finalNetAmount = p.amount;
          if ((p.payment_method === "Crédito" || p.payment_method === "Débito") && p.machine_id) {
            if (p.payment_method === "Débito") {
              const { data: machineData } = await supabase
                .from("card_machines")
                .select("debit_rate")
                .eq("id", p.machine_id)
                .single();
              if (machineData?.debit_rate) {
                finalNetAmount = p.amount * (1 - machineData.debit_rate / 100);
              }
            } else {
              const { data: rateData } = await supabase
                .from("card_machine_rates")
                .select("rate")
                .eq("machine_id", p.machine_id)
                .eq("installments", p.installments)
                .single();

              if (rateData) {
                finalNetAmount = p.amount * (1 - rateData.rate / 100);
              }
            }
          }


          // Insert sale payment
          await supabase.from("sale_payments").insert({
            sale_id: saleId,
            method: p.payment_method,
            amount: p.amount,
            account_id: p.account_id,
            machine_id: p.machine_id,
            installments: p.installments,
            status: p.status || 'received',
            company_id: companyId
          });

          const isBoleto = p.payment_method === "Boleto";
          if (!isBoleto) {
            await createTransactionFromSale(
              saleId,
              p.amount,
              clientName,
              p.payment_method,
              saleDateStr,
              companyId,
              p.account_id,
              p.machine_id,
              p.installments,
              finalNetAmount,
              true // isPaid
            );
          }

          // If Boleto, register installments
          if (isBoleto) {
            // Delete existing boletos if any to avoid duplication
            const { data: existingBoletos } = await supabase.from("boletos").select("id").eq("sale_id", saleId);
            if (existingBoletos && existingBoletos.length > 0) {
              const boletoIds = existingBoletos.map(eb => eb.id);
              await supabase.from("boleto_installments").delete().in("boleto_id", boletoIds);
              await supabase.from("boletos").delete().eq("sale_id", saleId);
            }

            const { data: boletoData, error: boletoError } = await supabase
              .from("boletos")
              .insert({
                sale_id: saleId,
                total_amount: p.amount,
                status: 'pending',
                company_id: companyId,
                account_id: p.account_id as number,
                client_id: saleData.client_id
              })
              .select()
              .single();

            if (boletoError) throw boletoError;

            if (boletoData) {
              const installmentsToInsert = [];
              const installmentAmount = p.amount / (p.installments || 1);

              for (let i = 1; i <= (p.installments || 1); i++) {
                const dueDate = new Date(saleDateStr + 'T12:00:00');
                dueDate.setMonth(dueDate.getMonth() + i);

                installmentsToInsert.push({
                  boleto_id: boletoData.id,
                  installment_number: i,
                  amount: installmentAmount,
                  due_date: format(dueDate, 'yyyy-MM-dd'),
                  status: 'pending'
                });
              }

              await supabase.from("boleto_installments").insert(installmentsToInsert);

              const { data: createdInstallments } = await supabase
                .from("boleto_installments")
                .select("id, installment_number, amount, due_date")
                .eq("boleto_id", boletoData.id)
                .order("installment_number");

              if (createdInstallments && createdInstallments.length > 0) {
                await createBoletoInstallmentTransactions({
                  saleId: saleId,
                  clientName: clientName,
                  saleDate: saleDateStr,
                  companyId,
                  accountId: p.account_id as number,
                  installments: createdInstallments.map(ci => ({
                    installmentNumber: ci.installment_number,
                    amount: ci.amount,
                    dueDate: ci.due_date,
                    installmentId: ci.id,
                  })),
                });
              }
            }
          }
        }
      }

      toast.success("Pagamento confirmado e transação criada! Veículo movido para aba de pagos.");
      fetchUnpaidExitedVehicles();
      setConfirmSpace(null);
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setMarkingPaidId(null);
    }
  };

  const openPaymentConfirmation = (space: UnpaidExitedVehicle) => {
    setConfirmSpace(space);
    setPayments([
      {
        tempId: Math.random().toString(36).substr(2, 9),
        payment_method: "Pix",
        amount: space.sale ? space.sale.total : 0,
        account_id: null,
        machine_id: null,
        installments: 1,
        due_date: new Date().toISOString(),
        status: 'received'
      }
    ]);
  };

  const handleConfirmPayment = () => {
    if (!confirmSpace) return;
    handleMarkAsPaid(confirmSpace.id, confirmSpace.sale_id, payments);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.client?.name?.toLowerCase().includes(term) ||
      v.vehicle?.brand?.toLowerCase().includes(term) ||
      v.vehicle?.model?.toLowerCase().includes(term) ||
      v.vehicle?.plate?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Veículos Não Pagos
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredVehicles.length} registro(s)
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, veículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de veículos */}
      {filteredVehicles.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum veículo encontrado com esse termo"
                : "Nenhum veículo não pago"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVehicles.map((space) => (
            <Card
              key={space.id}
              className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors border-l-4 border-l-warning cursor-pointer"
              onClick={() => onSpaceClick?.(space)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Cliente */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-info shrink-0" />
                      <span className="font-medium text-sm sm:text-base leading-snug">
                        {space.client?.name || "Cliente não informado"}
                      </span>
                    </div>

                    {/* Veículo */}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {space.vehicle
                          ? `${space.vehicle.brand} ${space.vehicle.model} - ${space.vehicle.plate || "Sem placa"}`
                          : "Veículo não informado"}
                      </span>
                    </div>

                    {/* Datas */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-0">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Entrada: {formatDate(space.entry_date)}{" "}
                        {space.entry_time && `às ${space.entry_time.slice(0, 5)}`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Saída: {formatDate(space.exit_date)}{" "}
                        {space.exit_time && `às ${space.exit_time.slice(0, 5)}`}
                      </span>
                    </div>

                    {/* Observações */}
                    {space.observations && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border/40 sm:border-0 sm:pt-0">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {space.observations}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status e Valor */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/40 shrink-0">
                    <div className="flex flex-col sm:items-end">
                      <Badge className="bg-warning/20 text-warning border-warning/30 w-fit mb-1 px-1.5 py-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Não Pago
                      </Badge>
                      {space.sale && (
                        <span className="text-base sm:text-lg font-bold text-warning flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          R$ {space.sale.total.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success/30 hover:bg-success/10 self-center sm:self-auto h-10 sm:h-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPaymentConfirmation(space);
                      }}
                      disabled={markingPaidId === space.id}
                    >
                      {markingPaidId === space.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Marcar como Pago
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmação de pagamento */}
      <Dialog open={!!confirmSpace} onOpenChange={(open) => !open && setConfirmSpace(null)}>
        <DialogContent className="w-[95vw] max-w-xl rounded-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Confirmar Pagamento
            </DialogTitle>
            <DialogDescription>
              Confirme as formas de pagamento antes de registrar o recebimento.
            </DialogDescription>
          </DialogHeader>

          {confirmSpace && (
            <div className="space-y-5 py-2">
              {/* Resumo da vaga */}
              <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-info" />
                  <span className="font-medium">{confirmSpace.client?.name || "Cliente não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>
                    {confirmSpace.vehicle
                      ? `${confirmSpace.vehicle.brand} ${confirmSpace.vehicle.model} - ${confirmSpace.vehicle.plate || "Sem placa"}`
                      : "Veículo não informado"}
                  </span>
                </div>
                {confirmSpace.sale && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Total a receber:</span>
                    <span className="text-lg font-bold text-success">
                      R$ {confirmSpace.sale.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Seção de Pagamentos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Pagamentos</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      const totalToReceive = confirmSpace?.sale?.total || 0;
                      const currentPaid = payments.reduce((acc, curr) => acc + curr.amount, 0);
                      const remaining = Math.max(0, totalToReceive - currentPaid);
                      setPayments([...payments, {
                        tempId: Math.random().toString(36).substr(2, 9),
                        payment_method: "Pix",
                        amount: remaining,
                        account_id: payments[0]?.account_id || null,
                        machine_id: null,
                        installments: 1,
                        due_date: new Date().toISOString(),
                        status: 'received'
                      }]);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Forma
                  </Button>
                </div>

                <div className="space-y-3">
                  {payments.map((p, index) => (
                    <PaymentBlock
                      key={p.tempId}
                      payment={p}
                      isFirst={index === 0}
                      companyId={companyId || 0}
                      totalRemaining={confirmSpace?.sale ? confirmSpace.sale.total - payments.reduce((acc, curr, i) => i < index ? acc + curr.amount : acc, 0) : 0}
                      onUpdate={(updated) => setPayments(payments.map(item => item.tempId === p.tempId ? updated : item))}
                      onRemove={() => setPayments(payments.filter(item => item.tempId !== p.tempId))}
                    />
                  ))}
                </div>

                {(() => {
                  const totalToReceive = confirmSpace?.sale?.total || 0;
                  const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0);
                  const diff = paidTotal - totalToReceive;
                  const isBalanced = Math.abs(diff) < 0.01;
                  const isExcess = diff > 0.01;
                  const isShort = diff < -0.01;

                  return (
                    <div className={cn(
                      "p-3 rounded-lg text-sm font-medium space-y-1 border",
                      isBalanced
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : isExcess
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      <div className="flex justify-between items-center">
                        <span>Total Pago: R$ {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>Total Venda: R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmSpace(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-white gap-2"
              onClick={handleConfirmPayment}
              disabled={markingPaidId === confirmSpace?.id}
            >
              {markingPaidId === confirmSpace?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnpaidExitedVehicles;
