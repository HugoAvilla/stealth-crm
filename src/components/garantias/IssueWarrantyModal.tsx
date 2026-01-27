import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { warrantyTemplates, sales, getClientById, getVehicleById, getServiceById, companySettings } from "@/lib/mockData";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Download, FileText } from "lucide-react";
import wfeLogo from "@/assets/wfe-logo.png";

interface IssueWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueWarrantyModal({ open, onOpenChange }: IssueWarrantyModalProps) {
  const [saleId, setSaleId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [careInstructions, setCareInstructions] = useState(`• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado`);

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

  // Update terms when template changes
  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    const template = warrantyTemplates.find(t => t.id === parseInt(value));
    if (template) {
      setWarrantyTerms(template.terms);
    }
  };

  const handleSend = () => {
    if (!saleId || !templateId) {
      toast.error("Selecione a venda e o modelo de garantia");
      return;
    }

    const certNumber = `WFE-${Date.now().toString().slice(-6)}`;
    toast.success(`Certificado ${certNumber} enviado para ${selectedClient?.email}!`);
    onOpenChange(false);
    setSaleId("");
    setTemplateId("");
  };

  const handleDownload = () => {
    if (!saleId || !templateId) {
      toast.error("Selecione a venda e o modelo de garantia");
      return;
    }
    toast.success("Certificado baixado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Emitir Garantia</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="config" className="flex-1">Configurar</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Pré-visualizar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="config" className="px-6 pb-6 mt-4">
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
                  <Select value={templateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({template.validity_months} meses)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplate && (
                <>
                  <div className="space-y-2">
                    <Label>Termos da Garantia (Editável)</Label>
                    <Textarea
                      value={warrantyTerms}
                      onChange={e => setWarrantyTerms(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instruções de Cuidado (Editável)</Label>
                    <Textarea
                      value={careInstructions}
                      onChange={e => setCareInstructions(e.target.value)}
                      rows={5}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button variant="outline" onClick={handleDownload} disabled={!selectedTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
                <Button onClick={handleSend} disabled={!selectedTemplate}>
                  <Send className="h-4 w-4 mr-2" /> Enviar para Cliente
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="px-6 pb-6 mt-0">
            <ScrollArea className="h-[60vh] border rounded-lg bg-white text-black">
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={wfeLogo} alt="WFE" className="h-12 w-auto" />
                    <div>
                      <h2 className="font-bold text-lg">{companySettings.name}</h2>
                      <p className="text-xs text-gray-600">{companySettings.cnpj}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <p>{companySettings.phone}</p>
                    <p>{companySettings.email}</p>
                    <p>{companySettings.address}</p>
                  </div>
                </div>

                <Separator className="bg-gray-300" />

                {/* Sale Info */}
                {selectedSale && (
                  <div className="text-center">
                    <p className="font-semibold">
                      Venda Nº {selectedSale.id} realizada em {format(new Date(selectedSale.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}

                {/* Client Info */}
                {selectedClient && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-gray-600">Nome:</span> {selectedClient.name}</p>
                      <p><span className="text-gray-600">WhatsApp:</span> {selectedClient.phone}</p>
                      <p><span className="text-gray-600">Email:</span> {selectedClient.email}</p>
                      <p><span className="text-gray-600">CPF/CNPJ:</span> {selectedClient.cpf || 'Não informado'}</p>
                    </div>
                  </div>
                )}

                {/* Vehicle & Services */}
                {selectedVehicle && selectedSale && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Veículo e Serviços</h3>
                    <div className="text-sm mb-3">
                      <p><span className="text-gray-600">Veículo:</span> {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})</p>
                      <p><span className="text-gray-600">Placa:</span> {selectedVehicle.plate}</p>
                    </div>
                    
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2">Serviço</th>
                          <th className="text-right py-2">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.services.map(serviceId => {
                          const service = getServiceById(serviceId);
                          return service ? (
                            <tr key={serviceId} className="border-b border-gray-200">
                              <td className="py-2">{service.name}</td>
                              <td className="text-right py-2">R$ {service.price.toFixed(2)}</td>
                            </tr>
                          ) : null;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Warranty */}
                {selectedTemplate && (
                  <div className="border-2 border-primary rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-primary">{selectedTemplate.name}</h3>
                    </div>
                    <p className="text-sm mb-3">
                      <span className="font-semibold">Validade:</span> {selectedTemplate.validity_months} meses
                    </p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-1">Cobertura da Garantia:</p>
                        <p className="text-gray-700">{warrantyTerms}</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Instruções de Cuidado:</p>
                        <p className="text-gray-700 whitespace-pre-line">{careInstructions}</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800">
                        <strong>Observação:</strong> Esta garantia é intransferível e válida somente para o veículo e cliente especificados neste documento.
                      </div>
                    </div>
                  </div>
                )}

                {/* Values */}
                {selectedSale && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Valores</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Forma de Pagamento:</span>
                        <span>{selectedSale.payment_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>R$ {selectedSale.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Desconto:</span>
                          <span>- R$ {selectedSale.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                        <span>Total:</span>
                        <span>R$ {selectedSale.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!selectedSale && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Selecione uma venda para visualizar o certificado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
