import { useState } from "react";
import { format } from "date-fns";
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
import { FileText, Download, X } from "lucide-react";
import { SaleWithDetails } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateSalePDFReceipt, type SalePDFData } from "@/lib/pdfGenerator";
import { savePDFRecord } from "@/lib/pdfStorage";

interface PdfNotinhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
  size: "80mm" | "58mm";
}

const PdfNotinhaModal = ({ open, onOpenChange, sale, size }: PdfNotinhaModalProps) => {
  const [options, setOptions] = useState({
    companyName: true,
    saleNumber: true,
    clientName: true,
    clientWhatsApp: true,
    vehicle: true,
    serviceName: true,
    servicePrice: true,
    total: true,
    paymentMethod: true,
    subtotal: true,
    discount: true,
  });

  if (!sale) return null;

  const client = sale.client;
  const vehicle = sale.vehicle;
  const saleItems = sale.sale_items || [];

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    const pdfData: SalePDFData = {
      id: sale.id,
      date: sale.sale_date,
      client_name: client?.name || 'Cliente',
      client_phone: client?.phone || '',
      vehicle_brand: vehicle?.brand || '',
      vehicle_model: vehicle?.model || '',
      vehicle_plate: vehicle?.plate || '',
      vehicle_year: vehicle?.year || undefined,
      services: saleItems.map(item => ({
        name: item.service?.name || `Serviço #${item.service_id}`,
        description: '',
        price: item.total_price,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount || 0,
      total: sale.total,
      payment_method: sale.payment_method || 'Não informado',
      company_name: 'WFE EVOLUTION',
    };

    generateSalePDFReceipt(pdfData, size, options);
    savePDFRecord({
      filename: `venda-${sale.id}-${size}.pdf`,
      type: size === '80mm' ? 'Notinha 80mm' : 'Notinha 58mm',
      module: 'vendas',
      details: `Venda #${sale.id} - ${client?.name || 'Cliente'}`,
    });
    
    toast({
      title: "PDF gerado!",
      description: `Notinha ${size} baixada com sucesso.`,
    });
  };

  const previewWidth = size === "80mm" ? "w-[320px]" : "w-[220px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <FileText className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>PDF Notinha {size} - Configuração</DialogTitle>
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
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(options).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={value}
                    onCheckedChange={() => toggleOption(key as keyof typeof options)}
                  />
                  <Label htmlFor={key} className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <Card
              className={cn(
                previewWidth,
                "p-4 bg-white text-black text-xs font-mono"
              )}
            >
              {/* Logo/Header */}
              {options.companyName && (
                <div className="text-center mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-lg font-bold">WFE</span>
                  </div>
                  <p className="font-bold">WFE EVOLUTION</p>
                </div>
              )}

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Date */}
              <p className="text-center text-[10px] text-gray-600 mb-2">
                {format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm")}
              </p>

              {options.saleNumber && (
                <p className="text-center font-bold mb-2">Venda Nº {sale.id}</p>
              )}

              {/* Client */}
              {(options.clientName || options.clientWhatsApp) && (
                <div className="bg-gray-100 p-2 rounded mb-2">
                  <p className="font-bold text-[10px] text-gray-500 mb-1">
                    INFORMAÇÕES DO CLIENTE
                  </p>
                  {options.clientName && <p>Nome: {client?.name}</p>}
                  {options.clientWhatsApp && <p>Tel: {client?.phone}</p>}
                </div>
              )}

              {/* Vehicle */}
              {options.vehicle && vehicle && (
                <div className="bg-gray-100 p-2 rounded mb-2">
                  <p className="font-bold text-[10px] text-gray-500 mb-1">
                    DADOS DO VEÍCULO
                  </p>
                  <p>
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p>Placa: {vehicle.plate}</p>
                  <p>Ano: {vehicle.year}</p>
                </div>
              )}

              {/* Services */}
              {options.serviceName && saleItems.length > 0 && (
                <div className="bg-gray-100 p-2 rounded mb-2">
                  <p className="font-bold text-[10px] text-gray-500 mb-1">
                    SERVIÇOS REALIZADOS
                  </p>
                  {saleItems.map((item, idx) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {idx + 1}. {item.service?.name || `Serviço #${item.service_id}`}
                      </span>
                      {options.servicePrice && (
                        <span>R$ {item.total_price.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Totals */}
              <div className="bg-gray-100 p-2 rounded">
                <p className="font-bold text-[10px] text-gray-500 mb-1">
                  VALORES FINAIS
                </p>
                {options.subtotal && (
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {sale.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {options.discount && (sale.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>- R$ {(sale.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                {options.total && (
                  <div className="flex justify-between font-bold pt-1 border-t border-dashed mt-1">
                    <span>TOTAL:</span>
                    <span>R$ {sale.total.toFixed(2)}</span>
                  </div>
                )}
                {options.paymentMethod && (
                  <div className="flex justify-between mt-1">
                    <span>Pagamento:</span>
                    <span>{sale.payment_method || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              <p className="text-center text-[10px] text-gray-500">
                Obrigado pela preferência!
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfNotinhaModal;
