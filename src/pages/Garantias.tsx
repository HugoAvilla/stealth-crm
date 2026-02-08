import { useState, useEffect } from "react";
import { Plus, Search, FileCheck, Download, MoreHorizontal, FilePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { IssueWarrantyModal } from "@/components/garantias/IssueWarrantyModal";
import { NewWarrantyTemplateModal } from "@/components/garantias/NewWarrantyTemplateModal";
import { SendEmailModal } from "@/components/garantias/SendEmailModal";
import { toast } from "sonner";
import { generateWarrantyPDF, type WarrantyPDFData } from "@/lib/pdfGenerator";

interface Warranty {
  id: number;
  warranty_type: string;
  issue_date: string;
  expiry_date: string;
  status: string | null;
  warranty_text: string | null;
  client: { id: number; name: string; phone: string; email: string | null } | null;
  vehicle: { id: number; brand: string; model: string; plate: string | null; year: number | null } | null;
}

interface WarrantyTemplate {
  id: number;
  name: string;
  validity_months: number;
  coverage: string | null;
  terms: string | null;
}

export default function Garantias() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      // Fetch warranties
      const { data: warrantiesData } = await supabase
        .from('warranties')
        .select(`
          *,
          client:clients(id, name, phone, email),
          vehicle:vehicles(id, brand, model, plate, year)
        `)
        .eq('company_id', profile.company_id)
        .order('issue_date', { ascending: false });

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('warranty_templates')
        .select('*')
        .eq('company_id', profile.company_id);

      setWarranties(warrantiesData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarranties = warranties.filter(w => {
    const searchLower = search.toLowerCase();
    return (
      w.warranty_type.toLowerCase().includes(searchLower) ||
      w.client?.name.toLowerCase().includes(searchLower) ||
      w.vehicle?.plate?.toLowerCase().includes(searchLower)
    );
  });

  const handleSendEmail = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setShowEmailModal(true);
  };

  const handleDownload = (warranty: Warranty) => {
    const pdfData: WarrantyPDFData = {
      certificate_number: `WFE-${warranty.id.toString().padStart(4, '0')}`,
      client_name: warranty.client?.name || 'Cliente',
      client_phone: warranty.client?.phone || '',
      client_email: warranty.client?.email || undefined,
      vehicle_brand: warranty.vehicle?.brand || '',
      vehicle_model: warranty.vehicle?.model || '',
      vehicle_plate: warranty.vehicle?.plate || '',
      vehicle_year: warranty.vehicle?.year || undefined,
      service_name: warranty.warranty_type,
      issue_date: warranty.issue_date,
      expiry_date: warranty.expiry_date,
      warranty_text: warranty.warranty_text || undefined,
      company_name: 'WFE EVOLUTION',
    };

    generateWarrantyPDF(pdfData);
    toast.success(`Certificado da garantia baixado!`);
  };

  const getStatus = (expiresAt: string) => {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const monthsLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsLeft < 0) return { label: 'Expirada', color: 'bg-red-500/20 text-red-400' };
    if (monthsLeft < 3) return { label: 'Vencendo', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Ativa', color: 'bg-green-500/20 text-green-400' };
  };

  const activeCount = warranties.filter(w => getStatus(w.expiry_date).label === 'Ativa').length;


  return (
    <div className="space-y-6 p-6">
      <HelpOverlay
        tabId="garantias"
        title="Gestão de Garantias"
        description="Gerencie certificados de garantia emitidos para seus clientes."
        steps={[
          { title: "Emitir Garantia", description: "Crie um novo certificado de garantia para um serviço" },
          { title: "Criar Modelo", description: "Configure modelos de garantia com validade e termos" },
          { title: "Enviar", description: "Envie o certificado por email ou baixe o PDF" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Garantias</h1>
          <p className="text-muted-foreground">Gerencie certificados de garantia e serviços</p>
        </div>
      </div>
 
       {/* Header Actions */}
       <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
               <FilePlus className="h-4 w-4 mr-2" /> Criar Garantia Produto
             </Button>
             <Button onClick={() => setShowIssueModal(true)}>
               <Plus className="h-4 w-4 mr-2" /> Emitir Garantia
             </Button>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-card/50 border-border/50">
               <CardContent className="p-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-primary/10">
                     <FileCheck className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Total Emitidos</p>
                     <p className="text-2xl font-bold">{warranties.length}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             <Card className="bg-card/50 border-border/50">
               <CardContent className="p-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-green-500/10">
                     <FileCheck className="h-5 w-5 text-green-500" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Ativas</p>
                     <p className="text-2xl font-bold text-green-500">{activeCount}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             <Card className="bg-card/50 border-border/50">
               <CardContent className="p-4">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-blue-500/10">
                     <FileCheck className="h-5 w-5 text-blue-500" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Modelos</p>
                     <p className="text-2xl font-bold">{templates.length}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
       </div>
 
       {/* Search */}
       <div className="relative max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Buscar por tipo, cliente ou placa..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="pl-10"
             />
       </div>
 
       {/* Table */}
       <Card className="bg-card/50 border-border/50">
             <CardContent className="p-0">
               {loading ? (
                 <div className="p-6 space-y-4">
                   {Array.from({ length: 5 }).map((_, i) => (
                     <Skeleton key={i} className="h-12" />
                   ))}
                 </div>
               ) : filteredWarranties.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">
                   {warranties.length === 0 ? 'Nenhuma garantia emitida ainda' : 'Nenhuma garantia encontrada'}
                 </div>
               ) : (
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Tipo</TableHead>
                       <TableHead>Cliente</TableHead>
                       <TableHead>Veículo</TableHead>
                       <TableHead className="text-center">Validade</TableHead>
                       <TableHead className="text-center">Status</TableHead>
                       <TableHead className="w-[80px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredWarranties.map(warranty => {
                       const status = getStatus(warranty.expiry_date);
 
                       return (
                         <TableRow key={warranty.id}>
                           <TableCell className="font-medium">
                             {warranty.warranty_type}
                           </TableCell>
                           <TableCell>{warranty.client?.name || '-'}</TableCell>
                           <TableCell>
                             {warranty.vehicle ? `${warranty.vehicle.model} - ${warranty.vehicle.plate}` : '-'}
                           </TableCell>
                           <TableCell className="text-center text-sm">
                             {format(new Date(warranty.expiry_date), "dd/MM/yyyy")}
                           </TableCell>
                           <TableCell className="text-center">
                             <Badge className={status.color}>{status.label}</Badge>
                           </TableCell>
                           <TableCell>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon">
                                   <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleDownload(warranty)}>
                                   <Download className="h-4 w-4 mr-2" /> Baixar PDF
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleSendEmail(warranty)}>
                                   <Send className="h-4 w-4 mr-2" /> Enviar por Email
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               )}
         </CardContent>
       </Card>

      {/* Modals */}
      <IssueWarrantyModal 
        open={showIssueModal} 
        onOpenChange={(open) => {
          setShowIssueModal(open);
          if (!open) fetchData();
        }} 
      />
      <NewWarrantyTemplateModal 
        open={showTemplateModal} 
        onOpenChange={(open) => {
          setShowTemplateModal(open);
          if (!open) fetchData();
        }} 
      />
      <SendEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        warranty={selectedWarranty ? {
          id: selectedWarranty.id,
          template_id: 0,
          sale_id: 0,
          client_id: selectedWarranty.client?.id || 0,
          vehicle_id: selectedWarranty.vehicle?.id || 0,
          issued_at: selectedWarranty.issue_date,
          expires_at: selectedWarranty.expiry_date,
          certificate_number: `WFE-${selectedWarranty.id.toString().padStart(4, '0')}`,
        } : null}
      />
    </div>
  );
}
