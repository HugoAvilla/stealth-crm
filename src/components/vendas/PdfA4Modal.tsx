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
import { SaleWithDetails, DetailedServiceItemDB } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { generateSalePDFA4, type SalePDFData } from "@/lib/pdfGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PdfA4ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
}

const PdfA4Modal = ({ open, onOpenChange, sale }: PdfA4ModalProps) => {
  const { user } = useAuth();
  
  const { data: companyData } = useQuery({
    queryKey: ['company-details', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.companyId)
        .single();
        
      if (error) {
        console.error('Error fetching company:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.companyId && open,
  });

  const { data: clientDetails } = useQuery({
    queryKey: ['client-details-a4', sale?.client_id],
    queryFn: async () => {
      if (!sale?.client_id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', sale.client_id)
        .single();
        
      if (error) {
        console.error('Error fetching client details:', error);
        return null;
      }
      return data;
    },
    enabled: !!sale?.client_id && open,
  });

  const { data: detailedItems } = useQuery({
    queryKey: ['sale-detailed-items-a4', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const { data, error } = await supabase
        .from('service_items_detailed')
        .select(`
          *,
          product_type:product_types(brand, name, model, category, light_transmission),
          region:vehicle_regions(name, description)
        `)
        .eq('sale_id', sale.id);
      
      if (error) {
        console.error('Error fetching detailed items:', error);
        return [];
      }
      return (data || []) as DetailedServiceItemDB[];
    },
    enabled: !!sale?.id && open,
  });

  const [options, setOptions] = useState({
    companyName: true,
    companyCnpj: true,
    receiptText: true,
    saleNumber: true,
    clientName: true,
    clientWhatsApp: true,
    clientCpf: true,
    clientEmail: true,
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

  const client = sale.client;
  const vehicle = sale.vehicle;
  const saleItems = sale.sale_items || [];

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formattedServices = detailedItems && detailedItems.length > 0
    ? detailedItems.map(item => {
        const prod = item.product_type;
        const prodInfo = prod
          ? `${prod.brand} ${prod.name}${prod.light_transmission ? ` ${prod.light_transmission}` : ''}`
          : '';
        const descParts = [];
        if (prodInfo) descParts.push(`Produto: ${prodInfo}`);
        if (item.notes) descParts.push(`Obs: ${item.notes}`);
        
        return {
          id: item.id,
          name: `${item.display_name || item.region?.name || item.service_name || 'Serviço'} (${item.category})`,
          description: descParts.join(' | '),
          price: item.total_price,
        };
      })
    : saleItems.map(item => ({
        id: item.id,
        name: item.service?.name || `Serviço #${item.service_id}`,
        description: '',
        price: item.total_price,
      }));

  const handleGenerate = () => {
    const pdfData: SalePDFData = {
      id: sale.id,
      date: sale.sale_date,
      client_name: client?.name || 'Cliente',
      client_phone: client?.phone || '',
      client_email: clientDetails?.email || '',
      client_cpf: clientDetails?.cpf_cnpj || '',
      vehicle_brand: vehicle?.brand || '',
      vehicle_model: vehicle?.model || '',
      vehicle_plate: vehicle?.plate || '',
      vehicle_year: vehicle?.year || undefined,
      services: formattedServices.map(item => ({
        name: item.name,
        description: item.description,
        price: item.price,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount || 0,
      total: sale.total,
      payment_method: sale.payment_method || 'Não informado',
      company_name: companyData?.company_name || 'EMPRESA',
      company_cnpj: companyData?.cnpj || '',
    };

    generateSalePDFA4(pdfData, options, user?.companyId || undefined);
    
    toast({
      title: "PDF gerado!",
      description: "O documento A4 foi baixado com sucesso.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" confirmClose={false}>
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
                    id="companyCnpj"
                    checked={options.companyCnpj}
                    onCheckedChange={() => toggleOption("companyCnpj")}
                  />
                  <Label htmlFor="companyCnpj">CNPJ empresa</Label>
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clientCpf"
                    checked={options.clientCpf}
                    onCheckedChange={() => toggleOption("clientCpf")}
                  />
                  <Label htmlFor="clientCpf">CPF</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clientEmail"
                    checked={options.clientEmail}
                    onCheckedChange={() => toggleOption("clientEmail")}
                  />
                  <Label htmlFor="clientEmail">Email</Label>
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
                  <h1 className="text-xl font-bold">{companyData?.company_name || 'NOME DA EMPRESA'}</h1>
                  {options.companyCnpj && companyData?.cnpj && (
                    <p className="text-xs text-gray-500">CNPJ: {companyData.cnpj}</p>
                  )}
                  {options.receiptText && (
                    <p className="text-sm text-gray-600">Comprovante de Serviço</p>
                  )}
                  {options.saleNumber && (
                    <p className="text-sm">
                      Venda Nº {sale.id} realizada em{" "}
                      {format(new Date(sale.sale_date), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              )}

              <Separator className="my-4 bg-gray-300" />

              {/* Client Info */}
              {(options.clientName || options.clientWhatsApp || options.clientCpf || options.clientEmail) && (
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <h3 className="font-semibold text-sm mb-2">Informações do Cliente</h3>
                  {options.clientName && <p className="text-sm">Nome: {client?.name}</p>}
                  {options.clientWhatsApp && (
                    <p className="text-sm">WhatsApp: {client?.phone}</p>
                  )}
                  {options.clientCpf && clientDetails?.cpf_cnpj && (
                    <p className="text-sm">CPF/CNPJ: {clientDetails.cpf_cnpj}</p>
                  )}
                  {options.clientEmail && clientDetails?.email && (
                    <p className="text-sm">Email: {clientDetails.email}</p>
                  )}
                </div>
              )}

              {/* Vehicle & Services */}
              {options.vehicle && vehicle && (
                <div className="mb-4">
                  <p className="text-sm font-semibold">
                    Veículo: {vehicle.brand} {vehicle.model} ({vehicle.plate})
                  </p>
                </div>
              )}

              {options.serviceName && formattedServices.length > 0 && (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Serviço</th>
                      {options.serviceDescription && <th className="text-left py-2">Descrição</th>}
                      {options.servicePrice && <th className="text-right py-2">Valor</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formattedServices.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">
                          <p>{item.name}</p>
                        </td>
                        {options.serviceDescription && (
                          <td className="py-2 text-gray-600 text-xs">
                            {item.description}
                          </td>
                        )}
                        {options.servicePrice && (
                          <td className="text-right py-2">
                            R$ {item.price.toFixed(2)}
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
                {options.discount && (sale.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>- R$ {(sale.discount || 0).toFixed(2)}</span>
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
                    <span>{sale.payment_method || 'Não informado'}</span>
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
