import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sales, getClientById, getVehicleById, getServiceById, type Slot } from "@/lib/mockData";
import { toast } from "sonner";

interface NewSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: Slot | null;
  onSlotFilled: (slotId: number, saleId: number) => void;
}

export function NewSlotModal({ open, onOpenChange, slot, onSlotFilled }: NewSlotModalProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");

  const openSales = sales.filter(s => s.status === 'Aberta');

  const handleSubmit = () => {
    if (!slot || !selectedSaleId) {
      toast.error("Selecione uma venda");
      return;
    }

    onSlotFilled(slot.id, parseInt(selectedSaleId));
    toast.success(`${slot.name} preenchida com sucesso!`);
    setSelectedSaleId("");
  };

  const selectedSale = selectedSaleId ? sales.find(s => s.id === parseInt(selectedSaleId)) : null;
  const selectedClient = selectedSale ? getClientById(selectedSale.client_id) : null;
  const selectedVehicle = selectedSale ? getVehicleById(selectedSale.vehicle_id) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preencher {slot?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Venda em Aberto</Label>
            <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma venda..." />
              </SelectTrigger>
              <SelectContent>
                {openSales.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhuma venda em aberto</SelectItem>
                ) : (
                  openSales.map(sale => {
                    const client = getClientById(sale.client_id);
                    const vehicle = getVehicleById(sale.vehicle_id);
                    return (
                      <SelectItem key={sale.id} value={sale.id.toString()}>
                        #{sale.id} - {client?.name} ({vehicle?.model} - {vehicle?.plate})
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedSale && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{selectedClient?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Veículo:</span>
                <span className="font-medium">{selectedVehicle?.model} ({selectedVehicle?.plate})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Serviços:</span>
                <span className="font-medium text-right">
                  {selectedSale.services.map(id => getServiceById(id)?.name).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium text-primary">
                  R$ {selectedSale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!selectedSaleId}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
