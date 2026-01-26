import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, X } from "lucide-react";
import { Sale, getClientById, getVehicleById, getServiceById } from "@/lib/mockData";
import { toast } from "@/hooks/use-toast";

interface PdfA4ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

const PdfA4Modal = ({ open, onOpenChange, sale }: PdfA4ModalProps) => {
  const [options, setOptions] = useState({
    companyName: true,
    receiptText: true,
    saleNumber: true,
    clientName: true,
    clientWhatsApp: true,
    vehicle: true,
    serviceName: true,
    serviceDescription: true,
    servicePrice: true,
    total: true,
    paymentMethod: true,
    subtotal: true,
    discount: true,
    pendingValue: false,
  });

  if (!sale) return null;

  const client = getClientById(sale.client_id);
  const vehicle = getVehicleById(sale.vehicle_id);
  const saleServices = sale.services.map((id) => getServiceById(id)).filter(Boolean);

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    toast({
      title: "PDF gerado!",
      description: "O documento A4 foi gerado com sucesso.",
    });
    // In production, generate actual PDF
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <FileText className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>PDF A4 - Configuração</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} className="gap-2">
                <Download className="h-4 w-4" />
                Gerar
              </Button>
              <Button variant="destructive" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Selecione o que deseja incluir:</h3>

            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Dados institucionais</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="companyName"
                    checked={options.companyName}
                    onCheckedChange={() => toggleOption("companyName")}
                  />
                  <Label htmlFor="companyName">Nome empresa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="receiptText"
                    checked={options.receiptText}
                    onCheckedChange={() => toggleOption("receiptText")}
                  />
                  <Label htmlFor="receiptText">Texto comprovante</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="saleNumber"
                    checked={options.saleNumber}
                    onCheckedChange={() => toggleOption("saleNumber")}
                  />
                  <Label htmlFor="saleNumber">Número venda</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Dados do cliente</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clientName"
                    checked={options.clientName}
                    onCheckedChange={() => toggleOption("clientName")}
                  />
                  <Label htmlFor="clientName">Nome</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clientWhatsApp"
                    checked={options.clientWhatsApp}
                    onCheckedChange={() => toggleOption("clientWhatsApp")}
                  />
                  <Label htmlFor="clientWhatsApp">WhatsApp</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Dados do serviço</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vehicle"
                    checked={options.vehicle}
                    onCheckedChange={() => toggleOption("vehicle")}
                  />
                  <Label htmlFor="vehicle">Veículo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="serviceName"
                    checked={options.serviceName}
                    onCheckedChange={() => toggleOption("serviceName")}
                  />
                  <Label htmlFor="serviceName">Nome serviço</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="serviceDescription"
                    checked={options.serviceDescription}
                    onCheckedChange={() => toggleOption("serviceDescription")}
                  />
                  <Label htmlFor="serviceDescription">Descrição</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="servicePrice"
                    checked={options.servicePrice}
                    onCheckedChange={() => toggleOption("servicePrice")}
                  />
                  <Label htmlFor="servicePrice">Preço</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Dados financeiros</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paymentMethod"
                    checked={options.paymentMethod}
                    onCheckedChange={() => toggleOption("paymentMethod")}
                  />
                  <Label htmlFor="paymentMethod">Forma pagamento</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="subtotal"
                    checked={options.subtotal}
                    onCheckedChange={() => toggleOption("subtotal")}
                  />
                  <Label htmlFor="subtotal">Subtotal</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="discount"
                    checked={options.discount}
                    onCheckedChange={() => toggleOption("discount")}
                  />
                  <Label htmlFor="discount">Desconto</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="total"
                    checked={options.total}
                    onCheckedChange={() => toggleOption("total")}
                  />
                  <Label htmlFor="total">Total</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-medium">Preview</h3>
            <Card className="p-6 bg-white text-black min-h-[400px]">
              {/* Header */}
              {options.companyName && (
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold">WFE EVOLUTION</h1>
                  {options.receiptText && (
                    <p className="text-sm text-gray-600">Comprovante de Serviço</p>
                  )}
                  {options.saleNumber && (
                    <p className="text-sm">
                      Venda Nº {sale.id} realizada em{" "}
                      {format(new Date(sale.date), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              )}

              <Separator className="my-4 bg-gray-300" />

              {/* Client Info */}
              {(options.clientName || options.clientWhatsApp) && (
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <h3 className="font-semibold text-sm mb-2">Informações do Cliente</h3>
                  {options.clientName && <p className="text-sm">Nome: {client?.name}</p>}
                  {options.clientWhatsApp && (
                    <p className="text-sm">WhatsApp: {client?.phone}</p>
                  )}
                </div>
              )}

              {/* Vehicle & Services */}
              {options.vehicle && (
                <div className="mb-4">
                  <p className="text-sm font-semibold">
                    Veículo: {vehicle?.brand} {vehicle?.model} ({vehicle?.plate})
                  </p>
                </div>
              )}

              {options.serviceName && (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Serviço</th>
                      {options.servicePrice && <th className="text-right py-2">Valor</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {saleServices.map((service) => (
                      <tr key={service!.id} className="border-b">
                        <td className="py-2">
                          <p>{service!.name}</p>
                          {options.serviceDescription && (
                            <p className="text-xs text-gray-500">{service!.description}</p>
                          )}
                        </td>
                        {options.servicePrice && (
                          <td className="text-right py-2">
                            R$ {service!.price.toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Totals */}
              <div className="space-y-1 text-sm">
                {options.subtotal && (
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {sale.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {options.discount && sale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>- R$ {sale.discount.toFixed(2)}</span>
                  </div>
                )}
                {options.total && (
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>R$ {sale.total.toFixed(2)}</span>
                  </div>
                )}
                {options.paymentMethod && (
                  <div className="flex justify-between pt-2">
                    <span>Forma de Pagamento:</span>
                    <span>{sale.payment_method}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfA4Modal;
