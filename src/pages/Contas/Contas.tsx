// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Settings, Plus, Landmark, FolderPlus, FolderTree, ArrowRightLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";

// Modals
import { AddAccountModal } from "@/shared/components/financeiro/AddAccountModal";
import { EditAccountModal } from "./components/EditAccountModal";
import { AddTransactionModal } from "@/shared/components/financeiro/AddTransactionModal";
import { AddTransferModal } from "@/shared/components/financeiro/AddTransferModal";
import { NewCategoryModal } from "@/shared/components/financeiro/NewCategoryModal";
import { ManageCategoriesModal } from "@/shared/components/financeiro/ManageCategoriesModal";
import { ConfirmPurchasePaymentModal } from "@/pages/Compras/components/ConfirmPurchasePaymentModal";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalePayment } from "@/pages/Vendas/components/PaymentBlock";

// Sub-abas
import { Extrato } from "./sub-abas/Extrato/Extrato";
import { CardMachinesList } from "@/shared/components/financeiro/CardMachinesList";
import { BoletoManagement } from "@/shared/components/financeiro/BoletoManagement";

// Services and context
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { payInstallment, reverseInstallment, payInstallmentWithDetails } from "@/pages/Compras/services/purchaseService";

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

  const [fabOpen, setFabOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entrada' | 'saida'>('entrada');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState<Transaction | null>(null);

  const formatCurrency = (value: number) => {
    if (!showValues) return "••••••";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }
      setCompanyId(profile.company_id);

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("is_main", { ascending: false });

      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("transaction_date", { ascending: false });

      const { data: transfersData } = await supabase
        .from("transfers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("transfer_date", { ascending: false });

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
      allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setTransactions(allTransactions);
      setCategories(categoriesData || []);

      if (accountsData && accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedAccountId]);

  useEffect(() => {
    fetchData();
    const handleFinancialUpdate = () => fetchData();
    window.addEventListener("financial-data-changed", handleFinancialUpdate);
    return () => window.removeEventListener("financial-data-changed", handleFinancialUpdate);
  }, [user?.id, fetchData]);

  const selectedAccount = accounts.find(a => String(a.id) === String(selectedAccountId));
  const accountTransactions = transactions.filter(t => String(t.account_id) === String(selectedAccountId));

  const handleTogglePayment = async (tx: Transaction, newStatus: boolean) => {
    if (typeof tx.id === 'string' && tx.id.startsWith('transfer-')) {
      if (window.confirm("Deseja reverter esta transferência? Isso irá desfazer a transferência e remover eventuais taxas associadas.")) {
        const transferId = parseInt(tx.id.replace('transfer-in-', '').replace('transfer-out-', ''));
        await supabase.from("transactions").delete().eq("origin_type", "transfer_fee").eq("origin_id", transferId);
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
      if (!newStatus && tx.name.includes("Taxa de TED/DOC") && tx.origin_type === 'transfer_fee' && tx.origin_id) {
        await supabase.from("transfers").delete().eq("id", tx.origin_id);
        const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
        if (!error) {
          toast.success("Taxa e Transferência revertidas com sucesso! Os valores voltaram para as contas.");
          fetchData();
        }
        return;
      }
      if (!newStatus && tx.name.includes("Taxa de TED/DOC") && !tx.origin_type) {
        toast.info("Atenção: A taxa foi revertida, mas a transferência ainda consta. Exclua a transferência manualmente se desejar.");
        const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
        if (!error) fetchData();
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
        }
        return;
      }

      const { error } = await supabase.from('transactions').update({ is_paid: newStatus }).eq('id', tx.id);
      if (!error) {
        toast.success(newStatus ? "Lançamento confirmado!" : "Lançamento revertido!");
        fetchData();
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
        const purchasePayments = payments.map(p => ({ payment_method: p.payment_method, amount: p.amount, account_id: p.account_id }));
        const success = await payInstallmentWithDetails(transactionToPay.origin_id, purchasePayments);
        if (success) {
          fetchData();
          toast.success('Pagamento da compra confirmado e sincronizado!');
          setPaymentModalOpen(false);
          setTransactionToPay(null);
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
        if (rateData) finalNetAmount = p.amount * (1 - rateData.rate / 100);
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
          if (rateData) splitNetAmount = splitPayment.amount * (1 - rateData.rate / 100);
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
      toast.error('Erro ao atualizar status do lançamento.');
    }
  };

  const handleAccountCreated = () => fetchData();
  const handleAccountUpdated = () => fetchData();
  const handleAccountDeleted = (accountId: number) => {
    const remaining = accounts.filter(a => a.id !== accountId);
    if (selectedAccountId === accountId && remaining.length > 0) setSelectedAccountId(remaining[0].id);
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
          { title: "Vídeo Aula — Contas", description: "Assista ao tutorial...", videoUrl: "/help/video-aula-conta.mp4" },
          { title: "Selecionar Conta", description: "Veja detalhes da conta...", screenshotUrl: "/help/help-contas-selecionar.png" },
          { title: "Gráficos de Análise", description: "Veja distribuições...", screenshotUrl: "/help/help-contas-graficos.png" },
          { title: "Extrato Detalhado", description: "Transações em azul...", screenshotUrl: "/help/help-contas-extrato.png" },
        ]}
      />

      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-4 overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contas</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /></Button>
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
          <div className="flex md:flex-col gap-3 md:gap-2 md:space-y-0 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "min-w-[200px] md:min-w-0 w-full p-3 rounded-lg text-left transition-colors relative group flex-shrink-0",
                  selectedAccountId === account.id ? "bg-primary/10 border border-primary/30" : "bg-card/50 border border-border/50 hover:bg-accent"
                )}
              >
                <div onClick={(e) => toggleAccountSelection(account.id, e)} className={cn("absolute top-2 right-8 p-1 rounded transition-all flex items-center justify-center", selectedAccountsForTotal.includes(account.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                  <input type="checkbox" checked={selectedAccountsForTotal.includes(account.id)} readOnly className="w-3.5 h-3.5 cursor-pointer accent-primary" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditingAccount(account); }} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </button>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate pr-2">{account.name}</span>
                  {account.is_main && <Badge variant="outline" className="text-[10px] shrink-0">Principal</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1 mb-2">
                  {account.bank_code ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={account.bank_name || undefined}>
                      <img src={`/banks/${account.bank_code}.svg`} alt={account.bank_name || "Banco"} className="w-4 h-4 object-contain rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {selectedAccount ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {selectedAccount.bank_code ? (
                  <div className="w-12 h-12 rounded-xl bg-white border border-border/50 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                    <img src={`/banks/${selectedAccount.bank_code}.svg`} alt={selectedAccount.bank_name || "Banco"} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                    {selectedAccount.bank_name && <><span className="text-muted-foreground/50">•</span><span>{selectedAccount.bank_name}</span></>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:ml-auto justify-end mt-4 sm:mt-0">
                {selectedAccountsForTotal.length > 0 && (
                  <div className="bg-card border border-border/50 rounded-lg px-4 py-1.5 flex flex-col items-end shadow-sm animate-in fade-in slide-in-from-right-4">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Saldo Selecionado</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(accounts.filter(a => selectedAccountsForTotal.includes(a.id)).reduce((sum, a) => sum + (a.current_balance || 0), 0))}
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

            <div className="flex space-x-1 border-b border-border/50 mb-6">
              <button
                className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]", activeTab === 'extrato' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}
                onClick={() => setActiveTab('extrato')}
              >Extrato</button>
              <button
                className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]", activeTab === 'maquininhas' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}
                onClick={() => setActiveTab('maquininhas')}
              >Maquininhas</button>
              <button
                className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 relative top-[1px]", activeTab === 'boletos' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}
                onClick={() => setActiveTab('boletos')}
              >Boletos</button>
            </div>

            {activeTab === 'extrato' ? (
              <Extrato
                selectedAccount={selectedAccount}
                accounts={accounts}
                accountTransactions={accountTransactions}
                categories={categories}
                handleTogglePayment={handleTogglePayment}
                handleOpenPaymentModal={handleOpenPaymentModal}
                formatCurrency={formatCurrency}
              />
            ) : activeTab === 'maquininhas' ? (
              <CardMachinesList />
            ) : (
              <BoletoManagement accountId={selectedAccountId!} onRefreshRequired={fetchData} />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p>Selecione ou crie uma conta para visualizar</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4"><Plus className="h-4 w-4 mr-2" /> Criar Conta</Button>
            </div>
          </div>
        )}

        <AddAccountModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={handleAccountCreated} />
        <EditAccountModal open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)} account={editingAccount} onAccountUpdated={handleAccountUpdated} onAccountDeleted={handleAccountDeleted} canDelete={accounts.length > 1} />
        <AddTransactionModal open={transactionModalOpen} onOpenChange={setTransactionModalOpen} type={transactionType} onSuccess={fetchData} defaultAccountId={selectedAccountId?.toString()} />
        <AddTransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} onSuccess={fetchData} />
        <NewCategoryModal open={categoryModalOpen} onOpenChange={setCategoryModalOpen} onSuccess={fetchData} />
        <ManageCategoriesModal open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen} onCategoriesChange={fetchData} />
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
