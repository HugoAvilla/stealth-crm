import { useState, useEffect } from "react";
import { Plus, Search, FileCheck, Download, MoreHorizontal, FilePlus, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { IssueWarrantyModal } from "@/components/garantias/IssueWarrantyModal";
import { NewWarrantyTemplateModal } from "@/components/garantias/NewWarrantyTemplateModal";
import { WarrantyTemplatesListModal } from "@/components/garantias/WarrantyTemplatesListModal";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";
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
  const [showTemplatesListModal, setShowTemplatesListModal] = useState(false);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("garantias");
  const [companyId, setCompanyId] = useState<number | null>(null);

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
      
      setCompanyId(profile.company_id);

      const { data: warrantiesData } = await supabase
        .from('warranties')
        .select(`
          *,
          client:clients(id, name, phone, email),
          vehicle:vehicles(id, brand, model, plate, year)
        `)
        .eq('company_id', profile.company_id)
        .order('issue_date', { ascending: false });

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

  const getWarrantyWhatsAppUrl = (warranty: Warranty) => {
    if (!warranty.client?.phone) return "#";

    const certNumber = `${warranty.id.toString().padStart(4, '0')}`;
    const vehicleInfo = warranty.vehicle
      ? `${warranty.vehicle.brand} ${warranty.vehicle.model} - Placa: ${warranty.vehicle.plate || 'N/A'}`
      : 'N/A';

    const formatDate = (d: string) => {
      try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
    };

    const message = `*CERTIFICADO DE GARANTIA*\n\n` +
      `Nº ${certNumber}\n` +
      `Serviço: ${warranty.warranty_type}\n` +
      `Veículo: ${vehicleInfo}\n` +
      `Emissão: ${formatDate(warranty.issue_date)}\n` +
      `Validade: ${formatDate(warranty.expiry_date)}\n\n` +
      (warranty.warranty_text ? `*Termos:*\n${warranty.warranty_text}\n\n` : '') +
      `_Garantia Intransferível_`;

    const phone = warranty.client.phone.replace(/\D/g, '');
    const phoneWithCountryCode = phone.startsWith("55") ? phone : `55${phone}`;
    return `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;
  };

  const handleDownload = (warranty: Warranty) => {
    const certNumber = `${warranty.id.toString().padStart(4, '0')}`;
    const pdfData: WarrantyPDFData = {
      certificate_number: certNumber,
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
    };

    generateWarrantyPDF(pdfData, companyId || undefined);
    toast.success(`Certificado da garantia baixado!`);
  };

  const handleDelete = async (warrantyId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir esta garantia?")) return;
    
    try {
      const { error } = await supabase
        .from('warranties')
        .delete()
        .eq('id', warrantyId);

      if (error) throw error;
      
      toast.success("Garantia excluída com sucesso");
      fetchData();
    } catch (error) {
      console.error('Error deleting warranty:', error);
      toast.error("Erro ao excluir garantia");
    }
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
        title="Guia de Garantias"
        sections={[
          {
            title: "Emitir Garantia",
            description: "Clique em 'Emitir Garantia' para criar um certificado. Selecione o cliente, o veículo, o tipo de serviço e a validade. O certificado é gerado automaticamente com número único.",
            screenshotUrl: "/help/help-garantias-emitir.png"
          },
          {
            title: "Criar Modelo de Garantia",
            description: "Use 'Criar Garantia Produto' para criar modelos reutilizáveis. Defina nome, validade em meses, cobertura e termos. Esses modelos agilizam a emissão de garantias futuras.",
            screenshotUrl: "/help/help-garantias-modelo.png"
          },
          {
            title: "Gerenciar Garantias Emitidas",
            description: "A tabela mostra todas as garantias com status (Ativa, Vencendo, Expirada). Use a busca para encontrar por tipo, cliente ou placa. Cards no topo mostram totais e modelos disponíveis.",
            screenshotUrl: "/help/help-garantias-tabela.png"
          },
          {
            title: "Enviar por WhatsApp ou PDF",
            description: "No menu '⋯' de cada garantia, escolha 'Enviar WhatsApp' para mandar o certificado diretamente ao cliente ou 'Baixar PDF' para gerar um documento profissional.",
            screenshotUrl: "/help/help-garantias-enviar.png"
          },
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="garantias" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Garantias
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2">
            <Download className="h-4 w-4" />
            PDFs Baixados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garantias" className="space-y-6 mt-4">
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

            <Card 
              className="bg-card/50 border-border/50 cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => setShowTemplatesListModal(true)}
            >
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
                                <DropdownMenuItem asChild>
                                  <a
                                    href={getWarrantyWhatsAppUrl(warranty)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                    onClick={() => {
                                      if (!warranty.client?.phone) {
                                        toast.error('Cliente não possui telefone cadastrado');
                                      } else {
                                        toast.success('Abrindo WhatsApp Web!');
                                      }
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(warranty.id)}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
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
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <DownloadedPDFsTab module="garantias" />
        </TabsContent>
      </Tabs>

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
      <WarrantyTemplatesListModal
        open={showTemplatesListModal}
        onOpenChange={(open) => setShowTemplatesListModal(open)}
        onTemplatesChange={fetchData}
      />
    </div>
  );
}
