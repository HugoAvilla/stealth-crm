import { useState } from "react";
import { Plus, Search, FileCheck, Send, Download, MoreHorizontal, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { issuedWarranties, warrantyTemplates, getClientById, getVehicleById, getServiceById } from "@/lib/mockData";
import { format } from "date-fns";
import { IssueWarrantyModal } from "@/components/garantias/IssueWarrantyModal";
import { NewWarrantyTemplateModal } from "@/components/garantias/NewWarrantyTemplateModal";
import { SendEmailModal } from "@/components/garantias/SendEmailModal";
import { toast } from "sonner";
import { generateWarrantyPDF, type WarrantyPDFData } from "@/lib/pdfGenerator";

export default function Garantias() {
  const [search, setSearch] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<typeof issuedWarranties[0] | null>(null);

  const filteredWarranties = issuedWarranties.filter(w => {
    const client = getClientById(w.client_id);
    const vehicle = getVehicleById(w.vehicle_id);
    const searchLower = search.toLowerCase();
    
    return (
      w.certificate_number.toLowerCase().includes(searchLower) ||
      client?.name.toLowerCase().includes(searchLower) ||
      vehicle?.plate.toLowerCase().includes(searchLower)
    );
  });

  const handleSendEmail = (warranty: typeof issuedWarranties[0]) => {
    setSelectedWarranty(warranty);
    setShowEmailModal(true);
  };

  const handleDownload = (warranty: typeof issuedWarranties[0]) => {
    const template = warrantyTemplates.find(t => t.id === warranty.template_id);
    const service = template ? getServiceById(template.service_id) : null;
    const client = getClientById(warranty.client_id);
    const vehicle = getVehicleById(warranty.vehicle_id);

    const pdfData: WarrantyPDFData = {
      certificate_number: warranty.certificate_number,
      client_name: client?.name || 'Cliente',
      client_phone: client?.phone || '',
      client_email: client?.email,
      vehicle_brand: vehicle?.brand || '',
      vehicle_model: vehicle?.model || '',
      vehicle_plate: vehicle?.plate || '',
      vehicle_year: vehicle?.year,
      service_name: service?.name || 'Serviço',
      issue_date: warranty.issued_at,
      expiry_date: warranty.expires_at,
      warranty_text: template?.terms,
      company_name: 'WFE EVOLUTION',
    };

    generateWarrantyPDF(pdfData);
    toast.success(`Certificado ${warranty.certificate_number} baixado!`);
  };

  const getStatus = (expiresAt: string) => {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const monthsLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsLeft < 0) return { label: 'Expirada', color: 'bg-red-500/20 text-red-400' };
    if (monthsLeft < 3) return { label: 'Vencendo', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Ativa', color: 'bg-green-500/20 text-green-400' };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Garantias</h1>
          <p className="text-muted-foreground">Gerencie certificados de garantia</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <FilePlus className="h-4 w-4 mr-2" /> Criar Garantia Produto
          </Button>
          <Button onClick={() => setShowIssueModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Emitir Garantia
          </Button>
        </div>
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
                <p className="text-2xl font-bold">{issuedWarranties.length}</p>
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
                <p className="text-2xl font-bold text-green-500">
                  {issuedWarranties.filter(w => getStatus(w.expires_at).label === 'Ativa').length}
                </p>
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
                <p className="text-2xl font-bold">{warrantyTemplates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por certificado, cliente ou placa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificado</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead className="text-center">Validade</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarranties.map(warranty => {
                const template = warrantyTemplates.find(t => t.id === warranty.template_id);
                const service = template ? getServiceById(template.service_id) : null;
                const client = getClientById(warranty.client_id);
                const vehicle = getVehicleById(warranty.vehicle_id);
                const status = getStatus(warranty.expires_at);

                return (
                  <TableRow key={warranty.id}>
                    <TableCell className="font-mono text-sm">
                      {warranty.certificate_number}
                    </TableCell>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell>
                      {vehicle?.model} - {vehicle?.plate}
                    </TableCell>
                    <TableCell>{service?.name}</TableCell>
                    <TableCell className="text-center text-sm">
                      {format(new Date(warranty.expires_at), "dd/MM/yyyy")}
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
        </CardContent>
      </Card>

      {/* Modals */}
      <IssueWarrantyModal open={showIssueModal} onOpenChange={setShowIssueModal} />
      <NewWarrantyTemplateModal open={showTemplateModal} onOpenChange={setShowTemplateModal} />
      <SendEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        warranty={selectedWarranty}
      />
    </div>
  );
}
