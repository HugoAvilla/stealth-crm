import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Download, FileText, MessageCircle, Shield } from "lucide-react";
import wfeLogo from "@/assets/wfe-logo.png";
import { generateWarrantyPDF, type WarrantyPDFData } from "@/lib/pdfGenerator";
import { getPDFProxyUrl } from "@/lib/pdfStorage";
import { WarrantyWhatsAppModal } from "./WarrantyWhatsAppModal";

interface IssueWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WarrantyTemplate {
  id: number;
  name: string;
  validity_months: number;
  terms: string | null;
  coverage: string | null;
  restrictions?: string | null;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  client_id: number | null;
}

interface IssuedWarrantyData {
  certNumber: string;
  clientName: string;
  clientPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string | null;
  serviceName: string;
  issueDate: string;
  expiryDate: string;
  warrantyTerms: string;
  pdfLink: string;
}

interface CompanyInfo {
  company_name: string;
  logo_url: string | null;
  cnpj: string | null;
  phone: string;
  email: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

export function IssueWarrantyModal({ open, onOpenChange }: IssueWarrantyModalProps) {
  const { user } = useAuth();
  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [issuedData, setIssuedData] = useState<IssuedWarrantyData | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [careInstructions, setCareInstructions] = useState(`• Lavar o veículo somente após 7 dias da aplicação
• Utilizar apenas produtos neutros
• Evitar exposição prolongada ao sol nos primeiros dias
• Não utilizar produtos abrasivos
• Realizar manutenção preventiva conforme recomendado`);

  useEffect(() => {
    if (open && user?.id) {
      fetchData();
    }
  }, [open, user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);

      const [templatesRes, clientsRes, vehiclesRes, companyRes] = await Promise.all([
        supabase.from('warranty_templates').select('*').eq('company_id', profile.company_id),
        supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id),
        supabase.from('vehicles').select('id, brand, model, plate, year, client_id').eq('company_id', profile.company_id),
        supabase.from('companies').select('company_name, logo_url, cnpj, phone, email, street, number, neighborhood, city, state, cep').eq('id', profile.company_id).single(),
      ]);

      setTemplates(templatesRes.data || []);
      setClients(clientsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      if (companyRes.data) setCompanyInfo(companyRes.data as any);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templateId ? templates.find(t => t.id === parseInt(templateId)) : null;
  const selectedClient = clientId ? clients.find(c => c.id === parseInt(clientId)) : null;
  const selectedVehicle = vehicleId ? vehicles.find(v => v.id === parseInt(vehicleId)) : null;

  const filteredVehicles = clientId 
    ? vehicles.filter(v => v.client_id === parseInt(clientId))
    : vehicles;

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    const template = templates.find(t => t.id === parseInt(value));
    if (template) {
      let combinedText = "";
      if (template.coverage) combinedText += `[ COBERTURA DA GARANTIA ]\n${template.coverage}\n\n`;
      if (template.terms) combinedText += `[ TERMOS ]\n${template.terms}\n\n`;
      if (template.restrictions) combinedText += `[ RESTRIÇÕES ]\n${template.restrictions}\n\n`;
      setWarrantyTerms(combinedText.trim());
    }
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    setVehicleId("");
  };

  const handleIssue = async () => {
    if (!templateId || !clientId || !vehicleId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não encontrada. Faça login novamente.");
      return;
    }

    if (!selectedTemplate || !selectedClient || !selectedVehicle) {
      toast.error("Dados do modelo, cliente ou veículo não encontrados.");
      return;
    }

    setIsSubmitting(true);
    try {
      const issueDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate.validity_months || 12));

      console.log('[Garantia] Inserindo no banco...', { companyId, templateName: selectedTemplate.name });

      const finalWarrantyText = `${warrantyTerms}\n\n[ INSTRUÇÕES DE CUIDADO ]\n${careInstructions}`;

      const { data: inserted, error } = await supabase.from('warranties').insert({
        company_id: companyId,
        warranty_type: selectedTemplate.name || '',
        issue_date: issueDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        client_id: parseInt(clientId),
        vehicle_id: parseInt(vehicleId),
        warranty_text: finalWarrantyText,
        status: 'Pendente',
      }).select('id').single();

      if (error) {
        console.error('[Garantia] Erro no insert:', error);
        throw error;
      }

      console.log('[Garantia] Insert OK, id:', inserted?.id);

      const certNumber = `${(inserted?.id || 0).toString().padStart(4, '0')}`;
      
      // Gerar PDF em try/catch separado - se falhar, a garantia já foi salva
      try {
        const companyAddress = companyInfo ? [companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ') : undefined;
        const pdfData: WarrantyPDFData = {
          certificate_number: certNumber,
          client_name: selectedClient.name,
          client_phone: selectedClient.phone,
          client_email: selectedClient.email || undefined,
          vehicle_brand: selectedVehicle.brand,
          vehicle_model: selectedVehicle.model,
          vehicle_plate: selectedVehicle.plate || '',
          vehicle_year: selectedVehicle.year || undefined,
          service_name: selectedTemplate.name,
          issue_date: issueDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          warranty_text: finalWarrantyText,
          company_name: companyInfo?.company_name || 'Minha Empresa',
          company_logo_url: companyInfo?.logo_url || undefined,
          company_cnpj: companyInfo?.cnpj || undefined,
          company_phone: companyInfo?.phone || undefined,
          company_email: companyInfo?.email || undefined,
          company_address: companyAddress || undefined,
        };

        console.log('[Garantia] Gerando e fazendo upload do PDF...');
        await generateWarrantyPDF(pdfData, companyId);
        console.log('[Garantia] PDF gerado e uploadado com sucesso');
      } catch (pdfError) {
        console.error('[Garantia] Erro ao gerar PDF (garantia já salva):', pdfError);
        toast.warning("Garantia salva, mas houve erro ao gerar o PDF.");
      }

      const storagePath = `${companyId}/garantias/garantia-${certNumber}.pdf`;
      const pdfLink = getPDFProxyUrl(storagePath);

      setIssuedData({
        certNumber,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        vehicleBrand: selectedVehicle.brand,
        vehicleModel: selectedVehicle.model,
        vehiclePlate: selectedVehicle.plate || null,
        serviceName: selectedTemplate.name,
        issueDate: issueDate.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        warrantyTerms: finalWarrantyText,
        pdfLink,
      });

      toast.success("Garantia emitida com sucesso!");
    } catch (error: any) {
      console.error('[Garantia] Erro ao emitir garantia:', error);
      const msg = error?.message || error?.details || 'Erro desconhecido';
      toast.error(`Erro ao emitir garantia: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTemplateId("");
    setClientId("");
    setVehicleId("");
    setWarrantyTerms("");
    setIssuedData(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleDownload = () => {
    if (!templateId || !clientId || !vehicleId || !selectedTemplate || !selectedClient || !selectedVehicle) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate.validity_months || 12));
    const certNumber = `PREV-${Date.now()}`;

    const companyAddress = companyInfo ? [companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ') : undefined;
    const pdfData: WarrantyPDFData = {
      certificate_number: certNumber,
      client_name: selectedClient.name,
      client_phone: selectedClient.phone,
      client_email: selectedClient.email || undefined,
      vehicle_brand: selectedVehicle.brand,
      vehicle_model: selectedVehicle.model,
      vehicle_plate: selectedVehicle.plate || '',
      vehicle_year: selectedVehicle.year || undefined,
      service_name: selectedTemplate.name,
      issue_date: issueDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      warranty_text: `${warrantyTerms}\n\n[ INSTRUÇÕES DE CUIDADO ]\n${careInstructions}`,
      company_name: companyInfo?.company_name || 'Minha Empresa',
      company_logo_url: companyInfo?.logo_url || undefined,
      company_cnpj: companyInfo?.cnpj || undefined,
      company_phone: companyInfo?.phone || undefined,
      company_email: companyInfo?.email || undefined,
      company_address: companyAddress || undefined,
    };

    generateWarrantyPDF(pdfData, companyId || undefined);
    toast.success("Certificado baixado com sucesso!");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto p-0">
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
                  <Label>Modelo de Garantia *</Label>
                  <Select value={templateId} onValueChange={handleTemplateChange} disabled={loading || !!issuedData}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Carregando..." : "Selecione o modelo..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({template.validity_months} meses)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={clientId} onValueChange={handleClientChange} disabled={loading || !!issuedData}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Carregando..." : "Selecione o cliente..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId} disabled={loading || !clientId || !!issuedData}>
                    <SelectTrigger>
                      <SelectValue placeholder={!clientId ? "Selecione o cliente primeiro" : "Selecione o veículo..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.brand} {vehicle.model} - {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClient && selectedVehicle && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Cliente:</span> {selectedClient.name}</p>
                    <p><span className="text-muted-foreground">Veículo:</span> {selectedVehicle.brand} {selectedVehicle.model} - {selectedVehicle.plate}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedClient.email || 'Não informado'}</p>
                  </div>
                )}

                {selectedTemplate && !issuedData && (
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

                {issuedData && (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30 space-y-2">
                    <div className="flex items-center gap-2 text-success">
                      <Shield className="h-5 w-5" />
                      <span className="font-semibold">Garantia emitida com sucesso!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Certificado Nº {issuedData.certNumber} • {issuedData.serviceName}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                    {issuedData ? 'Fechar' : 'Cancelar'}
                  </Button>
                  
                  {!issuedData && (
                    <>
                      <Button variant="outline" onClick={handleDownload} disabled={!selectedTemplate || !selectedClient || !selectedVehicle}>
                        <Download className="h-4 w-4 mr-2" /> Baixar PDF
                      </Button>
                      <Button 
                        onClick={handleIssue} 
                        disabled={!selectedTemplate || !selectedClient || !selectedVehicle || isSubmitting}
                      >
                        <Shield className="h-4 w-4 mr-2" /> 
                        {isSubmitting ? 'Salvando...' : 'Emitir Garantia'}
                      </Button>
                    </>
                  )}

                  {issuedData && (
                    <Button 
                      onClick={() => setWhatsappModalOpen(true)}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="px-6 pb-6 mt-0">
              <ScrollArea className="h-[60vh] border rounded-lg bg-white text-black">
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={wfeLogo} alt="WFE" className="h-12 w-auto" />
                      <div>
                        <h2 className="font-bold text-lg">WFE EVOLUTION</h2>
                        <p className="text-xs text-gray-600">Certificado de Garantia</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-300" />

                  {selectedClient && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-600">Nome:</span> {selectedClient.name}</p>
                        <p><span className="text-gray-600">WhatsApp:</span> {selectedClient.phone}</p>
                        <p><span className="text-gray-600">Email:</span> {selectedClient.email || 'Não informado'}</p>
                      </div>
                    </div>
                  )}

                  {selectedVehicle && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Veículo</h3>
                      <div className="text-sm">
                        <p><span className="text-gray-600">Veículo:</span> {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year ? `(${selectedVehicle.year})` : ''}</p>
                        <p><span className="text-gray-600">Placa:</span> {selectedVehicle.plate}</p>
                      </div>
                    </div>
                  )}

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
                          <p className="font-semibold mb-1">Detalhes e Termos:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">{warrantyTerms}</p>
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

                  {!selectedTemplate && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Selecione um modelo de garantia para visualizar o certificado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <WarrantyWhatsAppModal
        open={whatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
        data={issuedData}
      />
    </>
  );
}
