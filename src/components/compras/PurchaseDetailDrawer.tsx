import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Download, Paperclip, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { payInstallment, payInstallmentWithDetails, reverseInstallment } from "@/lib/purchaseService";
import { toast } from "sonner";
import { Purchase, PurchaseInstallment, PurchaseItem, PurchaseAttachment } from "@/lib/database.types";
import { ConfirmPurchasePaymentModal } from "./ConfirmPurchasePaymentModal";

interface PurchaseDetailDrawerProps {
  purchaseId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PurchaseDetailDrawer({ purchaseId, open, onOpenChange, onUpdate }: PurchaseDetailDrawerProps) {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [installments, setInstallments] = useState<PurchaseInstallment[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{ id: number; amount: number } | null>(null);

  useEffect(() => {
    if (open && purchaseId) {
      fetchPurchaseDetails();
    }
  }, [open, purchaseId]);

  const fetchPurchaseDetails = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from("purchases").select("*").eq("id", purchaseId).single();
      if (pData) setPurchase(pData);

      const { data: instData } = await supabase.from("purchase_installments").select("*").eq("purchase_id", purchaseId).order("installment_number");
      if (instData) setInstallments(instData);

      const { data: itemsData } = await supabase.from("purchase_items").select("*").eq("purchase_id", purchaseId);
      if (itemsData) setItems(itemsData);

      const { data: attData } = await supabase.from("purchase_attachments").select("*").eq("purchase_id", purchaseId);
      if (attData) setAttachments(attData);

    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (instId: number, amount: number) => {
    setSelectedInstallment({ id: instId, amount });
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (paymentsList: any[]) => {
    if (!selectedInstallment) return;

    const paymentDetails = paymentsList.map(p => ({
      payment_method: p.payment_method,
      amount: p.amount,
      account_id: p.account_id
    }));

    const success = await payInstallmentWithDetails(selectedInstallment.id, paymentDetails);
    if (success) {
      toast.success("Pagamento registrado com sucesso!");
      fetchPurchaseDetails();
      onUpdate();
    } else {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  const handleReverse = async (instId: number) => {
    const success = await reverseInstallment(instId);
    if (success) {
      toast.success("Pagamento revertido com sucesso!");
      fetchPurchaseDetails();
      onUpdate();
    } else {
      toast.error("Erro ao reverter parcela.");
    }
  };

  const downloadAttachment = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage.from("purchase-attachments").createSignedUrl(path, 60);
      if (error || !data) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      toast.error("Erro ao gerar link de download.");
    }
  };

  if (!purchase) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            Compra #{purchase.id}
            {purchase.status === 'paga' && <Badge className="bg-green-500">Paga</Badge>}
            {purchase.status === 'em_aberto' && <Badge variant="outline" className="text-amber-600 border-amber-600">Em Aberto</Badge>}
            {purchase.status === 'atrasada' && <Badge variant="destructive">Atrasada</Badge>}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Resumo</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Fornecedor:</span>
                <span className="font-medium text-right">{purchase.supplier_name_snapshot}</span>
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium text-right">{format(new Date(purchase.purchase_date + 'T12:00:00'), "dd/MM/yyyy")}</span>
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-medium text-right">R$ {Number(purchase.total_amount).toFixed(2)}</span>
                <span className="text-muted-foreground">Forma de Pgto:</span>
                <span className="font-medium text-right">{purchase.payment_method}</span>
              </div>
            </div>

            <Separator />

            {items.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Itens Comprados</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm bg-muted/20 p-2 rounded-md">
                      <span>{item.quantity}x {item.description || "Material Genérico"}</span>
                      <span className="font-medium">R$ {Number(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Parcelas ({purchase.installments_count})</h3>
              <div className="space-y-3">
                {installments.map(inst => (
                  <div key={inst.id} className="p-3 border rounded-md shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Parcela {inst.installment_number}</span>
                      {inst.status === 'paga' ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Paga</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">Pendente</Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-lg font-bold">R$ {Number(inst.amount).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Venc: {format(new Date(inst.due_date + 'T12:00:00'), "dd/MM/yyyy")}</div>
                      </div>
                      <div>
                        {inst.status !== 'paga' ? (
                          <Button size="sm" variant="outline" className="border-green-500/50 text-green-600 hover:bg-green-50" onClick={() => handleOpenPaymentModal(inst.id, Number(inst.amount))}>
                            <Check className="h-4 w-4 mr-1" /> Pagar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleReverse(inst.id)}>
                            <Undo2 className="h-4 w-4 mr-1" /> Reverter
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Anexos</h3>
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex justify-between items-center text-sm border p-2 rounded-md">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{att.file_name}</span>
                        </div>
                        <Button size="sm" variant="secondary" className="flex-shrink-0" onClick={() => downloadAttachment(att.file_path, att.file_name)}>
                          <Download className="h-3 w-3 mr-1" /> Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
      {selectedInstallment && (
        <ConfirmPurchasePaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          installmentAmount={selectedInstallment.amount}
          companyId={purchase.company_id}
          defaultAccountId={purchase.account_id}
          onConfirm={handleConfirmPayment}
        />
      )}
    </Sheet>
  );
}
