import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  Search,
  Receipt,
  Calendar,
  Layers,
  Clock,
  Check,
  Undo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CardMachineSale {
  id: number;
  sale_id: number;
  method: string;
  amount: number;
  installments: number | null;
  status: string | null;
  machine_id: number | null;
  account_id: number | null;
  company_id: number | null;
  sales: {
    id: number;
    sale_date: string;
    clients: {
      name: string;
    } | null;
  } | null;
  card_machines: {
    id: number;
    name: string;
    machine_type: string | null;
    is_anticipated: boolean | null;
    anticipation_value: number | null;
    anticipation_type: string | null;
  } | null;
}

interface ProcessedRow {
  paymentId: number;
  saleId: number;
  saleDate: string;
  clientName: string;
  method: string;
  amount: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  machineName: string;
  machineType: string | null;
  machineId: number | null;
  isAnticipated: boolean | null;
  anticipationValue: number | null;
  anticipationType: string | null;
  status: string | null;
}

function getAnticipationLabel(row: ProcessedRow): string {
  if (!row.isAnticipated) return "Não";
  const val = row.anticipationValue ?? 1;
  const type = row.anticipationType === "hours" ? "hora(s)" : "dia(s)";
  return `${val} ${type}`;
}

function getMethodColor(method: string) {
  if (method === "Crédito") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  if (method === "Débito") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  return "bg-muted text-muted-foreground";
}

function getProgressColor(paid: number, total: number) {
  const ratio = total > 0 ? paid / total : 0;
  if (ratio === 1) return "bg-green-500";
  if (ratio >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

export function CardMachineSalesTable() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [sortField, setSortField] = useState<"saleDate" | "amount" | "remaining">("saleDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rowTransactions, setRowTransactions] = useState<Record<number, any[]>>({});

  const toggleRow = async (saleId: number) => {
    const newExp = new Set(expandedRows);
    if (newExp.has(saleId)) {
      newExp.delete(saleId);
      setExpandedRows(newExp);
      return;
    }
    try {
      const { data } = await supabase.from('transactions')
        .select('*')
        .eq('sale_id', saleId)
        .order('transaction_date', { ascending: true });
      setRowTransactions(prev => ({ ...prev, [saleId]: data || [] }));
      newExp.add(saleId);
      setExpandedRows(newExp);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTransactionStatus = async (saleId: number, tx: any) => {
    const newStatus = !tx.is_paid;
    if (!tx.id) {
      toast.error("ID da parcela não encontrado. Recarregue a página e tente novamente.");
      return;
    }

    // Calcula o comportamento para o Pai
    const targetRow = rows.find(r => r.saleId === saleId);
    const targetRowPaymentId = targetRow?.paymentId;
    let computedPaiStatus = targetRow?.status;
    let willBecomeReceived = false;
    let willBecomePending = false;

    if (targetRow) {
      const u = newStatus ? targetRow.paidInstallments + 1 : targetRow.paidInstallments - 1;
      const s = u >= targetRow.totalInstallments ? "received" : "pending";
      willBecomeReceived = targetRow.status !== "received" && s === "received";
      willBecomePending = targetRow.status === "received" && s === "pending";
      computedPaiStatus = s;
    }

    // Otimista: transações locais e tabela pai
    setRowTransactions((prev) => {
      const current = prev[saleId] || [];
      return {
        ...prev,
        [saleId]: current.map((t) => (t.id === tx.id ? { ...t, is_paid: newStatus } : t)),
      };
    });

    setRows((prev) => prev.map(row => {
      if (row.saleId === saleId) {
        const updatedPaid = newStatus ? row.paidInstallments + 1 : Math.max(0, row.paidInstallments - 1);
        const isReceived = updatedPaid >= row.totalInstallments;
        return {
          ...row,
          paidInstallments: updatedPaid,
          remainingInstallments: row.totalInstallments - updatedPaid,
          status: isReceived ? "received" : "pending"
        };
      }
      return row;
    }));

    try {
      const { error } = await supabase
        .from("transactions")
        .update({ is_paid: newStatus })
        .eq("id", tx.id);
      if (error) throw error;

      // Sincroniza tabela de sale_payments se marcou de recebido p/ pendente (ou vice-versa)
      if (targetRowPaymentId && (willBecomeReceived || willBecomePending)) {
        await supabase.from("sale_payments").update({ status: computedPaiStatus }).eq("id", targetRowPaymentId);
      }

      toast.success(newStatus ? "Parcela marcada como paga!" : "Status da parcela revertido!");
      window.dispatchEvent(new Event("financial-data-changed"));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro no banco de dados ao atualizar a parcela");

      // Reverte otimismo
      setRowTransactions((prev) => {
        const current = prev[saleId] || [];
        return {
          ...prev,
          [saleId]: current.map((t) => (t.id === tx.id ? { ...t, is_paid: !newStatus } : t)),
        };
      });
      setRows((prev) => prev.map(row => {
        if (row.saleId === saleId) {
          const revertPaid = !newStatus ? row.paidInstallments + 1 : Math.max(0, row.paidInstallments - 1);
          const isReceived = revertPaid >= row.totalInstallments;
          return {
            ...row,
            paidInstallments: revertPaid,
            remainingInstallments: row.totalInstallments - revertPaid,
            status: isReceived ? "received" : "pending"
          };
        }
        return row;
      }));
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("sale_payments")
        .select(`
          id,
          sale_id,
          method,
          amount,
          installments,
          status,
          machine_id,
          account_id,
          company_id,
          sales (
            id,
            sale_date,
            created_at,
            clients (
              name
            )
          ),
          card_machines (
            id,
            name,
            machine_type,
            is_anticipated,
            anticipation_value,
            anticipation_type
          )
        `)
        .eq("company_id", profile.company_id)
        .in("method", ["Crédito", "Débito"])
        .not("machine_id", "is", null)
        .order("id", { ascending: false });

      if (error) throw error;

      // Process each payment row into a display row
      const processed: ProcessedRow[] = (data || []).map((sp: any) => {
        const totalInstallments = sp.installments ?? 1;

        let calculatedStatus = sp.status;
        let pInstallments = sp.status === "received" ? totalInstallments : 0;

        if (sp.status !== "received" && sp.card_machines) {
          const machine = sp.card_machines;
          const sDate = sp.sales?.created_at ? new Date(sp.sales.created_at) : (sp.sales?.sale_date ? new Date(sp.sales.sale_date) : new Date());
          const now = new Date();

          if (machine.is_anticipated) {
            const dt = new Date(sDate);
            if (machine.anticipation_type === 'hours') {
              // For UI purpose, hours anticipate almost next day if sale_date has 0 hours
              dt.setHours(dt.getHours() + (machine.anticipation_value || 0));
            } else {
              dt.setDate(dt.getDate() + (machine.anticipation_value || 0));
            }
            if (now >= dt) {
              calculatedStatus = "received";
              pInstallments = totalInstallments;
            }
          } else {
            // Non-anticipated: divides in 30, 60, 90 days.
            let paidCount = 0;
            for (let i = 1; i <= totalInstallments; i++) {
              const pDate = new Date(sDate);
              pDate.setDate(pDate.getDate() + (i * 30));
              if (now >= pDate) {
                paidCount++;
              }
            }
            pInstallments = Math.min(paidCount, totalInstallments);
            if (pInstallments === totalInstallments) {
              calculatedStatus = "received";
            }
          }
        }

        const paidInstallments = pInstallments;
        const remainingInstallments = totalInstallments - paidInstallments;

        return {
          paymentId: sp.id,
          saleId: sp.sale_id,
          saleDate: sp.sales?.sale_date ?? "",
          clientName: sp.sales?.clients?.name ?? "Cliente",
          method: sp.method,
          amount: sp.amount,
          totalInstallments,
          paidInstallments,
          remainingInstallments,
          machineName: sp.card_machines?.name ?? "—",
          machineType: sp.card_machines?.machine_type ?? null,
          machineId: sp.machine_id,
          isAnticipated: sp.card_machines?.is_anticipated ?? null,
          anticipationValue: sp.card_machines?.anticipation_value ?? null,
          anticipationType: sp.card_machines?.anticipation_type ?? null,
          status: calculatedStatus,
        };
      });

      setRows(processed);
    } catch (err) {
      console.error("[CardMachineSalesTable] Erro ao carregar vendas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchSales();
  }, [user?.id]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  // Filter
  let filtered = rows.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      r.clientName.toLowerCase().includes(term) ||
      r.machineName.toLowerCase().includes(term) ||
      r.saleId.toString().includes(term);
    const matchMethod =
      filterMethod === "todos" || r.method === filterMethod;
    const matchStatus =
      filterStatus === "todos" ||
      (filterStatus === "recebido" && r.status === "received") ||
      (filterStatus === "pendente" && r.status !== "received");
    return matchSearch && matchMethod && matchStatus;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    if (sortField === "saleDate") {
      va = a.saleDate;
      vb = b.saleDate;
    } else if (sortField === "amount") {
      va = a.amount;
      vb = b.amount;
    } else if (sortField === "remaining") {
      va = a.remainingInstallments;
      vb = b.remainingInstallments;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsCollapsed((c) => !c)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Vendas nas Maquininhas
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crédito e débito — controle de parcelas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/5 border-primary/20 text-primary"
              >
                {rows.length} registro{rows.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, maquininha ou nº da venda..."
                className="pl-8 bg-background text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div
              className="flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-[110px] bg-background text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] bg-background text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {rows.length === 0
                  ? "Nenhuma venda em maquininha encontrada"
                  : "Nenhum resultado para os filtros aplicados"}
              </p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                {rows.length === 0
                  ? "Registre vendas com pagamento em Crédito ou Débito para visualizá-las aqui."
                  : "Tente ajustar os filtros de busca."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block rounded-md border border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="min-w-[160px]">
                        <button
                          className="flex items-center gap-1 text-xs font-semibold hover:text-foreground transition-colors"
                          onClick={() => handleSort("saleDate")}
                        >
                          <Calendar className="h-3 w-3" />
                          Venda
                          <SortIcon field="saleDate" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[120px] text-xs font-semibold">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          Maquininha
                        </div>
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Tipo
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <Layers className="h-3 w-3" />
                          Parcelas
                        </div>
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                          onClick={() => handleSort("remaining")}
                        >
                          <Clock className="h-3 w-3" />
                          Restantes
                          <SortIcon field="remaining" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Antecipação
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        <button
                          className="hover:text-foreground transition-colors"
                          onClick={() => handleSort("amount")}
                        >
                          Valor
                          <SortIcon field="amount" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => {
                      const progressPct =
                        row.totalInstallments > 0
                          ? (row.paidInstallments / row.totalInstallments) * 100
                          : 100;
                      const isExpanded = expandedRows.has(row.saleId);
                      const txs = rowTransactions[row.saleId] || [];

                      return (
                        <React.Fragment key={row.paymentId}>
                          <TableRow
                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => toggleRow(row.saleId)}
                          >
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-foreground">
                                  #{row.saleId} — {row.clientName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(row.saleDate)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                  <CreditCard className="h-3 w-3 text-primary" />
                                </div>
                                <span className="text-xs font-medium truncate max-w-[120px]">
                                  {row.machineName}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-medium",
                                  getMethodColor(row.method)
                                )}
                              >
                                {row.method}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-semibold">
                                  {row.paidInstallments}/{row.totalInstallments}
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      getProgressColor(row.paidInstallments, row.totalInstallments)
                                    )}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  row.remainingInstallments === 0
                                    ? "text-green-500"
                                    : "text-orange-500"
                                )}
                              >
                                {row.remainingInstallments === 0
                                  ? "✓ Quitado"
                                  : `${row.remainingInstallments}x`}
                              </span>
                            </TableCell>

                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "text-xs",
                                  row.isAnticipated
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground"
                                )}
                              >
                                {getAnticipationLabel(row)}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                                {formatCurrency(row.amount)}
                              </span>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    row.status === "received"
                                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                  )}
                                >
                                  {row.status === "received" ? "Recebido" : "Pendente"}
                                </Badge>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-muted/5 hover:bg-muted/5">
                              <TableCell colSpan={8} className="p-0 border-b">
                                <div className="px-10 py-4">
                                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Detalhes das Parcelas / Transações Agendadas
                                  </h4>
                                  {txs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Nenhuma transação futura encontrada para esta venda.</p>
                                  ) : (
                                    <div className="grid gap-2">
                                      {txs.map((tx: any, idx: number) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md bg-background border text-xs">
                                          <div className="flex flex-col">
                                            <span className="font-semibold">{tx.name || 'Parcela'}</span>
                                            <span className="text-muted-foreground">Previsão de Crédito: {formatDate(tx.transaction_date)}</span>
                                          </div>
                                          <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                                            <span className="font-semibold text-sm mr-2">{formatCurrency(tx.amount)}</span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[10px]",
                                                tx.is_paid
                                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                              )}
                                            >
                                              {tx.is_paid ? "Creditado/Pago" : "A Receber"}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 rounded-full"
                                              title={tx.is_paid ? "Desfazer Pagamento" : "Marcar como Pago"}
                                              onClick={() => toggleTransactionStatus(row.saleId, tx)}
                                            >
                                              {tx.is_paid ? (
                                                <Undo className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                                              ) : (
                                                <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-green-500 transition-colors" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filtered.map((row) => {
                  const progressPct =
                    row.totalInstallments > 0
                      ? (row.paidInstallments / row.totalInstallments) * 100
                      : 100;
                  return (
                    <div
                      key={row.paymentId}
                      className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            #{row.saleId} — {row.clientName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(row.saleDate)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            row.status === "received"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          )}
                        >
                          {row.status === "received" ? "Recebido" : "Pendente"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {row.machineName}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] mt-0.5",
                              getMethodColor(row.method)
                            )}
                          >
                            {row.method}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Parcelas</span>
                          <span className="font-semibold">
                            {row.paidInstallments}/{row.totalInstallments}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              getProgressColor(
                                row.paidInstallments,
                                row.totalInstallments
                              )
                            )}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Restantes</span>
                          <span
                            className={cn(
                              "font-bold",
                              row.remainingInstallments === 0
                                ? "text-green-500"
                                : "text-orange-500"
                            )}
                          >
                            {row.remainingInstallments === 0
                              ? "✓ Quitado"
                              : `${row.remainingInstallments}x`}
                          </span>
                        </div>
                        {row.isAnticipated && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Antecipação</span>
                            <span className="text-primary font-medium">
                              {getAnticipationLabel(row)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer summary */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{filtered.length}</strong>{" "}
                  registro(s)
                </span>
                <span>
                  Total:{" "}
                  <strong className="text-foreground">
                    {formatCurrency(
                      filtered.reduce((acc, r) => acc + r.amount, 0)
                    )}
                  </strong>
                </span>
                <span>
                  Pendentes:{" "}
                  <strong className="text-orange-500">
                    {filtered.filter((r) => r.status !== "received").length}
                  </strong>
                </span>
                <span>
                  Recebidos:{" "}
                  <strong className="text-green-500">
                    {filtered.filter((r) => r.status === "received").length}
                  </strong>
                </span>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
