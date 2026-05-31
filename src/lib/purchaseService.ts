import { supabase } from "@/integrations/supabase/client";
import { createExpenseTransaction, settleTransaction, reverseTransaction } from "./financialTransactions";

export interface Supplier {
  id: number;
  company_id: number;
  name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  company_id: number;
  supplier_id: number;
  supplier_name_snapshot: string;
  supplier_phone_snapshot: string | null;
  purchase_date: string;
  total_amount: number;
  remaining_amount: number;
  payment_method: string;
  installments_count: number;
  account_id: number;
  category_id: number;
  status: 'em_aberto' | 'paga' | 'atrasada';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInstallment {
  id: number;
  purchase_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pendente' | 'paga';
  paid_at: string | null;
  transaction_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  material_id: number | null;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface PurchaseAttachment {
  id: number;
  purchase_id: number;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'pdf';
  file_size: number;
  created_at: string;
}

export interface PurchaseMetrics {
  totalMonthDue: number;
  monthBillsCount: number;
  totalOpenPurchases: number;
  totalOverduePurchases: number;
}

export interface CreatePurchaseParams {
  companyId: number;
  supplierId: number;
  supplierNameSnapshot: string;
  supplierPhoneSnapshot?: string | null;
  purchaseDate: string;
  totalAmount: number;
  paymentMethod: string;
  installmentsCount: number;
  accountId: number;
  categoryId: number;
  notes?: string | null;
  createdBy: string;
  installments: {
    installmentNumber: number;
    amount: number;
    dueDate: string;
  }[];
  items?: {
    materialId?: number | null;
    description?: string | null;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
  }[];
}

/**
 * Cria uma compra no sistema, gerando as parcelas, itens e transações financeiras.
 */
export async function createPurchase(params: CreatePurchaseParams): Promise<{ id: number } | null> {
  try {
    const isImmediate = ["Pix", "Débito", "Dinheiro"].includes(params.paymentMethod);
    const initialStatus = isImmediate ? "paga" : "em_aberto";
    const remainingAmount = isImmediate ? 0 : params.totalAmount;

    // 1. Inserir a compra principal
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        company_id: params.companyId,
        supplier_id: params.supplierId,
        supplier_name_snapshot: params.supplierNameSnapshot,
        supplier_phone_snapshot: params.supplierPhoneSnapshot ?? null,
        purchase_date: params.purchaseDate,
        total_amount: params.totalAmount,
        remaining_amount: remainingAmount,
        payment_method: params.paymentMethod,
        installments_count: params.installmentsCount,
        account_id: params.accountId,
        category_id: params.categoryId,
        status: initialStatus,
        notes: params.notes ?? null,
        created_by: params.createdBy,
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      console.error("[PurchaseService] Error creating purchase:", purchaseError);
      return null;
    }

    const purchaseId = purchase.id;

    // 2. Inserir itens (opcional)
    if (params.items && params.items.length > 0) {
      const itemsToInsert = params.items.map(item => ({
        purchase_id: purchaseId,
        material_id: item.materialId ?? null,
        description: item.description ?? null,
        quantity: item.quantity,
        unit: item.unit ?? "un",
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("[PurchaseService] Error creating purchase items:", itemsError);
        // Exclusão em cascata cuidará de limpar se deletarmos, mas continuaremos por ser opcional ou tratar erro.
      }
    }

    // 3. Inserir parcelas e gerar transações financeiras
    const installmentDrafts = isImmediate
      ? [{ installmentNumber: 1, amount: params.totalAmount, dueDate: params.purchaseDate }]
      : params.installments;

    for (const inst of installmentDrafts) {
      // Inserir parcela com transaction_id temporariamente nulo
      const isPaid = isImmediate;
      const paidAt = isImmediate ? params.purchaseDate : null;

      const { data: installment, error: instError } = await supabase
        .from("purchase_installments")
        .insert({
          purchase_id: purchaseId,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: inst.dueDate,
          status: isPaid ? "paga" : "pendente",
          paid_at: paidAt ? new Date(paidAt).toISOString() : null,
        })
        .select("id")
        .single();

      if (instError || !installment) {
        console.error("[PurchaseService] Error creating purchase installment:", instError);
        continue;
      }

      // Criar transação financeira
      const txName = `Compra #${purchaseId} - ${params.supplierNameSnapshot} - Parcela ${inst.installmentNumber}/${installmentDrafts.length}`;
      const txResult = await createExpenseTransaction({
        name: txName,
        amount: inst.amount,
        transactionDate: inst.dueDate,
        companyId: params.companyId,
        accountId: params.accountId,
        isPaid: isPaid,
        categoryId: params.categoryId,
        description: `Parcela ${inst.installmentNumber} de ${installmentDrafts.length} da compra #${purchaseId}`,
        originType: "purchase_installment",
        originId: installment.id,
      });

      if (txResult) {
        // Vincular ID da transação na parcela
        await supabase
          .from("purchase_installments")
          .update({ transaction_id: txResult.id })
          .eq("id", installment.id);
      }
    }

    return { id: purchaseId };
  } catch (error) {
    console.error("[PurchaseService] Exception in createPurchase:", error);
    return null;
  }
}

/**
 * Recalcula e atualiza o remaining_amount e status de uma compra com base nas parcelas dela.
 */
export async function recalculatePurchaseStatus(purchaseId: number): Promise<void> {
  try {
    // 1. Buscar todas as parcelas da compra
    const { data: installments, error } = await supabase
      .from("purchase_installments")
      .select("amount, status, due_date")
      .eq("purchase_id", purchaseId);

    if (error || !installments) {
      console.error("[PurchaseService] Error fetching installments for status recalculation:", error);
      return;
    }

    // 2. Calcular restante
    const totalAmount = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    const paidAmount = installments
      .filter(inst => inst.status === "paga")
      .reduce((sum, inst) => sum + Number(inst.amount), 0);

    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    // 3. Determinar status da compra
    let status: 'paga' | 'em_aberto' | 'atrasada' = 'em_aberto';
    const today = new Date().toISOString().split("T")[0];

    const hasOverdue = installments.some(
      inst => inst.status === "pendente" && inst.due_date < today
    );

    if (remainingAmount === 0) {
      status = 'paga';
    } else if (hasOverdue) {
      status = 'atrasada';
    } else {
      status = 'em_aberto';
    }

    // 4. Atualizar compra
    await supabase
      .from("purchases")
      .update({
        remaining_amount: remainingAmount,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseId);
  } catch (error) {
    console.error("[PurchaseService] Exception in recalculatePurchaseStatus:", error);
  }
}

/**
 * Liquida (marca como paga) uma parcela específica de compra.
 */
export async function payInstallment(installmentId: number): Promise<boolean> {
  try {
    // 1. Buscar parcela
    const { data: installment, error } = await supabase
      .from("purchase_installments")
      .select("*")
      .eq("id", installmentId)
      .single();

    if (error || !installment) {
      console.error("[PurchaseService] Error fetching installment for payment:", error);
      return false;
    }

    if (installment.status === "paga") {
      // Idempotência
      return true;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Atualizar status no banco
    const { error: updateError } = await supabase
      .from("purchase_installments")
      .update({
        status: "paga",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", installmentId);

    if (updateError) {
      console.error("[PurchaseService] Error updating installment status:", updateError);
      return false;
    }

    // 3. Liquidar transação associada
    if (installment.transaction_id) {
      const settled = await settleTransaction({
        transactionId: installment.transaction_id,
        paymentDate: todayStr,
      });

      if (!settled) {
        console.warn("[PurchaseService] Could not settle financial transaction for installment", installmentId);
      }
    }

    // 4. Recalcular compra
    await recalculatePurchaseStatus(installment.purchase_id);
    return true;
  } catch (error) {
    console.error("[PurchaseService] Exception in payInstallment:", error);
    return false;
  }
}

/**
 * Reverte o pagamento (marca como pendente) de uma parcela específica.
 */
export async function reverseInstallment(installmentId: number): Promise<boolean> {
  try {
    // 1. Buscar parcela
    const { data: installment, error } = await supabase
      .from("purchase_installments")
      .select("*")
      .eq("id", installmentId)
      .single();

    if (error || !installment) {
      console.error("[PurchaseService] Error fetching installment for reversal:", error);
      return false;
    }

    if (installment.status === "pendente") {
      return true;
    }

    // 2. Atualizar status para pendente
    const { error: updateError } = await supabase
      .from("purchase_installments")
      .update({
        status: "pendente",
        paid_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installmentId);

    if (updateError) {
      console.error("[PurchaseService] Error reversing installment status:", updateError);
      return false;
    }

    // 3. Reverter transação (is_paid = false)
    if (installment.transaction_id) {
      const reversed = await reverseTransaction(installment.transaction_id, "unpay");
      if (!reversed.success) {
        console.warn("[PurchaseService] Could not reverse financial transaction:", reversed.error);
      }
    }

    // 4. Recalcular compra
    await recalculatePurchaseStatus(installment.purchase_id);
    return true;
  } catch (error) {
    console.error("[PurchaseService] Exception in reverseInstallment:", error);
    return false;
  }
}

/**
 * Exclui uma compra do sistema de forma limpa, removendo transações do financeiro,
 * anexos do storage e registros associados nas tabelas filhas.
 */
export async function deletePurchase(purchaseId: number, companyId: number): Promise<boolean> {
  try {
    // 1. Buscar todas as parcelas para obter IDs de transações financeiras
    const { data: installments, error: instError } = await supabase
      .from("purchase_installments")
      .select("id, transaction_id")
      .eq("purchase_id", purchaseId);

    if (instError) {
      console.error("[PurchaseService] Error fetching installments for delete:", instError);
      return false;
    }

    // 2. Deletar transações financeiras vinculadas (isso atualiza saldo via triggers se pagas)
    if (installments && installments.length > 0) {
      for (const inst of installments) {
        if (inst.transaction_id) {
          const revResult = await reverseTransaction(inst.transaction_id, "delete");
          if (!revResult.success) {
            console.warn("[PurchaseService] Could not delete financial transaction:", revResult.error);
          }
        }
      }
    }

    // 3. Buscar anexos para deletar os arquivos físicos no Storage
    const { data: attachments, error: attachError } = await supabase
      .from("purchase_attachments")
      .select("file_path")
      .eq("purchase_id", purchaseId);

    if (!attachError && attachments && attachments.length > 0) {
      const pathsToDelete = attachments.map(a => a.file_path);
      const { error: storageError } = await supabase.storage
        .from("purchase-attachments")
        .remove(pathsToDelete);

      if (storageError) {
        console.warn("[PurchaseService] Could not delete physical files from storage:", storageError);
      }
    }

    // 4. Deletar compra principal.
    // Como as tabelas 'purchase_installments', 'purchase_items' e 'purchase_attachments' têm
    // FOREIGN KEY com ON DELETE CASCADE, os registros filhos serão deletados automaticamente no Supabase.
    const { error: deleteError } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseId)
      .eq("company_id", companyId);

    if (deleteError) {
      console.error("[PurchaseService] Error deleting purchase:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[PurchaseService] Exception in deletePurchase:", error);
    return false;
  }
}

/**
 * Busca métricas consolidadas do módulo de compras para uma empresa.
 */
export async function fetchPurchaseMetrics(companyId: number): Promise<PurchaseMetrics> {
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // 1. Buscar todas as parcelas pendentes da empresa
    const { data: allPending, error: pendingError } = await supabase
      .from("purchase_installments")
      .select(`
        amount, due_date, status,
        purchases!inner (company_id)
      `)
      .eq("status", "pendente")
      .eq("purchases.company_id", companyId);

    if (pendingError) {
      console.error("[PurchaseService] Error fetching pending installments for metrics:", pendingError);
    }

    const pendingInstallments = allPending || [];

    // Calcular parcelas pendentes no mês atual
    const monthDueInstallments = pendingInstallments.filter(
      inst => inst.due_date >= monthStart && inst.due_date <= monthEnd
    );

    const totalMonthDue = monthDueInstallments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    const monthBillsCount = monthDueInstallments.length;

    // 2. Buscar compras em aberto e atrasadas
    // Podemos fazer isso olhando o status da compra na tabela purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from("purchases")
      .select("id, status")
      .eq("company_id", companyId);

    if (purchasesError) {
      console.error("[PurchaseService] Error fetching purchases for metrics:", purchasesError);
    }

    const purchasesList = purchases || [];
    const totalOpenPurchases = purchasesList.filter(p => p.status === "em_aberto" || p.status === "atrasada").length;
    
    // Atrasadas são aquelas cuja compra tem status 'atrasada'
    // E também recalculamos para garantir consistência
    const totalOverduePurchases = purchasesList.filter(p => p.status === "atrasada").length;

    return {
      totalMonthDue,
      monthBillsCount,
      totalOpenPurchases,
      totalOverduePurchases,
    };
  } catch (error) {
    console.error("[PurchaseService] Exception in fetchPurchaseMetrics:", error);
    return {
      totalMonthDue: 0,
      monthBillsCount: 0,
      totalOpenPurchases: 0,
      totalOverduePurchases: 0,
    };
  }
}

/**
 * Envia um arquivo anexo de compra para o Storage e registra metadados na tabela purchase_attachments.
 */
export async function uploadAttachment(
  file: File,
  purchaseId: number,
  companyId: number
): Promise<string | null> {
  try {
    // 1. Sanitizar nome do arquivo e gerar caminho único
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${companyId}/purchases/${purchaseId}/${timestamp}_${sanitizedName}`;

    // 2. Enviar arquivo para o Storage
    const { error: uploadError } = await supabase.storage
      .from("purchase-attachments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("[PurchaseService] Error uploading file to storage:", uploadError);
      return null;
    }

    // 3. Determinar tipo de arquivo (image ou pdf)
    const fileType = file.type.includes("pdf") ? "pdf" : "image";

    // 4. Criar metadados na tabela purchase_attachments
    const { error: dbError } = await supabase
      .from("purchase_attachments")
      .insert({
        purchase_id: purchaseId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
      });

    if (dbError) {
      console.error("[PurchaseService] Error saving attachment metadata:", dbError);
      // Opcional: remover do storage se falhar
      await supabase.storage.from("purchase-attachments").remove([filePath]);
      return null;
    }

    return filePath;
  } catch (error) {
    console.error("[PurchaseService] Exception in uploadAttachment:", error);
    return null;
  }
}
