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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Download, FileText, MessageCircle } from "lucide-react";
import wfeLogo from "@/assets/wfe-logo.png";
import { generateWarrantyPDF, type WarrantyPDFData } from "@/lib/pdfGenerator";


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
  const [warrantyTerms, setWarrantyTerms] = useState("");
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

       const [templatesRes, clientsRes, vehiclesRes] = await Promise.all([
         supabase.from('warranty_templates').select('*').eq('company_id', profile.company_id),
         supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id),
         supabase.from('vehicles').select('id, brand, model, plate, year, client_id').eq('company_id', profile.company_id),
       ]);

       setTemplates(templatesRes.data || []);
       setClients(clientsRes.data || []);
       setVehicles(vehiclesRes.data || []);
     } catch (error) {
       console.error('Error fetching data:', error);
     } finally {
       setLoading(false);
     }
   };

   const selectedTemplate = templateId ? templates.find(t => t.id === parseInt(templateId)) : null;
   const selectedClient = clientId ? clients.find(c => c.id === parseInt(clientId)) : null;
   const selectedVehicle = vehicleId ? vehicles.find(v => v.id === parseInt(vehicleId)) : null;

   // Filter vehicles by selected client
   const filteredVehicles = clientId 
     ? vehicles.filter(v => v.client_id === parseInt(clientId))
     : vehicles;

  // Update terms when template changes
  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
     const template = templates.find(t => t.id === parseInt(value));
    if (template) {
      setWarrantyTerms(template.terms);
       setWarrantyTerms(template.terms || '');
    }
  };

   const handleClientChange = (value: string) => {
     setClientId(value);
     setVehicleId(""); // Reset vehicle when client changes
   };

    const handleSend = async () => {
      if (!templateId || !clientId || !vehicleId) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      setIsSubmitting(true);
      try {
        const issueDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate?.validity_months || 12));

        const { data: inserted, error } = await supabase.from('warranties').insert({
          company_id: companyId,
          warranty_type: selectedTemplate?.name || '',
          issue_date: issueDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          client_id: parseInt(clientId),
          vehicle_id: parseInt(vehicleId),
          warranty_text: warrantyTerms,
          status: 'Ativa',
        }).select('id').single();

        if (error) throw error;

        // Send via WhatsApp
        if (selectedClient?.phone) {
          const certNumber = `WFE-${(inserted?.id || 0).toString().padStart(4, '0')}`;
          const vehicleInfo = selectedVehicle
            ? `${selectedVehicle.brand} ${selectedVehicle.model} - Placa: ${selectedVehicle.plate || 'N/A'}`
            : 'N/A';
          const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');

          const message = `🛡️ *CERTIFICADO DE GARANTIA*\n\n` +
            `📋 Nº ${certNumber}\n` +
            `🔧 Serviço: ${selectedTemplate?.name}\n` +
            `🚗 Veículo: ${vehicleInfo}\n` +
            `📅 Emissão: ${fmtDate(issueDate)}\n` +
            `📅 Validade: ${fmtDate(expiryDate)}\n\n` +
            (warrantyTerms ? `📄 Termos:\n${warrantyTerms}\n\n` : '') +
            `_WFE EVOLUTION - Garantia Intransferível_`;

          const phone = selectedClient.phone.replace(/\D/g, '');
          const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        toast.success(`Garantia emitida e enviada via WhatsApp!`);
        onOpenChange(false);
        resetForm();
      } catch (error) {
        console.error('Error issuing warranty:', error);
        toast.error("Erro ao emitir garantia");
      } finally {
        setIsSubmitting(false);
      }
    };

   const resetForm = () => {
     setTemplateId("");
     setClientId("");
     setVehicleId("");
     setWarrantyTerms("");
   };

  const handleDownload = () => {
    if (!templateId || !clientId || !vehicleId || !selectedTemplate || !selectedClient || !selectedVehicle) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (selectedTemplate.validity_months || 12));
    const certNumber = `WFE-PREV-${Date.now()}`;

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
      warranty_text: warrantyTerms || undefined,
      company_name: 'WFE EVOLUTION',
    };

    generateWarrantyPDF(pdfData);
    toast.success("Certificado baixado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                 <Select value={templateId} onValueChange={handleTemplateChange} disabled={loading}>
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
                 <Select value={clientId} onValueChange={handleClientChange} disabled={loading}>
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
                 <Select value={vehicleId} onValueChange={setVehicleId} disabled={loading || !clientId}>
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
                 <Button variant="outline" onClick={handleDownload} disabled={!selectedTemplate || !selectedClient || !selectedVehicle}>
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
                 <Button onClick={handleSend} disabled={!selectedTemplate || !selectedClient || !selectedVehicle || isSubmitting}>
                   <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
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
                       <h2 className="font-bold text-lg">WFE EVOLUTION</h2>
                       <p className="text-xs text-gray-600">Certificado de Garantia</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-300" />

                {/* Client Info */}
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

                 {/* Vehicle */}
                 {selectedVehicle && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                     <h3 className="font-semibold mb-2">Veículo</h3>
                     <div className="text-sm">
                       <p><span className="text-gray-600">Veículo:</span> {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year ? `(${selectedVehicle.year})` : ''}</p>
                      <p><span className="text-gray-600">Placa:</span> {selectedVehicle.plate}</p>
                    </div>
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
  );
}
