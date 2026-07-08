// @ts-nocheck
import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Eye, EyeOff, Settings, ArrowUpRight, ArrowDownRight, RefreshCw, Plus,
  Search, Calendar as CalendarIcon, Filter, ArrowUpDown, Landmark, FolderPlus, FolderTree, ArrowRightLeft, X, Receipt, CheckCircle2, ChevronRight, ChevronLeft, ChevronsUpDown, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format, subDays, isSameDay, parseISO, addMonths, subMonths, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { AddAccountModal } from "@/components/financeiro/AddAccountModal";
import { EditAccountModal } from "@/components/contas/EditAccountModal";
import { AddTransactionModal } from "@/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/components/financeiro/AddTransferModal";
import { NewCategoryModal } from "@/components/financeiro/NewCategoryModal";
import { ManageCategoriesModal } from "@/components/financeiro/ManageCategoriesModal";
import { ConfirmPurchasePaymentModal } from "@/components/compras/ConfirmPurchasePaymentModal";
import { SalePayment } from "@/components/vendas/PaymentBlock";
import { CardMachinesList } from "@/components/financeiro/CardMachinesList";
import { BoletoManagement } from "@/components/financeiro/BoletoManagement";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { payInstallment, reverseInstallment, payInstallmentWithDetails } from "@/lib/purchaseService";

interface Account {
  id: number;
  name: string;
  account_type: string | null;
  current_balance: number | null;
  is_main: boolean | null;
  is_active: boolean | null;
  bank_code?: string | null;
  bank_name?: string | null;
  accepted_payment_methods?: string[] | null;
}

interface Transaction {
  id: number | string;
  type: string;
  amount: number;
  name: string;
  description: string | null;
  transaction_date: string;
  payment_method: string | null;
  is_paid: boolean | null;
  category_id: number | null;
  account_id: number | null;
  origin_type?: string | null;
  origin_id?: number | null;
}

interface Transfer {
  id: number;
  amount: number;
  description: string | null;
  transfer_date: string;
  from_account_id: number;
  to_account_id: number;
}

interface Category {
  id: number;
  name: string;
  type: string;
  color: string | null;
}

export default function Contas() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debugTransfers, setDebugTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<'extrato' | 'maquininhas' | 'boletos'>('extrato');
  const [selectedAccountsForTotal, setSelectedAccountsForTotal] = useState<number[]>([]);

  const toggleAccountSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccountsForTotal(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // New states for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

  const handlePrevMonth = () => {
    const current = parse(filterMonth, "yyyy-MM", new Date());
    setFilterMonth(format(subMonths(current, 1), "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const current = parse(filterMonth, "yyyy-MM", new Date());
    setFilterMonth(format(addMonths(current, 1), "yyyy-MM"));
  };
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // Sorting state
  type SortField = 'date' | 'name' | 'amount' | 'status';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3 inline text-muted-foreground/40" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="ml-1 h-3 w-3 inline text-primary" />
      : <ChevronDown className="ml-1 h-3 w-3 inline text-primary" />;
  };

  // States for Future Transactions Grouping
  const [expandedFutureGroups, setExpandedFutureGroups] = useState<Record<string, boolean>>({});
  const [expandedExtratoGroups, setExpandedExtratoGroups] = useState<Record<string, boolean>>({});

  const toggleExtratoGroup = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedExtratoGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // New states for FAB modals
  const [fabOpen, setFabOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  // States for payment confirmation modal
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState<Transaction | null>(null);


  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    console.log("[Contas] Iniciando fetchData...");
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        console.warn("[Contas] Perfil ou company_id não encontrado para o usuário:", user.id);
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("is_main", { ascending: false });

      console.log("[Contas] Contas carregadas do banco:", accountsData?.map(a => ({ id: a.id, name: a.name, balance: a.current_balance })));

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("transaction_date", { ascending: false });

      // Fetch transfers
      const { data: transfersData } = await supabase
        .from("transfers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("transfer_date", { ascending: false });

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id);

      setAccounts(accountsData || []);

      const mappedTransfersOut = (transfersData || []).map(tr => {
        const fromAccountName = accountsData?.find(a => String(a.id) === String(tr.from_account_id))?.name || 'Outra conta';
        const toAccountName = accountsData?.find(a => String(a.id) === String(tr.to_account_id))?.name || 'Outra conta';
        const transferName = `Transf. de ${fromAccountName} para ${toAccountName}`;

        return {
          id: `transfer-out-${tr.id}`,
          type: 'Saida',
          amount: tr.amount,
          name: tr.description ? `${transferName} - ${tr.description}` : transferName,
          description: tr.description,
          transaction_date: tr.transfer_date,
          payment_method: 'Transferência',
          is_paid: true,
          category_id: null,
          account_id: tr.from_account_id
        };
      });

      const mappedTransfersIn = (transfersData || []).map(tr => {
        const fromAccountName = accountsData?.find(a => String(a.id) === String(tr.from_account_id))?.name || 'Outra conta';
        const toAccountName = accountsData?.find(a => String(a.id) === String(tr.to_account_id))?.name || 'Outra conta';
        const transferName = `Transf. de ${fromAccountName} para ${toAccountName}`;

        return {
          id: `transfer-in-${tr.id}`,
          type: 'Entrada',
          amount: tr.amount,
          name: tr.description ? `${transferName} - ${tr.description}` : transferName,
          description: tr.description,
          transaction_date: tr.transfer_date,
          payment_method: 'Transferência',
          is_paid: true,
          category_id: null,
          account_id: tr.to_account_id
        };
      });

      const allTransactions = [...(transactionsData || []), ...mappedTransfersOut, ...mappedTransfersIn];

      // Sort combined transactions by date descending
      allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setTransactions(allTransactions);
      setDebugTransfers(transfersData || []);
      setCategories(categoriesData || []);

      // Set initial selected account
      if (accountsData && accountsData.length > 0 && !selectedAccountId) {
        console.log("[Contas] Definindo conta selecionada inicial:", accountsData[0].id);
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (error) {
      console.error("[Contas] Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedAccountId]);

  useEffect(() => {
    fetchData();

    const handleFinancialUpdate = () => {
      fetchData();
    };

    window.addEventListener("financial-data-changed", handleFinancialUpdate);

    return () => {
      window.removeEventListener("financial-data-changed", handleFinancialUpdate);
    };
  }, [user?.id, fetchData]);

  const selectedAccount = accounts.find(a => String(a.id) === String(selectedAccountId));
  const accountTransactions = transactions.filter(t => String(t.account_id) === String(selectedAccountId));

  const handleTogglePayment = async (tx: Transaction, newStatus: boolean) => {
    if (typeof tx.id === 'string' && tx.id.startsWith('transfer-')) {
      if (window.confirm("Deseja reverter esta transferência? Isso irá desfazer a transferência e remover eventuais taxas associadas.")) {
        const transferId = parseInt(tx.id.replace('transfer-in-', '').replace('transfer-out-', ''));

        // Excluir a taxa vinculada a essa transferência
        await supabase.from("transactions").delete().eq("origin_type", "transfer_fee").eq("origin_id", transferId);

        // Excluir a transferência em si
        const { error } = await supabase.from("transfers").delete().eq("id", transferId);

        if (!error) {
          toast.success("Transferência revertida e saldo devolvido!");
          fetchData();
        } else {
          toast.error("Erro ao reverter transferência.");
        }
      }
      return;
    }

    if (window.confirm(newStatus ? "Confirmar o recebimento/pagamento deste lançamento?" : "Reverter o pagamento deste lançamento?")) {
      // Se for uma Taxa de TED/DOC nova e o usuário estiver revertendo
      if (!newStatus && tx.name.includes("Taxa de TED/DOC") && tx.origin_type === 'transfer_fee' && tx.origin_id) {
        // Excluir a transferência em si
        await supabase.from("transfers").delete().eq("id", tx.origin_id);

        // Excluir a taxa
        const { error } = await supabase.from("transactions").delete().eq("id", tx.id);

        if (!error) {
          toast.success("Taxa e Transferência revertidas com sucesso! Os valores voltaram para as contas.");
          fetchData();
        } else {
          toast.error("Erro ao reverter taxa.");
        }
        return;
      }

      // Se for uma Taxa antiga (sem vínculo)
      if (!newStatus && tx.name.includes("Taxa de TED/DOC") && !tx.origin_type) {
        toast.info("Atenção: A taxa foi revertida, mas como foi criada antes da atualização, a transferência da taxa ainda consta no extrato. Exclua a transferência manualmente.");
        const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
        if (!error) {
          fetchData();
        }
        return;
      }
      if (tx.origin_type === 'purchase_installment' && tx.origin_id) {
        let success = false;
        if (newStatus) {
          success = await payInstallment(tx.origin_id);
        } else {
          success = await reverseInstallment(tx.origin_id);
        }

        if (success) {
          toast.success(newStatus ? "Lançamento de compra pago e sincronizado!" : "Pagamento de compra revertido!");
          fetchData();
        } else {
          toast.error("Erro ao sincronizar o pagamento com as compras.");
        }
        return;
      }

      const { error } = await supabase.from('transactions').update({ is_paid: newStatus }).eq('id', tx.id);
      if (!error) {
        toast.success(newStatus ? "Lançamento confirmado!" : "Lançamento revertido!");
        fetchData(); // reload transactions
      } else {
        toast.error("Erro ao atualizar status do lançamento.");
      }
    }
  };


  const handleOpenPaymentModal = (tx: Transaction) => {
    if (typeof tx.id === 'string') {
      toast.error("Não é possível alterar o status de uma transferência.");
      return;
    }
    setTransactionToPay(tx);
    setPaymentModalOpen(true);
  };

  const handleConfirmPaymentTransactions = async (payments: SalePayment[]) => {
    if (!transactionToPay || !companyId) return;

    try {
      if (transactionToPay.origin_type === 'purchase_installment' && transactionToPay.origin_id) {
        const purchasePayments = payments.map(p => ({
          payment_method: p.payment_method,
          amount: p.amount,
          account_id: p.account_id
        }));

        const success = await payInstallmentWithDetails(transactionToPay.origin_id, purchasePayments);
        if (success) {
          fetchData();
          toast.success('Pagamento da compra confirmado e sincronizado!');
          setPaymentModalOpen(false);
          setTransactionToPay(null);
        } else {
          toast.error('Erro ao sincronizar o pagamento com as compras.');
        }
        return;
      }

      const p = payments[0];

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

      const { error: txError } = await supabase
        .from('transactions')
        .update({
          is_paid: true,
          amount: finalNetAmount,
          account_id: p.account_id,
          payment_method: p.payment_method
        })
        .eq('id', transactionToPay.id);

      if (txError) throw txError;

      for (let i = 1; i < payments.length; i++) {
        const splitPayment = payments[i];

        let splitNetAmount = splitPayment.amount;
        if ((splitPayment.payment_method === "Crédito" || splitPayment.payment_method === "Débito") && splitPayment.machine_id) {
          const { data: rateData } = await supabase
            .from("card_machine_rates")
            .select("rate")
            .eq("machine_id", splitPayment.machine_id)
            .eq("installments", splitPayment.installments)
            .single();
          if (rateData) {
            splitNetAmount = splitPayment.amount * (1 - rateData.rate / 100);
          }
        }

        const { error: splitError } = await supabase
          .from('transactions')
          .insert({
            name: `${transactionToPay.name} (Split)`,
            amount: splitNetAmount,
            type: transactionToPay.type,
            transaction_date: transactionToPay.transaction_date,
            account_id: splitPayment.account_id,
            company_id: companyId,
            is_paid: true,
            payment_method: splitPayment.payment_method,
            description: transactionToPay.description
          });
        if (splitError) throw splitError;
      }

      fetchData();
      toast.success('Pagamento confirmado e registrado!');
      setPaymentModalOpen(false);
      setTransactionToPay(null);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      toast.error('Erro ao atualizar status do lançamento.');
    }
  };

  // Payment methods breakdown from real transactions
  const paymentMethodsMap: Record<string, number> = {};
  accountTransactions
    .filter(t => t.type === 'Entrada' && t.is_paid)
    .forEach(t => {
      const method = t.payment_method || 'Outros';
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + t.amount;
    });

  const paymentColors: Record<string, string> = {
    'Pix': '#22c55e',
    'Dinheiro': '#3b82f6',
    'Crédito': '#8b5cf6',
    'Débito': '#06b6d4',
    'Boleto': '#f97316',
    'Transferência': '#ec4899',
    'Outros': '#6b7280'
  };

  const paymentData = Object.entries(paymentMethodsMap).map(([name, value]) => ({
    name,
    value,
    color: paymentColors[name] || '#6b7280'
  }));

  // Categories breakdown from real transactions
  const categoryTotals: Record<number, number> = {};
  accountTransactions
    .filter(t => t.type === 'Saida' && t.category_id)
    .forEach(t => {
      categoryTotals[t.category_id!] = (categoryTotals[t.category_id!] || 0) + t.amount;
    });

  const categoryData = Object.entries(categoryTotals)
    .map(([catId, value]) => {
      const category = categories.find(c => c.id === parseInt(catId));
      return {
        name: category?.name || 'Outros',
        value,
        color: category?.color || '#6b7280'
      };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const getCategoryById = (id: number) => categories.find(c => c.id === id);

  const formatCurrency = (value: number) => {
    if (!showValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Separa Lançamentos Futuros Pendentes
  const futureTransactions = accountTransactions.filter(t =>
    !t.is_paid
  );

  // Todo o resto formará o Extrato atual
  const currentTransactions = accountTransactions.filter(t =>
    t.is_paid
  );

  // Agrupamento dos Futuros
  const groupedFuture = futureTransactions.reduce((groups, t) => {
    let baseName = t.name;
    const regex = /(\s*-\s*Parcela\s*\d+(?:\s*\/\s*\d+)?|\s*\(\d+\/\d+\)).*/i;
    if (regex.test(baseName)) {
      baseName = baseName.replace(regex, '').trim();
    }
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(t);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const futureGroupsArray = Object.entries(groupedFuture).map(([name, txs]) => {
    txs.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    return {
      name,
      transactions: txs,
      totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
      installmentsCount: txs.length,
      nextDate: txs[0]?.transaction_date
    };
  }).sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());

  const toggleFutureGroup = (name: string) => {
    setExpandedFutureGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Computed variables for filters and summaries based on Current
  let filteredTransactions = currentTransactions;

  if (filterMonth) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_date.startsWith(filterMonth));
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTransactions = filteredTransactions.filter(t =>
      t.name.toLowerCase().includes(term) ||
      (t.description?.toLowerCase() || "").includes(term) ||
      (getCategoryById(t.category_id || 0)?.name.toLowerCase() || "").includes(term)
    );
  }
  if (filterType !== "todos") {
    filteredTransactions = filteredTransactions.filter(t => t.type.toLowerCase() === filterType.toLowerCase());
  }
  if (filterStatus !== "todos") {
    if (filterStatus === "pago") {
      filteredTransactions = filteredTransactions.filter(t => t.is_paid === true);
    } else if (filterStatus === "pendente") {
      filteredTransactions = filteredTransactions.filter(t => t.is_paid === false);
    }
  }

  // Ordenação das transações filtradas
  filteredTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'status') {
      comparison = (a.is_paid === b.is_paid) ? 0 : a.is_paid ? -1 : 1;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const extratoGroups: { isGroup: boolean; id: string; name: string; transactions: any[]; totalAmount?: number; category_id?: number; type?: string; is_paid?: boolean; transaction_date?: string; originalTx?: any; payment_method?: string }[] = [];

  const extratoTempGroups: Record<string, any[]> = {};
  filteredTransactions.forEach(t => {
    let baseName = t.name;
    const regex = /(\s*-\s*Parcela\s*\d+(?:\s*\/\s*\d+)?|\s*\(\d+\/\d+\)).*/i;
    if (regex.test(baseName)) {
      baseName = baseName.replace(regex, '').trim();
    }

    if (!extratoTempGroups[baseName]) extratoTempGroups[baseName] = [];
    extratoTempGroups[baseName].push(t);
  });

  Object.entries(extratoTempGroups).forEach(([name, txs]) => {
    if (txs.length > 1) {
      extratoGroups.push({
        isGroup: true,
        id: `extrato-group-${name}`,
        name: `${name}`,
        transactions: txs,
        totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
        type: txs[0].type,
        category_id: txs[0].category_id,
        is_paid: txs.every(t => t.is_paid),
        transaction_date: txs[0].transaction_date,
        payment_method: txs[0].payment_method
      });
    } else {
      extratoGroups.push({
        isGroup: false,
        id: txs[0].id.toString(),
        name: txs[0].name,
        transactions: [txs[0]],
        totalAmount: txs[0].amount,
        type: txs[0].type,
        category_id: txs[0].category_id,
        is_paid: txs[0].is_paid,
        transaction_date: txs[0].transaction_date,
        originalTx: txs[0],
        payment_method: txs[0].payment_method
      });
    }
  });

  extratoGroups.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.transaction_date || '').getTime() - new Date(b.transaction_date || '').getTime();
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'amount') {
      comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
    } else if (sortField === 'status') {
      comparison = (a.is_paid === b.is_paid) ? 0 : a.is_paid ? -1 : 1;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const summaryEntries = filteredTransactions.filter(t => t.type === 'Entrada' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const summaryExits = filteredTransactions.filter(t => t.type === 'Saida' && t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const geracaoCaixa = summaryEntries - summaryExits;
  const saldoFinal = selectedAccount?.current_balance || 0;
  const saldoInicial = saldoFinal - geracaoCaixa;

  // Expected balance (Saldo Atual + Pendentes)
  const pendingEntries = accountTransactions.filter(t => t.type === 'Entrada' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const pendingExits = accountTransactions.filter(t => t.type === 'Saida' && !t.is_paid).reduce((sum, t) => sum + t.amount, 0);
  const saldoPrevisto = saldoFinal + pendingEntries - pendingExits;

  // Last 7 days chart data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTxs = accountTransactions.filter(t => t.transaction_date === dateStr && t.is_paid);
    const entradas = dayTxs.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.amount, 0);
    const saidas = dayTxs.filter(t => t.type === 'Saida').reduce((acc, t) => acc + t.amount, 0);
    return {
      date: format(date, 'dd/MM'),
      entradas,
      saidas
    };
  });

  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const date = t.transaction_date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const handleAccountCreated = () => {
    fetchData();
  };

  const handleAccountUpdated = () => {
    fetchData();
  };

  const handleAccountDeleted = (accountId: number) => {
    const remaining = accounts.filter(a => a.id !== accountId);
    if (selectedAccountId === accountId && remaining.length > 0) {
      setSelectedAccountId(remaining[0].id);
    }
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-x-hidden">
      <HelpOverlay
        tabId="contas"
        title="Guia de Contas"
        sections={[
          {
            title: "Vídeo Aula — Contas",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da guia de contas.",
            videoUrl: "/help/video-aula-conta.mp4"
          },
          {
            title: "Selecionar Conta",
            description: "Na barra lateral esquerda estão listadas todas as suas contas (corrente, poupança, carteira). Clique em uma conta para ver seus detalhes. Use o botão '+' para criar uma nova conta e '👁' para ocultar os valores.",
            screenshotUrl: "/help/help-contas-selecionar.png"
          },
          {
            title: "Gráficos de Análise",
            description: "O gráfico de pizza mostra a distribuição das formas de pagamento (Pix, Dinheiro, Crédito, etc). O gráfico de barras mostra as saídas organizadas por categoria (Aluguel, Material, etc).",
            screenshotUrl: "/help/help-contas-graficos.png"
          },
          {
            title: "Extrato Detalhado",
            description: "O extrato mostra todas as transações da conta selecionada, agrupadas por data. Entradas aparecem em verde (+) e saídas em vermelho (-). Cada transação mostra se está confirmada ou pendente.",
            screenshotUrl: "/help/help-contas-extrato.png"
          },
        ]}
      />

      {/* Left sidebar - Account selection */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-4 overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contas</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowValues(!showValues)}>
              {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma conta cadastrada</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Criar Conta
            </Button>
          </div>
        ) : (
          <div className="flex md:flex-col gap-2 md:space-y-0">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "min-w-[200px] md:min-w-0 w-full p-3 rounded-lg text-left transition-colors relative group flex-shrink-0",
                  selectedAccountId === account.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card/50 border border-border/50 hover:bg-accent"
                )}
              >
                <div
                  onClick={(e) => toggleAccountSelection(account.id, e)}
                  className={cn(
                    "absolute top-2 right-8 p-1 rounded transition-all flex items-center justify-center",
                    selectedAccountsForTotal.includes(account.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountsForTotal.includes(account.id)}
                    readOnly
                    className="w-3.5 h-3.5 cursor-pointer accent-primary"
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAccount(account);
                  }}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                >
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </button>

                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate pr-2">{account.name}</span>
                  {account.is_main && (
                    <Badge variant="outline" className="text-[10px] shrink-0">Principal</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  {account.bank_code ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={account.bank_name || undefined}>
                      <img
                        src={`/banks/${account.bank_code}.svg`}
                        alt={account.bank_name || "Banco"}
                        className="w-4 h-4 object-contain rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="truncate max-w-[130px]">{account.bank_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Landmark className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[130px]">{account.account_type}</span>
                    </div>
                  )}
                </div>
                <p className="text-lg font-bold">{formatCurrency(account.current_balance || 0)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {selectedAccount ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {selectedAccount.bank_code ? (
                  <div className="w-12 h-12 rounded-xl bg-white border border-border/50 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                    <img
                      src={`/banks/${selectedAccount.bank_code}.svg`}
                      alt={selectedAccount.bank_name || "Banco"}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
                    <Landmark className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{selectedAccount.name}</h1>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                    <span>{selectedAccount.account_type}</span>
                    {selectedAccount.bank_name && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{selectedAccount.bank_name}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:ml-auto justify-end mt-4 sm:mt-0">
                {selectedAccountsForTotal.length > 0 && (
                  <div className="bg-card border border-border/50 rounded-lg px-4 py-1.5 flex flex-col items-end shadow-sm animate-in fade-in slide-in-from-right-4">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Saldo Selecionado</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(
                        accounts
                          .filter(a => selectedAccountsForTotal.includes(a.id))
                          .reduce((sum, a) => sum + (a.current_balance || 0), 0)
                      )}
                    </span>
                  </div>
                )}
                <Dialog open={fabOpen} onOpenChange={setFabOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-6">
                      Adicionar <Plus className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl bg-background border-border/50">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold mb-4">Escolha o que deseja fazer</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <button onClick={() => { setFabOpen(false); setTransactionType('entrada'); setTransactionModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowUpRight className="h-8 w-8 text-green-500" />
                        <span className="font-medium text-sm text-center">Nova entrada na conta</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setTransactionType('saida'); setTransactionModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowDownRight className="h-8 w-8 text-red-500" />
                        <span className="font-medium text-sm text-center">Nova saída na conta</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setTransferModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <ArrowRightLeft className="h-8 w-8 text-blue-500" />
                        <span className="font-medium text-sm text-center">Nova transferência</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setCategoryModalOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <FolderPlus className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Nova categoria</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setManageCategoriesOpen(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <FolderTree className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Gerenciar categorias</span>
                      </button>
                      <button onClick={() => { setFabOpen(false); setShowAddModal(true); }} className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-accent transition-all">
                        <Landmark className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm text-center">Nova conta</span>
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setEditingAccount(selectedAccount)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex space-x-1 border-b border-border/50 mb-6">
              <button
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]",
                  activeTab === 'extrato'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
                onClick={() => setActiveTab('extrato')}
              >
                Extrato
              </button>
              <button
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]",
                  activeTab === 'maquininhas'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
                onClick={() => setActiveTab('maquininhas')}
              >
                Maquininhas
              </button>
              <button
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]",
                  activeTab === 'boletos'
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
                onClick={() => setActiveTab('boletos')}
              >
                Boletos
              </button>
            </div>

            {activeTab === 'extrato' ? (
              <>
                {/* Balance Card */}
                <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 relative overflow-hidden">
                  <div className="absolute right-4 top-4 opacity-10">
                    <Landmark size={80} />
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                    <p className="text-4xl font-bold mt-1">{formatCurrency(selectedAccount.current_balance || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Previsto: <span className="font-semibold">{formatCurrency(saldoPrevisto)}</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Resumo do Período */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Entradas recebidas</p>
                      <p className="text-lg font-bold text-green-500">+{formatCurrency(summaryEntries)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Saídas pagas</p>
                      <p className="text-lg font-bold text-red-500">-{formatCurrency(summaryExits)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Geração de caixa</p>
                      <p className={`text-lg font-bold ${geracaoCaixa >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {geracaoCaixa >= 0 ? '+' : ''}{formatCurrency(geracaoCaixa)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Saldo inicial</p>
                      <p className="text-lg font-bold">{formatCurrency(saldoInicial)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Saldo final</p>
                      <p className="text-lg font-bold">{formatCurrency(saldoFinal)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Evolução Últimos 7 dias */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Entradas e saídas (Últimos 7 dias)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last7Days}>
                          <XAxis dataKey="date" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Methods */}
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Formas de Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {paymentData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          <p className="text-sm">Sem dados de entradas</p>
                        </div>
                      ) : (
                        <>
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={paymentData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  dataKey="value"
                                >
                                  {paymentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            {paymentData.map(item => (
                              <div key={item.name} className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Saídas por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {categoryData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          <p className="text-sm">Sem dados de saídas</p>
                        </div>
                      ) : (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Transactions Table */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <CardTitle className="text-sm">Extrato</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                      <div className="relative w-full sm:w-[250px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por transação..."
                          className="pl-8 bg-background"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 h-9">
                              <Filter className="h-4 w-4" /> Filtros
                              {(filterType !== 'todos' || filterStatus !== 'todos') && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">Ativo</Badge>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80 border-border/50">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filtros do Extrato</h4>
                                <p className="text-sm text-muted-foreground">
                                  Refine as transações exibidas.
                                </p>
                              </div>
                              <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-full bg-background">
                                      <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todos">Todos</SelectItem>
                                      <SelectItem value="entrada">Entradas</SelectItem>
                                      <SelectItem value="saida">Saídas</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-full bg-background">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todos">Todos</SelectItem>
                                      <SelectItem value="pago">Conciliado</SelectItem>
                                      <SelectItem value="pendente">Pendente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border/50 mt-2">
                                  <Label>Ordenar por</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Select value={sortField} onValueChange={(val: any) => setSortField(val)}>
                                      <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder="Campo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="date">Data</SelectItem>
                                        <SelectItem value="name">Transação</SelectItem>
                                        <SelectItem value="amount">Valor</SelectItem>
                                        <SelectItem value="status">Status</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Select value={sortDirection} onValueChange={(val: any) => setSortDirection(val)}>
                                      <SelectTrigger className="w-full bg-background">
                                        <SelectValue placeholder="Direção" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="asc">Crescente</SelectItem>
                                        <SelectItem value="desc">Decrescente</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <div className="flex items-center bg-background border border-input rounded-md h-9">
                          <Button variant="ghost" size="icon" className="h-full w-9 rounded-none rounded-l-md hover:bg-muted" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 text-center text-sm font-medium px-4 capitalize min-w-[140px] text-foreground">
                            {format(parse(filterMonth, "yyyy-MM", new Date()), 'MMMM yyyy', { locale: ptBR })}
                          </div>
                          <Button variant="ghost" size="icon" className="h-full w-9 rounded-none rounded-r-md hover:bg-muted" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Nenhuma transação encontrada</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 🖥️ Visualização Desktop: Tabela Completa */}
                        <div className="hidden md:block rounded-md border border-border/50 overflow-x-auto overscroll-x-contain">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead
                                  className="min-w-[200px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                  onClick={() => toggleSort('name')}
                                >
                                  Transação <SortIcon field="name" />
                                </TableHead>
                                <TableHead>Conta</TableHead>
                                <TableHead className="text-center">Categoria</TableHead>
                                <TableHead
                                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                  onClick={() => toggleSort('amount')}
                                >
                                  Valor <SortIcon field="amount" />
                                </TableHead>
                                <TableHead
                                  className="text-center cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                  onClick={() => toggleSort('status')}
                                >
                                  <div className="flex items-center justify-center">Status <SortIcon field="status" /></div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {extratoGroups.map((group, index) => {
                                const renderTx = (tx: any, isChild: boolean = false) => {
                                  const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                                  const isEntry = tx.type === 'Entrada';
                                  const isTransfer = tx.payment_method === 'Transferência';
                                  const isTedFee = tx.name.includes("Taxa de TED/DOC");
                                  return (
                                    <TableRow key={tx.id} className={cn(isChild && "bg-muted/10 border-l-[3px] border-l-primary/30", isTedFee && "bg-yellow-500/5")}>
                                      <TableCell className={cn(isChild && "pl-8")}>
                                        <div className="flex items-center gap-3">
                                          <div className={cn("p-1.5 rounded-full flex-shrink-0", isTedFee ? "bg-yellow-500/20 text-yellow-600" : isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"))}>
                                            {isTedFee ? <Receipt className="h-3 w-3" /> : isTransfer ? <RefreshCw className="h-3 w-3" /> : (isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                                          </div>
                                          <div>
                                            <p className={cn("text-sm leading-none mb-1", isTedFee ? "font-bold text-yellow-600 dark:text-yellow-500" : "font-medium")}>{tx.name}</p>
                                            <span className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{selectedAccount?.name}</TableCell>
                                      <TableCell className="text-center">
                                        {category ? <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>{category.name}</Badge> : <span className="text-muted-foreground">-</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={cn("font-medium whitespace-nowrap", isEntry ? "text-green-500" : "text-red-500")}>
                                          {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Badge variant={tx.is_paid ? 'default' : 'secondary'} className={cn("text-[10px]", tx.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>{tx.is_paid ? 'Pago' : 'Pendente'}</Badge>
                                          {tx.is_paid && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleTogglePayment(tx, false); }} title="Reverter Pagamento">
                                              <RefreshCw className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                };

                                if (!group.isGroup) {
                                  return renderTx(group.originalTx);
                                }

                                const isExpanded = expandedExtratoGroups[group.id];
                                const type = group.type === 'Entrada';
                                const isTransfer = group.payment_method === 'Transferência';
                                return (
                                  <Fragment key={group.id}>
                                    <TableRow className="cursor-pointer hover:bg-muted/50 bg-muted/5 transition-colors group" onClick={(e) => toggleExtratoGroup(group.id, e as any)}>
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <div className="p-1.5 rounded-full flex-shrink-0 bg-primary/10 text-primary w-7 h-7 flex items-center justify-center font-bold text-[10px]">
                                            {group.transactions.length}x
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-semibold leading-none">{group.name}</p>
                                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Múltiplas datas agrupadas</span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{selectedAccount?.name}</TableCell>
                                      <TableCell className="text-center">
                                        {group.category_id && getCategoryById(group.category_id) ? (
                                          <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={{ borderColor: getCategoryById(group.category_id)?.color, color: getCategoryById(group.category_id)?.color }}>
                                            {getCategoryById(group.category_id)?.name}
                                          </Badge>
                                        ) : <span className="text-muted-foreground">-</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={cn("font-bold whitespace-nowrap", type ? "text-green-500" : "text-red-500")}>
                                          {type ? '+' : '-'}{formatCurrency(group.totalAmount || 0)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant={group.is_paid ? 'default' : 'outline'} className={cn("text-[10px]", group.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>{group.is_paid ? 'Total Pago' : 'Misto'}</Badge>
                                      </TableCell>
                                    </TableRow>
                                    {isExpanded && group.transactions.map(tx => renderTx(tx, true))}
                                  </Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* 📱 Visualização Mobile: Cards Empilhados */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                          {extratoGroups.map((group, index) => {
                            const renderCard = (tx: any, isChild: boolean = false) => {
                              const category = tx.category_id ? getCategoryById(tx.category_id) : null;
                              const isEntry = tx.type === 'Entrada';
                              const isTransfer = tx.payment_method === 'Transferência';
                              const isTedFee = tx.name.includes("Taxa de TED/DOC");

                              return (
                                <div key={tx.id} className={cn("p-4 space-y-3", isChild ? "bg-muted/10 border-t border-border/40 pl-6" : isTedFee ? "bg-yellow-500/5 border border-yellow-500/30 rounded-xl" : "bg-card/50 border border-border/50 rounded-xl")}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("p-1.5 rounded-full flex-shrink-0", isTedFee ? "bg-yellow-500/20 text-yellow-600" : isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"))}>
                                        {isTedFee ? <Receipt className="h-3.5 w-3.5" /> : isTransfer ? <RefreshCw className="h-3.5 w-3.5" /> : (isEntry ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
                                      </div>
                                      <div>
                                        <p className={cn("text-sm leading-snug", isTedFee ? "font-bold text-yellow-600 dark:text-yellow-500" : "font-semibold text-foreground")}>{tx.name}</p>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                      </div>
                                    </div>
                                    <span className={cn("font-bold text-sm whitespace-nowrap", isEntry ? "text-green-500" : "text-red-500")}>
                                      {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Landmark className="h-3 w-3" />
                                      <span>{selectedAccount?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {category && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal" style={{ borderColor: category.color || undefined, color: category.color || undefined }}>
                                          {category.name}
                                        </Badge>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <Badge variant={tx.is_paid ? 'default' : 'secondary'} className={cn("text-[10px] py-0 px-2 font-normal", tx.is_paid ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "")}>
                                          {tx.is_paid ? 'Pago' : 'Pendente'}
                                        </Badge>
                                        {tx.is_paid && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleTogglePayment(tx, false); }} title="Reverter Pagamento">
                                            <RefreshCw className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            };

                            if (!group.isGroup) {
                              return renderCard(group.originalTx);
                            }

                            const isExpanded = expandedExtratoGroups[group.id];
                            const type = group.type === 'Entrada';
                            const isTransfer = group.payment_method === 'Transferência';

                            return (
                              <div key={group.id} className="bg-card/50 border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                <div
                                  className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={(e) => toggleExtratoGroup(group.id, e as any)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-full flex-shrink-0 bg-primary/10 text-primary w-8 h-8 flex items-center justify-center font-bold text-[10px]">
                                        {group.transactions.length}x
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <p className="text-sm font-semibold text-foreground leading-snug">{group.name}</p>
                                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">Múltiplas parcelas</span>
                                      </div>
                                    </div>
                                    <span className={cn("font-bold text-sm whitespace-nowrap", type ? "text-green-500" : "text-red-500")}>
                                      {type ? '+' : '-'}{formatCurrency(group.totalAmount || 0)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Landmark className="h-3 w-3" />
                                      <span>{selectedAccount?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {group.category_id && getCategoryById(group.category_id) && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal" style={{ borderColor: getCategoryById(group.category_id)?.color, color: getCategoryById(group.category_id)?.color }}>
                                          {getCategoryById(group.category_id)?.name}
                                        </Badge>
                                      )}
                                      <Badge variant={group.is_paid ? 'default' : 'outline'} className={cn("text-[10px] py-0 px-2 font-normal", group.is_paid ? "bg-green-500/10 text-green-500" : "")}>
                                        {group.is_paid ? 'Total Pago' : 'Misto'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="divide-y divide-border/30 bg-muted/5">
                                    {group.transactions.map(tx => renderCard(tx, true))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Futuros Lançamentos */}
                {futureGroupsArray.length > 0 && (
                  <Card className="bg-card/50 border-border/50 mt-6">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-orange-500" />
                        Lançamentos Futuros e Parcelamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {futureGroupsArray.map(group => {
                          const isExpanded = expandedFutureGroups[group.name];

                          return (
                            <div key={group.name} className="border border-border/50 rounded-lg overflow-hidden">
                              {/* Header do Grupo */}
                              <div
                                className="bg-muted/30 p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => toggleFutureGroup(group.name)}
                              >
                                <div>
                                  <h4 className="font-semibold text-sm">{group.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Próximo venc.: {format(new Date(group.nextDate), "dd/MM/yyyy")} • {group.installmentsCount} {group.installmentsCount === 1 ? 'parcela' : 'parcelas'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-bold text-sm text-foreground">
                                    {formatCurrency(group.totalAmount)}
                                  </span>
                                  <div className="p-1.5 rounded-md bg-background border">
                                    {isExpanded ? <ArrowDownRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Body - Itens Expandidos */}
                              {isExpanded && (
                                <div className="bg-background divide-y divide-border/40">
                                  {group.transactions.map((tx, idx) => {
                                    const isTransfer = tx.payment_method === 'Transferência';
                                    const isEntry = tx.type === 'Entrada';

                                    return (
                                      <div key={tx.id} className="p-3 pl-6 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "p-1.5 rounded-full flex-shrink-0",
                                            isTransfer ? "bg-blue-500/10 text-blue-500" : (isEntry ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")
                                          )}>
                                            {isTransfer ? <RefreshCw className="h-3 w-3" /> : (isEntry ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium">{tx.name}</p>
                                            <span className="text-[10px] text-muted-foreground">Vencimento: {format(new Date(tx.transaction_date), "dd/MM/yyyy")}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="font-semibold text-sm whitespace-nowrap">
                                            {formatCurrency(tx.amount)}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border-green-500/20"
                                            onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(tx); }}
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                            Pagar
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : activeTab === 'maquininhas' ? (
              <CardMachinesList />
            ) : (
              <BoletoManagement accountId={selectedAccountId} onRefreshRequired={fetchData} />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p>Selecione ou crie uma conta para visualizar</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Criar Conta
              </Button>
            </div>
          </div>
        )}

        {/* Modals */}
        <AddAccountModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={handleAccountCreated}
        />
        <EditAccountModal
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          account={editingAccount}
          onAccountUpdated={handleAccountUpdated}
          onAccountDeleted={handleAccountDeleted}
          canDelete={accounts.length > 1}
        />
        <AddTransactionModal
          open={transactionModalOpen}
          onOpenChange={setTransactionModalOpen}
          type={transactionType}
          onSuccess={fetchData}
          defaultAccountId={selectedAccountId?.toString()}
        />
        <AddTransferModal
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          onSuccess={fetchData}
        />
        <NewCategoryModal
          open={categoryModalOpen}
          onOpenChange={setCategoryModalOpen}
          onSuccess={fetchData}
        />
        <ManageCategoriesModal
          open={manageCategoriesOpen}
          onOpenChange={setManageCategoriesOpen}
          onCategoriesChange={fetchData}
        />
      </div>
      {transactionToPay && companyId && (
        <ConfirmPurchasePaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          installmentAmount={transactionToPay.amount}
          companyId={companyId}
          defaultAccountId={transactionToPay.account_id}
          purchasePaymentMethod={transactionToPay.payment_method || "Pix"}
          onConfirm={handleConfirmPaymentTransactions}
        />
      )}
    </div>
  );
}


