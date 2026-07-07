// @ts-nocheck
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";


interface Warranty {
  id: number;
  warranty_type: string;
  issue_date: string;
  expiry_date: string;
  status: string | null;
  warranty_text: string | null;
  sale_id: number | null;
  client: { id: number; name: string; phone: string; email: string | null; cpf_cnpj?: string | null } | null;
  vehicle: { id: number; brand: string; model: string; plate: string | null; year: number | null } | null;
  sale?: {
    id: number;
    sale_date: string;
    subtotal: number;
    discount: number | null;
    total: number;
    payment_method: string | null;
  } | null;
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
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplatesListModal, setShowTemplatesListModal] = useState(false);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("garantias");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

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

      const [warrantiesRes, templatesRes, companyRes] = await Promise.all([
        supabase
          .from('warranties')
          .select(`
            *,
            client:clients(id, name, phone, email, cpf_cnpj),
            vehicle:vehicles(id, brand, model, plate, year),
            sale:sales(id, sale_date, subtotal, discount, total, payment_method)
          `)
          .eq('company_id', profile.company_id)
          .order('issue_date', { ascending: false }),
        supabase
          .from('warranty_templates')
          .select('*')
          .eq('company_id', profile.company_id),
        supabase
          .from('companies')
          .select('company_name, logo_url, cnpj, phone, email, street, number, neighborhood, city, state, cep')
          .eq('id', profile.company_id)
          .single(),
      ]);

      setWarranties(warrantiesRes.data || []);
      setTemplates(templatesRes.data || []);
      if (companyRes.data) setCompanyInfo(companyRes.data);
    } catch (error) {
      console.error('Error fetching warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLocalDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return format(date, "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const getStatus = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return { label: 'Sem Validade', color: 'bg-gray-500/20 text-gray-400' };
    const expDate = new Date(expiresAt);
    if (isNaN(expDate.getTime())) return { label: 'Sem Validade', color: 'bg-gray-500/20 text-gray-400' };
    const now = new Date();
    const monthsLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsLeft < 0) return { label: 'Expirada', color: 'bg-red-500/20 text-red-400' };
    if (monthsLeft < 3) return { label: 'Vencendo', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Ativa', color: 'bg-green-500/20 text-green-400' };
  };

  const filteredWarranties = warranties.filter(w => {
    let pass = true;
    if (search) {
      const searchLower = search.toLowerCase();
      const codeMatch = w.id.toString() === search;
      
      const typeMatch = w.warranty_type?.toLowerCase().includes(searchLower) || false;
      const clientMatch = w.client?.name?.toLowerCase().includes(searchLower) || false;
      const plateMatch = w.vehicle?.plate?.toLowerCase().includes(searchLower) || false;
      
      if (!typeMatch && !clientMatch && !plateMatch && !codeMatch) {
         pass = false;
      }
    }

    if (statusFilter !== "todos") {
      const statusLabel = getStatus(w.expiry_date || new Date().toISOString()).label.toLowerCase(); // "ativa", "vencendo", "expirada"
      if (statusLabel !== statusFilter) pass = false;
    }

    return pass;
  });

  const getWarrantyWhatsAppUrl = (warranty: Warranty) => {
    if (!warranty.client?.phone) return "#";

    const certNumber = warranty.sale_id ? String(warranty.sale_id) : `${warranty.id.toString().padStart(4, '0')}`;
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
    const certNumber = warranty.sale_id ? String(warranty.sale_id) : `${warranty.id.toString().padStart(4, '0')}`;
    const companyAddress = companyInfo ? [companyInfo.street, companyInfo.number, companyInfo.neighborhood, companyInfo.city, companyInfo.state, companyInfo.cep].filter(Boolean).join(', ') : undefined;
    const pdfData: WarrantyPDFData = {
      certificate_number: certNumber,
      client_name: warranty.client?.name || 'Cliente',
      client_phone: warranty.client?.phone || '',
      client_email: warranty.client?.email || undefined,
      client_cpf_cnpj: warranty.client?.cpf_cnpj || undefined,
      vehicle_brand: warranty.vehicle?.brand || '',
      vehicle_model: warranty.vehicle?.model || '',
      vehicle_plate: warranty.vehicle?.plate || '',
      vehicle_year: warranty.vehicle?.year || undefined,
      service_name: warranty.warranty_type,
      issue_date: warranty.issue_date,
      expiry_date: warranty.expiry_date,
      warranty_text: warranty.warranty_text || undefined,
      company_name: companyInfo?.company_name || undefined,
      company_logo_url: companyInfo?.logo_url || undefined,
      company_cnpj: companyInfo?.cnpj || undefined,
      company_phone: companyInfo?.phone || undefined,
      company_email: companyInfo?.email || undefined,
      company_address: companyAddress || undefined,
      sale_date: warranty.sale?.sale_date || undefined,
      payment_method: warranty.sale?.payment_method || undefined,
      subtotal: warranty.sale?.subtotal || undefined,
      discount: warranty.sale?.discount || undefined,
      total: warranty.sale?.total || undefined,
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

  const activeCount = warranties.filter(w => getStatus(w.expiry_date).label === 'Ativa').length;

  return (
    <div className="space-y-6 p-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="garantias"
        title="Guia de Garantias"
        sections={[
          {
            title: "Vídeo Aula — Garantias",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de garantias.",
            videoUrl: "/help/video-aula-garantia.mp4"
          },
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
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button variant="outline" onClick={() => setShowTemplateModal(true)} className="w-full sm:w-auto">
          <FilePlus className="h-4 w-4 mr-2" /> Criar Garantia Produto
        </Button>
        <Button onClick={() => setShowIssueModal(true)} className="w-full sm:w-auto">
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
                    <span className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors block mt-1 font-medium">
                      Clique aqui para ver modelos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, tipo, cliente ou placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="vencendo">Vencendo</SelectItem>
                  <SelectItem value="expirada">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <div className="space-y-4">
                  {/* 🖥️ Visualização Desktop: Tabela Completa */}
                  <div className="hidden md:block w-full overflow-x-auto">
                    <Table className="min-w-[750px] w-full">
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
                                {formatLocalDate(warranty.expiry_date)}
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
                  </div>

                  {/* 📱 Visualização Mobile: Cards Empilhados */}
                  <div className="grid grid-cols-1 gap-3 md:hidden">
                    {filteredWarranties.map(warranty => {
                      const status = getStatus(warranty.expiry_date);
                      const certNumber = warranty.sale_id ? String(warranty.sale_id) : `${warranty.id.toString().padStart(4, '0')}`;

                      return (
                        <Card key={warranty.id} className="bg-card/50 border-border/50 p-4 space-y-3">
                          {/* Topo: Tipo e Menu de Ações */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-muted-foreground block">CERTIFICADO Nº {certNumber}</span>
                              <h4 className="font-semibold text-base text-foreground leading-tight">{warranty.warranty_type}</h4>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                          </div>

                          {/* Informações de Cliente e Veículo */}
                          <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded space-y-1">
                            <p className="flex justify-between">
                              <span className="font-medium text-foreground">Cliente:</span>
                              <span>{warranty.client?.name || '-'}</span>
                            </p>
                            {warranty.vehicle && (
                              <p className="flex justify-between">
                                <span className="font-medium text-foreground">Veículo:</span>
                                <span>{warranty.vehicle.brand} {warranty.vehicle.model} ({warranty.vehicle.plate || 'S/P'})</span>
                              </p>
                            )}
                          </div>

                          {/* Validade e Status */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Validade</span>
                              <span className="font-medium text-foreground">
                                {formatLocalDate(warranty.expiry_date)}
                              </span>
                            </div>
                            <Badge className={cn(status.color, "border-0 hover:bg-transparent text-[10px] py-0 px-2 font-normal")}>
                              {status.label}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
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
