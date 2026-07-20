// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreVertical,
  Check,
  RotateCcw,
  User,
  Car,
  Plus,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Skeleton } from "@/components/ui/skeleton";
import { settleTransaction, reverseTransaction } from "@/lib/financialTransactions";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import SaleDetailsModal from "@/pages/Vendas/components/SaleDetailsModal";
import { SaleWithDetails } from "@/types/sales";
import { PaymentBlock, SalePayment } from "@/pages/Vendas/components/PaymentBlock";




interface BoletoManagementProps {
  accountId?: number | null;
  onRefreshRequired?: () => void;
}

interface BoletoRow {
  id: number;
  sale_id: number;
  total_amount: number;
  status: string;
  created_at: string;
  account_id: number;
  account_name: string;
  client_id: number | null;
  company_id: number;
  client_name: string;
  installments_count: number;
}

interface Installment {
  id: number;
  boleto_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number | null;
  payment_date: string | null;
  transaction_id: number | null;
}

export function BoletoManagement({ accountId, onRefreshRequired }: BoletoManagementProps) {
  const { user } = useAuth();
  const [boletos, setBoletos] = useState<BoletoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBoleto, setExpandedBoleto] = useState<number | null>(null);
  const [installments, setInstallments] = useState<Record<number, Installment[]>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);

  // States for payment confirmation and revert
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [selectedBoletoRow, setSelectedBoletoRow] = useState<BoletoRow | null>(null);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());



  useEffect(() => {
    if (user?.id) fetchBoletos();
  }, [user?.id, accountId]);

  const fetchBoletos = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile) return;
      setCompanyId(profile.company_id);

      // Build query - fetch boletos with client info via join
      let query = supabase
        .from("boletos")
        .select(`
          id,
          sale_id,
          total_amount,
          status,
          created_at,
          account_id,
          client_id,
          company_id,
          clients (
            name
          ),
          accounts (
            name
          )
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      // We removed the accountId filter so the user can see ALL boletos across all accounts
      // if (accountId) {
      //   query = query.eq("account_id", accountId);
      // }

      const { data, error } = await query;

      if (error) throw error;

      // Now fetch installment counts for each boleto
      const boletoIds = (data || []).map(b => b.id);
      let installmentCounts: Record<number, number> = {};

      if (boletoIds.length > 0) {
        const { data: installData } = await supabase
          .from("boleto_installments")
          .select("boleto_id")
          .in("boleto_id", boletoIds);

        if (installData) {
          installData.forEach(inst => {
            installmentCounts[inst.boleto_id] = (installmentCounts[inst.boleto_id] || 0) + 1;
          });
        }
      }

      // Map to proper structure
      const mappedBoletos: BoletoRow[] = (data || []).map(b => ({
        id: b.id,
        sale_id: b.sale_id,
        total_amount: b.total_amount,
        status: b.status,
        created_at: b.created_at,
        account_id: b.account_id,
        account_name: (b.accounts as any)?.name || 'Conta N/A',
        client_id: b.client_id,
        company_id: b.company_id,
        client_name: (b.clients as any)?.name || 'Cliente N/A',
        installments_count: installmentCounts[b.id] || 0,
      }));

      setBoletos(mappedBoletos);
    } catch (error) {
      logger.error("Error fetching boletos:", error);
      toast.error("Erro ao carregar boletos");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (boletoId: number) => {
    try {
      const { data, error } = await supabase
        .from("boleto_installments")
        .select("id, boleto_id, installment_number, amount, due_date, status, paid_amount, payment_date, transaction_id")
        .eq("boleto_id", boletoId)
        .order("installment_number");

      if (error) throw error;
      setInstallments(prev => ({ ...prev, [boletoId]: data || [] }));
    } catch (error) {
      logger.error("Error fetching installments:", error);
      setInstallments(prev => ({ ...prev, [boletoId]: [] }));
      toast.error("Erro ao carregar parcelas do boleto. Verifique se a estrutura do banco está atualizada.");
    }
  };


  const toggleExpand = (boletoId: number) => {
    if (expandedBoleto === boletoId) {
      setExpandedBoleto(null);
    } else {
      setExpandedBoleto(boletoId);
      if (!installments[boletoId]) {
        fetchInstallments(boletoId);
      }
    }
  };

  const handleOpenSaleDetails = async (saleId: number) => {
    setLoadingSaleId(saleId);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, year, plate, size),
          sale_items(
            id, service_id, quantity, unit_price, total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq("id", saleId)
        .single();

      if (error) {
        console.error("Error fetching sale details:", error);
        toast.error("Erro ao buscar detalhes da venda");
        return;
      }

      if (data) {
        const saleDetails: SaleWithDetails = {
          id: data.id,
          client_id: data.client_id,
          vehicle_id: data.vehicle_id,
          sale_date: data.sale_date,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          payment_method: data.payment_method,
          status: data.status,
          is_open: data.is_open,
          observations: data.observations,
          created_at: data.created_at,
          client: data.client,
          vehicle: data.vehicle,
          sale_items: data.sale_items || [],
        };
        setSelectedSaleDetails(saleDetails);
      }
    } catch (err) {
      console.error("Error fetching sale details:", err);
      toast.error("Erro inesperado ao buscar detalhes da venda");
    } finally {
      setLoadingSaleId(null);
    }
  };


  const updateInstallmentStatus = async (inst: Installment, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'paid') {
        updateData.payment_date = format(new Date(), 'yyyy-MM-dd');
        updateData.paid_amount = inst.amount;
      } else {
        updateData.payment_date = null;
        updateData.paid_amount = null;
      }

      const { error } = await supabase
        .from("boleto_installments")
        .update(updateData)
        .eq("id", inst.id);

      if (error) throw error;

      // === Liquidar/reverter transação vinculada ===
      if (inst.transaction_id) {
        if (newStatus === 'paid') {
          await settleTransaction({
            transactionId: inst.transaction_id,
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            paidAmount: inst.amount,
          });
        } else {
          // Reverter: marcar transação como não-paga
          await reverseTransaction(inst.transaction_id, 'unpay');
        }
      }

      toast.success("Status atualizado");
      fetchInstallments(inst.boleto_id);

      // Check if all installments are paid and update boleto status
      const { data: allInstallments } = await supabase
        .from("boleto_installments")
        .select("status")
        .eq("boleto_id", inst.boleto_id);

      if (allInstallments) {
        const allPaid = allInstallments.every(i => i.status === 'paid');
        if (allPaid) {
          await supabase
            .from("boletos")
            .update({ status: 'paid' })
            .eq("id", inst.boleto_id);
          fetchBoletos();
        } else {
          // If not all paid but status was 'paid', revert to pending
          const { data: boletoCheck } = await supabase
            .from("boletos")
            .select("status")
            .eq("id", inst.boleto_id)
            .single();

          if (boletoCheck?.status === 'paid') {
            await supabase
              .from("boletos")
              .update({ status: 'pending' })
              .eq("id", inst.boleto_id);
            fetchBoletos();
          }
        }
      }
      onRefreshRequired?.();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleOpenPaymentModal = async (inst: Installment, boleto: BoletoRow) => {
    setSelectedInstallment(inst);
    setSelectedBoletoRow(boleto);

    // Set default payment item
    setPayments([
      {
        tempId: Math.random().toString(36).substring(2, 9),
        payment_method: "Pix",
        amount: inst.amount,
        account_id: boleto.account_id || null, // Default to the boleto's account
        machine_id: null,
        installments: 1,
        due_date: new Date().toISOString(),
        status: 'received'
      }
    ]);

    setPaymentDate(new Date());

    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInstallment || !selectedBoletoRow) return;

    if (payments.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }

    if (payments.some(p => !p.account_id)) {
      toast.error("Selecione a conta de destino para todos os pagamentos");
      return;
    }

    const totalToPay = selectedInstallment.amount;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (Math.abs(totalPaid - totalToPay) > 0.01) {
      toast.error(`O valor total pago (R$ ${totalPaid.toFixed(2)}) deve ser igual ao valor da parcela (R$ ${totalToPay.toFixed(2)})`);
      return;
    }

    setIsPaying(true);

    try {
      // 1. Update the installment status to 'paid'
      const updateData: any = {
        status: 'paid',
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        paid_amount: totalToPay,
      };

      const { error: instError } = await supabase
        .from("boleto_installments")
        .update(updateData)
        .eq("id", selectedInstallment.id);

      if (instError) throw instError;

      // 2. Handle the transactions and sale_payments
      for (let index = 0; index < payments.length; index++) {
        const p = payments[index];

        // Calculate net amount if card
        let finalNetAmount = p.amount;
        if ((p.payment_method === "Crédito" || p.payment_method === "Débito") && p.machine_id) {
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

        // Create sale_payments record
        const { data: salePayment, error: salePaymentError } = await supabase
          .from("sale_payments")
          .insert({
            sale_id: selectedBoletoRow.sale_id,
            method: p.payment_method,
            amount: p.amount,
            account_id: p.account_id,
            machine_id: p.machine_id,
            installments: p.installments,
            status: p.status || 'received',
            company_id: selectedBoletoRow.company_id || companyId || 0
          })
          .select("id")
          .single();

        if (salePaymentError) throw salePaymentError;

        if (index === 0 && selectedInstallment.transaction_id) {
          // Update the main transaction
          const txUpdate: any = {
            is_paid: true,
            transaction_date: format(paymentDate, 'yyyy-MM-dd'),
            amount: finalNetAmount,
            account_id: p.account_id,
            payment_method: p.payment_method,
            sale_payment_id: salePayment.id
          };

          const { error: txError } = await supabase
            .from("transactions")
            .update(txUpdate)
            .eq("id", selectedInstallment.transaction_id);

          if (txError) throw txError;
        } else {
          // Create a new transaction (either a split payment or because there was no transaction_id on the installment)
          const isFirstPaymentNoTx = index === 0 && !selectedInstallment.transaction_id;
          const txName = isFirstPaymentNoTx
            ? `Boleto #${selectedBoletoRow.sale_id} - ${selectedBoletoRow.client_name} - Parcela ${selectedInstallment.installment_number}`
            : `Boleto #${selectedBoletoRow.sale_id} - ${selectedBoletoRow.client_name} - Parcela ${selectedInstallment.installment_number} (Split)`;

          const txDescription = isFirstPaymentNoTx
            ? `Pagamento da Parcela ${selectedInstallment.installment_number}`
            : `Pagamento complementar da Parcela ${selectedInstallment.installment_number}`;

          const { data: newTx, error: newTxError } = await supabase
            .from("transactions")
            .insert({
              name: txName,
              amount: finalNetAmount,
              type: "Entrada",
              transaction_date: format(paymentDate, 'yyyy-MM-dd'),
              account_id: p.account_id,
              company_id: selectedBoletoRow.company_id || companyId || 0,
              is_paid: true,
              payment_method: p.payment_method,
              sale_id: selectedBoletoRow.sale_id,
              description: txDescription,
              origin_type: "boleto_installment",
              origin_id: selectedInstallment.id,
              sale_payment_id: salePayment.id
            })
            .select("id")
            .single();

          if (newTxError) throw newTxError;

          // Update the first transaction_id on the installment if needed
          if (isFirstPaymentNoTx && newTx) {
            const { error: updateInstTxError } = await supabase
              .from("boleto_installments")
              .update({ transaction_id: newTx.id })
              .eq("id", selectedInstallment.id);

            if (updateInstTxError) throw updateInstTxError;
          }
        }
      }

      toast.success("Pagamento da parcela registrado!");
      setPaymentModalOpen(false);
      fetchInstallments(selectedInstallment.boleto_id);

      // Check if all installments are paid to update the main boleto status
      const { data: allInstallments } = await supabase
        .from("boleto_installments")
        .select("status")
        .eq("boleto_id", selectedInstallment.boleto_id);

      if (allInstallments) {
        const allPaid = allInstallments.every(i => i.status === 'paid');
        if (allPaid) {
          await supabase
            .from("boletos")
            .update({ status: 'paid' })
            .eq("id", selectedInstallment.boleto_id);
          fetchBoletos();
        } else {
          // Verify if boleto status needs update to pending
          const { data: boletoCheck } = await supabase
            .from("boletos")
            .select("status")
            .eq("id", selectedInstallment.boleto_id)
            .single();

          if (boletoCheck?.status === 'paid') {
            await supabase
              .from("boletos")
              .update({ status: 'pending' })
              .eq("id", selectedInstallment.boleto_id);
            fetchBoletos();
          }
        }
      }
      console.log("[BoletoManagement] Chamando onRefreshRequired (Confirmar Pagamento)...");
      await onRefreshRequired?.();
      console.log("[BoletoManagement] onRefreshRequired concluído.");
    } catch (err) {
      console.error("Error confirming payment:", err);
      toast.error("Erro ao registrar o pagamento");
    } finally {
      setIsPaying(false);
    }
  };

  const handleRevertPayment = async (inst: Installment, boleto: BoletoRow) => {
    try {
      console.log("[BoletoManagement] Iniciando reversão de pagamento da parcela:", inst.id);
      // 1. Update installment status to 'pending' and clear payment fields
      const { error: instError } = await supabase
        .from("boleto_installments")
        .update({
          status: 'pending',
          payment_date: null,
          paid_amount: null
        })
        .eq("id", inst.id);

      if (instError) throw instError;

      // 2. Revert the transactions and delete associated sale_payments
      if (inst.transaction_id) {
        const salePaymentIdsToDelete: number[] = [];

        // Fetch main transaction's sale_payment_id
        const { data: mainTx } = await supabase
          .from("transactions")
          .select("sale_payment_id")
          .eq("id", inst.transaction_id)
          .maybeSingle();

        if (mainTx?.sale_payment_id) {
          salePaymentIdsToDelete.push(mainTx.sale_payment_id);
        }

        // Fetch split transactions
        const { data: splitTxs } = await supabase
          .from("transactions")
          .select("id, sale_payment_id")
          .eq("origin_type", "boleto_installment")
          .eq("origin_id", inst.id)
          .neq("id", inst.transaction_id);

        if (splitTxs && splitTxs.length > 0) {
          for (const tx of splitTxs) {
            if (tx.sale_payment_id) {
              salePaymentIdsToDelete.push(tx.sale_payment_id);
            }
          }

          // Delete split transactions
          const splitIds = splitTxs.map(t => t.id);
          await supabase
            .from("transactions")
            .delete()
            .in("id", splitIds);
        }

        // Reset main transaction to unpaid, default method, original amount & original account
        const { error: resetTxError } = await supabase
          .from("transactions")
          .update({
            is_paid: false,
            payment_method: "Boleto",
            amount: inst.amount,
            account_id: boleto.account_id,
            sale_payment_id: null
          })
          .eq("id", inst.transaction_id);

        if (resetTxError) throw resetTxError;

        // Delete associated sale_payments
        if (salePaymentIdsToDelete.length > 0) {
          await supabase
            .from("sale_payments")
            .delete()
            .in("id", salePaymentIdsToDelete);
        }
      }

      toast.success("Pagamento revertido com sucesso!");
      fetchInstallments(inst.boleto_id);

      // 3. Update main boleto status if it was paid
      const { data: boletoCheck } = await supabase
        .from("boletos")
        .select("status")
        .eq("id", inst.boleto_id)
        .single();

      if (boletoCheck?.status === 'paid') {
        await supabase
          .from("boletos")
          .update({ status: 'pending' })
          .eq("id", inst.boleto_id);
        fetchBoletos();
      }
      console.log("[BoletoManagement] Chamando onRefreshRequired (Reverter Pagamento)...");
      await onRefreshRequired?.();
      console.log("[BoletoManagement] onRefreshRequired concluído.");
    } catch (err) {
      console.error("Error reverting payment:", err);
      toast.error("Erro ao reverter o pagamento");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>;
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-600">Pendente</Badge>;
      case 'overdue': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const uniqueAccounts = Array.from(
    new Map(boletos.map(b => [b.account_id, b.account_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredBoletos = boletos.filter(b => {
    const clientName = b.client_name || "";
    const saleId = b.sale_id?.toString() || "";
    const search = searchTerm.toLowerCase().replace("#", "").trim();

    const matchesSearch = clientName.toLowerCase().includes(search) || saleId.includes(search);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesAccount = accountFilter === "all" || b.account_id.toString() === accountFilter;

    return matchesSearch && matchesStatus && matchesAccount;
  });


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou venda..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filtros
                {(statusFilter !== "all" || accountFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-500 border-none">
                    {(statusFilter !== "all" ? 1 : 0) + (accountFilter !== "all" ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border border-border/80">
              <div className="p-2 text-xs font-semibold text-muted-foreground border-b border-border/50">Status</div>
              <DropdownMenuItem onClick={() => setStatusFilter("all")} className={cn("cursor-pointer", statusFilter === "all" && "bg-muted font-medium")}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")} className={cn("cursor-pointer", statusFilter === "pending" && "bg-muted font-medium")}>
                Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("paid")} className={cn("cursor-pointer", statusFilter === "paid" && "bg-muted font-medium")}>
                Pago
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("overdue")} className={cn("cursor-pointer", statusFilter === "overdue" && "bg-muted font-medium")}>
                Atrasado
              </DropdownMenuItem>

              {uniqueAccounts.length > 0 && (
                <>
                  <div className="p-2 text-xs font-semibold text-muted-foreground border-t border-border/50 border-b border-b-border/50">Conta</div>
                  <DropdownMenuItem onClick={() => setAccountFilter("all")} className={cn("cursor-pointer", accountFilter === "all" && "bg-muted font-medium")}>
                    Todas as Contas
                  </DropdownMenuItem>
                  {uniqueAccounts.map(acc => (
                    <DropdownMenuItem
                      key={acc.id}
                      onClick={() => setAccountFilter(acc.id.toString())}
                      className={cn("cursor-pointer", accountFilter === acc.id.toString() && "bg-muted font-medium")}
                    >
                      {acc.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {(statusFilter !== "all" || accountFilter !== "all") && (
                <>
                  <div className="border-t border-border/50 my-1" />
                  <DropdownMenuItem
                    onClick={() => {
                      setStatusFilter("all");
                      setAccountFilter("all");
                    }}
                    className="text-destructive focus:text-destructive font-medium justify-center cursor-pointer"
                  >
                    Limpar Filtros
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nenhum boleto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoletos.map(boleto => (
                  <>
                    <TableRow key={boleto.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleExpand(boleto.id)}>
                      <TableCell>
                        {expandedBoleto === boleto.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">#{boleto.sale_id}</TableCell>
                      <TableCell>{boleto.client_name}</TableCell>
                      <TableCell className="text-muted-foreground">{boleto.account_name}</TableCell>
                      <TableCell>R$ {Number(boleto.total_amount).toFixed(2)}</TableCell>
                      <TableCell>{boleto.installments_count}x</TableCell>
                      <TableCell>{getStatusBadge(boleto.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(boleto.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => handleOpenSaleDetails(boleto.sale_id)}
                              disabled={loadingSaleId === boleto.sale_id}
                            >
                              {loadingSaleId === boleto.sale_id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              Ver Venda
                            </DropdownMenuItem>
                          </DropdownMenuContent>

                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {expandedBoleto === boleto.id && (
                      <TableRow className="bg-muted/10 border-b">
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                              {!installments[boleto.id] ? (
                                <div className="col-span-4 py-4 text-center text-xs text-muted-foreground">Carregando parcelas...</div>
                              ) : installments[boleto.id].length === 0 ? (
                                <div className="col-span-4 py-4 text-center text-xs text-muted-foreground">Nenhuma parcela registrada</div>
                              ) : (
                                installments[boleto.id].map(inst => (
                                  <Card key={inst.id} className="bg-background border-border/40">
                                    <CardContent className="p-3 space-y-2">
                                      <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Parcela {inst.installment_number}</span>
                                        {getStatusBadge(inst.status)}
                                      </div>
                                      <div className="text-lg font-bold">R$ {Number(inst.amount).toFixed(2)}</div>
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        Venc: {format(new Date(inst.due_date + 'T12:00:00'), "dd/MM/yyyy")}
                                      </div>

                                      {inst.status !== 'paid' ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full h-8 text-xs gap-1 mt-1 border-green-500/50 text-green-600 hover:bg-green-500/10"
                                          onClick={() => handleOpenPaymentModal(inst, boleto)}
                                        >
                                          <Check className="h-3 w-3" /> Baixar Parcela
                                        </Button>
                                      ) : (
                                        <div className="space-y-2 mt-1">
                                          <div className="text-[10px] text-green-600 flex items-center gap-1 italic">
                                            <CheckCircle2 className="h-3 w-3" /> Pago em {inst.payment_date ? format(new Date(inst.payment_date + 'T12:00:00'), "dd/MM/yy") : ''}
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs gap-1 mt-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                            onClick={() => handleRevertPayment(inst, boleto)}
                                          >
                                            <RotateCcw className="h-3 w-3" /> Reverter Pagamento
                                          </Button>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredBoletos.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-border/50 rounded-xl bg-card">
            Nenhum boleto encontrado
          </div>
        ) : (
          filteredBoletos.map(boleto => (
            <div key={boleto.id} className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-3 cursor-pointer select-none transition-colors hover:bg-card/40" onClick={() => toggleExpand(boleto.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    #{boleto.sale_id} — {boleto.client_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(boleto.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStatusBadge(boleto.status)}
                  {expandedBoleto === boleto.id ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {boleto.account_name}
                  </p>
                  <Badge variant="outline" className="text-[9px] mt-0.5 bg-muted text-muted-foreground border-border/50">
                    {boleto.installments_count}x Boleto
                  </Badge>
                </div>
                <p className="text-sm font-bold text-foreground whitespace-nowrap">
                  R$ {Number(boleto.total_amount).toFixed(2)}
                </p>
              </div>

              <div className="pt-2 border-t border-border/40 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSaleDetails(boleto.sale_id);
                  }}
                  disabled={loadingSaleId === boleto.sale_id}
                >
                  {loadingSaleId === boleto.sale_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  Ver Venda
                </Button>
              </div>

              {expandedBoleto === boleto.id && (
                <div className="pt-3 mt-3 border-t border-border/40 space-y-2 relative" onClick={(e) => e.stopPropagation()}>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-foreground">
                    <Clock className="w-3.5 h-3.5" /> Detalhes das Parcelas
                  </h4>
                  {!installments[boleto.id] ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Carregando parcelas...</p>
                  ) : installments[boleto.id].length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma parcela registrada</p>
                  ) : (
                    <div className="grid gap-2">
                      {installments[boleto.id].map(inst => (
                        <div key={inst.id} className="flex flex-col p-2.5 rounded-md bg-background border text-xs gap-2 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[10px] text-muted-foreground uppercase">Parcela {inst.installment_number}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Venc: {format(new Date(inst.due_date + 'T12:00:00'), "dd/MM/yyyy")}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(inst.status)}
                              <span className="font-semibold text-sm">R$ {Number(inst.amount).toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col mt-1 pt-3 border-t border-border/50 space-y-2">
                            {inst.status !== 'paid' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-[10px] px-2 gap-1 border-green-500/50 text-green-600 hover:bg-green-500/10"
                                onClick={() => handleOpenPaymentModal(inst, boleto)}
                              >
                                <Check className="h-3 w-3 inline" /> Baixar Parcela
                              </Button>
                            ) : (
                              <>
                                <div className="text-[10px] text-green-600 flex items-center justify-center gap-1 italic mb-1">
                                  <CheckCircle2 className="h-3 w-3" /> Pago em {inst.payment_date ? format(new Date(inst.payment_date + 'T12:00:00'), "dd/MM/yy") : ''}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-[10px] px-2 gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                  onClick={() => handleRevertPayment(inst, boleto)}
                                >
                                  <RotateCcw className="h-3 w-3 inline" /> Reverter Pagamento
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <SaleDetailsModal
        open={!!selectedSaleDetails}
        onOpenChange={(open) => !open && setSelectedSaleDetails(null)}
        sale={selectedSaleDetails}
      />

      {/* Modal de confirmação de pagamento */}
      <Dialog open={paymentModalOpen} onOpenChange={(open) => !open && setPaymentModalOpen(false)}>
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

          {selectedInstallment && selectedBoletoRow && (
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Data do Pagamento</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={format(paymentDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected) {
                        const [year, month, day] = selected.split('-').map(Number);
                        setPaymentDate(new Date(year, month - 1, day));
                      }
                    }}
                  />
                </div>
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
                      const totalToPay = selectedInstallment.amount;
                      const currentPaid = payments.reduce((acc, curr) => acc + curr.amount, 0);
                      const remaining = Math.max(0, totalToPay - currentPaid);
                      setPayments([...payments, {
                        tempId: Math.random().toString(36).substring(2, 9),
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
                      companyId={companyId || selectedBoletoRow.company_id || 0}
                      totalRemaining={selectedInstallment.amount - payments.reduce((acc, curr, i) => i < index ? acc + curr.amount : acc, 0)}
                      onUpdate={(updated) => setPayments(payments.map(item => item.tempId === p.tempId ? updated : item))}
                      onRemove={() => setPayments(payments.filter(item => item.tempId !== p.tempId))}
                    />
                  ))}
                </div>

                {(() => {
                  const totalToPay = selectedInstallment.amount;
                  const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0);
                  const diff = paidTotal - totalToPay;
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
                        <span>Total Parcela: R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-white gap-2"
              onClick={handleConfirmPayment}
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
    </div>
  );
}

