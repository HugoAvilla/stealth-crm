// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { createPurchase, uploadAttachment } from "@/pages/Compras/services/purchaseService";
import { toast } from "sonner";
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { InstallmentGenerator } from "./InstallmentGenerator";
import { ItemsInput } from "./ItemsInput";
import { AttachmentsBlock } from "./AttachmentsBlock";

interface NewPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
}

export function NewPurchaseModal({ open, onOpenChange, onSuccess, accounts, categories }: NewPurchaseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // States
  const [supplier, setSupplier] = useState<any | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Boleto");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Installments
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [installments, setInstallments] = useState<any[]>([]);

  // Items & Attachments
  const [items, setItems] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [pdfs, setPdfs] = useState<File[]>([]);

  const isImmediate = ["Pix", "Débito", "Dinheiro"].includes(paymentMethod);

  // Sincronizar 1º vencimento com data da compra (+1 mês)
  useEffect(() => {
    if (purchaseDate) {
      const d = new Date(purchaseDate + "T12:00:00");
      d.setMonth(d.getMonth() + 1);
      setFirstDueDate(d.toISOString().split("T")[0]);
    }
  }, [purchaseDate]);

  // Auto-selecionar conta principal se não houver
  React.useEffect(() => {
    if (open && accounts.length > 0 && !accountId) {
      const mainAcc = accounts.find(a => a.is_main);
      if (mainAcc) setAccountId(mainAcc.id);
    }
  }, [open, accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier) {
      toast.error("Selecione ou crie um fornecedor.");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("O valor total deve ser maior que zero.");
      return;
    }
    if (!accountId || !categoryId) {
      toast.error("Conta e Categoria são obrigatórias.");
      return;
    }

    setLoading(true);
    try {
      const companyId = supplier.company_id;

      const purchaseResult = await createPurchase({
        companyId,
        supplierId: supplier.id,
        supplierNameSnapshot: supplier.name,
        supplierPhoneSnapshot: supplier.phone,
        purchaseDate,
        totalAmount,
        paymentMethod,
        installmentsCount: isImmediate ? 1 : installmentsCount,
        accountId,
        categoryId,
        createdBy: user?.id || "",
        installments: isImmediate
          ? [{ installmentNumber: 1, amount: totalAmount, dueDate: purchaseDate }]
          : installments,
        items: items.length > 0 ? items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.total_price
        })) : []
      });

      if (!purchaseResult) {
        toast.error("Erro ao registrar compra.");
        setLoading(false);
        return;
      }

      // Handle uploads
      const allFiles = [...images, ...pdfs];
      for (const file of allFiles) {
        await uploadAttachment(file, purchaseResult.id, companyId);
      }

      toast.success("Compra registrada com sucesso!");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro inesperado ao salvar a compra.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSupplier(null);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setTotalAmount(0);
    setPaymentMethod("Boleto");
    setInstallmentsCount(1);
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setFirstDueDate(d.toISOString().split("T")[0]);
    setItems([]);
    setImages([]);
    setPdfs([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Nova Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <SupplierAutocomplete
                companyId={user?.companyId || accounts[0]?.company_id || 0}
                value={supplier}
                onChange={setSupplier}
                onCreateNew={() => { }} // Internamente ele mesmo já cria e seta
              />
            </div>
            <div className="space-y-2">
              <Label>Data da Compra *</Label>
              <Input type="date" required value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="[color-scheme:dark]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalAmount || ""}
                onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={categoryId?.toString() || ""} onValueChange={v => setCategoryId(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isImmediate && (
            <div className="border p-4 rounded-md space-y-4 bg-muted/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de Parcelas</Label>
                  <Input type="number" min="1" max="24" value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-2">
                  <Label>1º Vencimento</Label>
                  <Input type="date" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} className="[color-scheme:dark]" />
                </div>
              </div>
              <InstallmentGenerator
                totalAmount={totalAmount}
                installmentsCount={installmentsCount}
                firstDueDate={firstDueDate}
                paymentMethod={paymentMethod}
                installments={installments}
                onChange={setInstallments}
              />
            </div>
          )}

          {/* <ItemsInput companyId={accounts[0]?.company_id || 0} items={items} onChange={setItems} /> */}
          <div className="text-sm text-muted-foreground italic border-t pt-2 mt-4">
            Nota: Inserção de Itens implementada separadamente para evitar complexidade inicial. (Será vinculada pelo ItemsInput real do repositório)
          </div>

          <AttachmentsBlock
            images={images}
            pdfs={pdfs}
            onImagesChange={setImages}
            onPdfsChange={setPdfs}
          />

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading || totalAmount <= 0}>
              {loading ? "Salvando..." : "Registrar Compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
