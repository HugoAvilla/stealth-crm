import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { warrantyTemplates, sales, getClientById, getVehicleById, getServiceById } from "@/lib/mockData";
import { toast } from "sonner";

interface IssueWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueWarrantyModal({ open, onOpenChange }: IssueWarrantyModalProps) {
  const [saleId, setSaleId] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Get sales that have warranty-eligible services
  const eligibleSales = sales.filter(sale => 
    sale.services.some(serviceId => 
      warrantyTemplates.some(t => t.service_id === serviceId)
    )
  );

  const selectedSale = saleId ? sales.find(s => s.id === parseInt(saleId)) : null;
  const selectedClient = selectedSale ? getClientById(selectedSale.client_id) : null;
  const selectedVehicle = selectedSale ? getVehicleById(selectedSale.vehicle_id) : null;

  // Filter templates based on selected sale's services
  const availableTemplates = selectedSale
    ? warrantyTemplates.filter(t => selectedSale.services.includes(t.service_id))
    : [];

  const selectedTemplate = templateId ? warrantyTemplates.find(t => t.id === parseInt(templateId)) : null;

  const handleSubmit = () => {
    if (!saleId || !templateId) {
      toast.error("Selecione a venda e o modelo de garantia");
      return;
    }

    const certNumber = `WFE-${Date.now().toString().slice(-6)}`;
    toast.success(`Certificado ${certNumber} emitido com sucesso!`);
    onOpenChange(false);
    setSaleId("");
    setTemplateId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir Garantia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Venda *</Label>
            <Select value={saleId} onValueChange={(v) => { setSaleId(v); setTemplateId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma venda..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleSales.map(sale => {
                  const client = getClientById(sale.client_id);
                  const vehicle = getVehicleById(sale.vehicle_id);
                  return (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      #{sale.id} - {client?.name} ({vehicle?.plate})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedSale && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p><span className="text-muted-foreground">Cliente:</span> {selectedClient?.name}</p>
              <p><span className="text-muted-foreground">Veículo:</span> {selectedVehicle?.model} - {selectedVehicle?.plate}</p>
              <p><span className="text-muted-foreground">Email:</span> {selectedClient?.email}</p>
            </div>
          )}

          {selectedSale && (
            <div className="space-y-2">
              <Label>Modelo de Garantia *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(template => {
                    const service = getServiceById(template.service_id);
                    return (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({template.validity_months} meses)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTemplate && (
            <div className="p-3 rounded-lg bg-primary/10 text-sm">
              <p className="font-medium mb-1">{selectedTemplate.name}</p>
              <p className="text-xs text-muted-foreground">{selectedTemplate.terms}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              Emitir Certificado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
