import { supabase } from "@/integrations/supabase/client";

// ===================================================
// Serviço centralizado de transações financeiras
// TODA operação que cria/modifica/reverte transações
// DEVE usar este módulo.
// ===================================================

// ------- Tipos -------

export type TransactionOriginType =
  | "sale"
  | "sale_payment"
  | "boleto_installment"
  | "space_payment"
  | "roas"
  | "manual";

export interface CreateTransactionParams {
  name: string;
  amount: number;
  type: "Entrada" | "Saida";
  transactionDate: string;
  accountId: number;
  companyId: number;
  isPaid: boolean;
  paymentMethod?: string | null;
  saleId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  description?: string | null;
  originType?: TransactionOriginType;
  originId?: number | null;
  salePaymentId?: number | null;
}

export interface CreateSaleTransactionParams {
  saleId: number;
  saleTotal: number;
  clientName: string;
  paymentMethod: string | null;
  saleDate: string;
  companyId: number;
  accountId?: number | null;
  isPaid: boolean;
  salePaymentId?: number | null;
  installments?: number;
  netAmount?: number;
  /** Sufixo descritivo, ex: "Parcela 1/3" */
  nameSuffix?: string;
}

export interface SettleTransactionParams {
  transactionId: number;
  paymentDate?: string;
  paidAmount?: number;
}

export interface ReverseTransactionResult {
  success: boolean;
  error?: string;
}

// ------- Helpers -------

/**
 * Busca a conta principal da empresa.
 * Retorna o ID ou null se não encontrar.
 */
async function getMainAccountId(companyId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_main", true)
    .single();

  if (error || !data) {
    console.warn("[FinTx] Main account not found for company", companyId);
    return null;
  }
  return data.id;
}

// ------- API Pública -------

/**
 * Cria uma transação financeira genérica.
 * O trigger do banco garante a atualização do saldo.
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      name: params.name,
      amount: params.amount,
      type: params.type,
      transaction_date: params.transactionDate,
      account_id: params.accountId,
      company_id: params.companyId,
      is_paid: params.isPaid,
      payment_method: params.paymentMethod ?? null,
      sale_id: params.saleId ?? null,
      category_id: params.categoryId ?? null,
      subcategory_id: params.subcategoryId ?? null,
      description: params.description ?? null,
      origin_type: params.originType ?? null,
      origin_id: params.originId ?? null,
      sale_payment_id: params.salePaymentId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[FinTx] Error creating transaction:", error);
    return null;
  }

  return data;
}

/**
 * Cria a transação de uma venda.
 * - Pagamento imediato: is_paid = true → trigger credita saldo
 * - Boleto: is_paid = false → saldo inalterado, parcelas geram liquidação
 */
export async function createSaleTransaction(
  params: CreateSaleTransactionParams
): Promise<{ id: number } | null> {
  let targetAccountId = params.accountId;

  if (!targetAccountId) {
    targetAccountId = await getMainAccountId(params.companyId);
    if (!targetAccountId) return null;
  }

  const suffix = params.nameSuffix ? ` - ${params.nameSuffix}` : "";
  const description =
    params.installments && params.installments > 1
      ? `Venda em ${params.installments}x${suffix}`
      : suffix || null;

  return createTransaction({
    name: `Venda #${params.saleId} - ${params.clientName}`,
    amount: params.netAmount ?? params.saleTotal,
    type: "Entrada",
    transactionDate: params.saleDate,
    accountId: targetAccountId,
    companyId: params.companyId,
    isPaid: params.isPaid,
    paymentMethod: params.paymentMethod,
    saleId: params.saleId,
    description,
    originType: params.salePaymentId ? "sale_payment" : "sale",
    originId: params.salePaymentId ?? params.saleId,
    salePaymentId: params.salePaymentId,
  });
}

/**
 * Cria N transações pendentes para parcelas de boleto.
 * Cada transação fica com is_paid=false e vinculada ao boleto_installment.
 */
export async function createBoletoInstallmentTransactions(params: {
  saleId: number;
  clientName: string;
  saleDate: string;
  companyId: number;
  accountId: number;
  installments: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: string;
    installmentId: number; // boleto_installments.id
  }>;
}): Promise<boolean> {
  for (const inst of params.installments) {
    const txResult = await createTransaction({
      name: `Boleto #${params.saleId} - ${params.clientName} - Parcela ${inst.installmentNumber}/${params.installments.length}`,
      amount: inst.amount,
      type: "Entrada",
      transactionDate: inst.dueDate,
      accountId: params.accountId,
      companyId: params.companyId,
      isPaid: false,
      paymentMethod: "Boleto",
      saleId: params.saleId,
      description: `Parcela ${inst.installmentNumber} de ${params.installments.length}`,
      originType: "boleto_installment",
      originId: inst.installmentId,
    });

    if (!txResult) {
      console.error(
        `[FinTx] Failed to create tx for installment ${inst.installmentNumber}`
      );
      return false;
    }

    // Vincular transaction_id na parcela
    await supabase
      .from("boleto_installments")
      .update({ transaction_id: txResult.id })
      .eq("id", inst.installmentId);
  }

  return true;
}

/**
 * Liquida uma transação pendente (marca como paga).
 * O trigger do banco atualiza o saldo automaticamente.
 */
export async function settleTransaction(
  params: SettleTransactionParams
): Promise<boolean> {
  const { error } = await supabase
    .from("transactions")
    .update({
      is_paid: true,
      transaction_date: params.paymentDate ?? new Date().toISOString().split("T")[0],
      ...(params.paidAmount !== undefined ? { amount: params.paidAmount } : {}),
    })
    .eq("id", params.transactionId);

  if (error) {
    console.error("[FinTx] Error settling transaction:", error);
    return false;
  }

  return true;
}

/**
 * Reverte uma transação existente:
 * - Se é paga, marca como não-paga (trigger subtrai do saldo)
 * - Alternativa: deleta a transação (trigger de DELETE subtrai do saldo)
 * 
 * Usa update para manter histórico. Delete é mais agressivo.
 */
export async function reverseTransaction(
  transactionId: number,
  mode: "unpay" | "delete" = "unpay"
): Promise<ReverseTransactionResult> {
  if (mode === "delete") {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);

    if (error) {
      console.error("[FinTx] Error deleting transaction:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  // mode === "unpay"
  const { error } = await supabase
    .from("transactions")
    .update({ is_paid: false })
    .eq("id", transactionId);

  if (error) {
    console.error("[FinTx] Error reversing transaction:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Reverte TODAS transações vinculadas a uma venda.
 * Usado ao cancelar/editar uma venda.
 * Retorna quantas transações foram revertidas.
 */
export async function reverseAllSaleTransactions(
  saleId: number,
  mode: "unpay" | "delete" = "delete"
): Promise<{ success: boolean; count: number }> {
  // Primeiro busca todas as transações da venda
  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id, is_paid")
    .eq("sale_id", saleId);

  if (fetchError) {
    console.error("[FinTx] Error fetching sale transactions:", fetchError);
    return { success: false, count: 0 };
  }

  if (!transactions || transactions.length === 0) {
    return { success: true, count: 0 };
  }

  let reversed = 0;
  for (const tx of transactions) {
    const result = await reverseTransaction(tx.id, mode);
    if (result.success) reversed++;
  }

  return { success: reversed === transactions.length, count: reversed };
}

/**
 * Busca transação por origem (idempotência).
 * Evita duplicatas ao re-executar um fluxo.
 */
export async function findTransactionByOrigin(
  originType: TransactionOriginType,
  originId: number
): Promise<{ id: number; is_paid: boolean } | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, is_paid")
    .eq("origin_type", originType)
    .eq("origin_id", originId)
    .maybeSingle();

  if (error) {
    console.error("[FinTx] Error finding transaction by origin:", error);
    return null;
  }

  return data;
}

/**
 * Cria uma transação de despesa (ROAS, fornecedores, etc).
 * Garante que usa type="Saida" e is_paid corretamente.
 */
export async function createExpenseTransaction(params: {
  name: string;
  amount: number;
  transactionDate: string;
  companyId: number;
  accountId: number;
  isPaid: boolean;
  categoryId?: number | null;
  subcategoryId?: number | null;
  description?: string | null;
  originType?: TransactionOriginType;
  originId?: number | null;
}): Promise<{ id: number } | null> {
  return createTransaction({
    ...params,
    type: "Saida",
    paymentMethod: null,
  });
}
