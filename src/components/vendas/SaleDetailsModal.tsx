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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  User,
  Phone,
  Car,
  Calendar,
  CreditCard,
  FileText,
  MessageCircle,
  Eye,
  ArrowRightLeft,
  Edit,
  Trash2,
  Settings,
  Layers,
  Percent,
} from "lucide-react";
import { SaleWithDetails, DetailedServiceItemDB } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PdfA4Modal from "@/components/vendas/PdfA4Modal";
import PdfNotinhaModal from "@/components/vendas/PdfNotinhaModal";
import WhatsAppPreviewModal from "@/components/vendas/WhatsAppPreviewModal";
import TransferToSpaceModal from "@/components/vendas/TransferToSpaceModal";
import { ClientProfileModal } from "@/components/clientes/ClientProfileModal";
import EditSaleModal from "@/components/vendas/EditSaleModal";
import { Loader2 } from "lucide-react";

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
}

const SaleDetailsModal = ({ open, onOpenChange, sale }: SaleDetailsModalProps) => {
  const [isPdfA4Open, setIsPdfA4Open] = useState(false);
  const [isPdfNotinhaOpen, setIsPdfNotinhaOpen] = useState(false);
  const [pdfNotinhaSize, setPdfNotinhaSize] = useState<"80mm" | "58mm">("80mm");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);

  // Client Profile state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileClient, setProfileClient] = useState<any>(null);

  // Fetch detailed service items
  const { data: detailedItems } = useQuery({
    queryKey: ['sale-detailed-items', sale?.id],
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

  // Fetch commissions
  const { data: commissions } = useQuery({
    queryKey: ['sale-commissions', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const { data, error } = await supabase
        .from('sale_commissions')
        .select('*')
        .eq('sale_id', sale.id);
      
      if (error) {
        console.error('Error fetching commissions:', error);
        return [];
      }
      return data;
    },
    enabled: !!sale?.id && open,
  });

  if (!sale) return null;

  const client = sale.client;
  const vehicle = sale.vehicle;
  const saleItems = sale.sale_items || [];
  const hasDetailedItems = detailedItems && detailedItems.length > 0;

  const handleOpenNotinha = (size: "80mm" | "58mm") => {
    setPdfNotinhaSize(size);
    setIsPdfNotinhaOpen(true);
  };

  // Calculate services total from sale_items (legacy) or detailed items
  const servicesTotal = hasDetailedItems
    ? detailedItems.reduce((sum, item) => sum + item.total_price, 0)
    : saleItems.reduce((sum, item) => sum + item.total_price, 0);

  // Calculate total meters used
  const totalMeters = hasDetailedItems
    ? detailedItems.reduce((sum, item) => sum + item.meters_used, 0)
    : 0;

  const handleOpenClientProfile = async () => {
    if (!client) return;
    setProfileLoading(true);

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", client.id)
        .single();
      
      if (clientError) throw clientError;

      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", client.id);

      const { data: salesData } = await supabase
        .from("sales")
        .select("total")
        .eq("client_id", client.id);

      const totalSpent = (salesData || []).reduce((sum, s) => sum + (s.total || 0), 0);

      const fullClient = {
        ...clientData,
        vehicles: vehiclesData || [],
        total_spent: totalSpent,
        sales_count: (salesData || []).length,
        created_at: clientData?.created_at || new Date().toISOString()
      };

      setProfileClient(fullClient);
    } catch (error) {
       console.error(error);
       toast({ title: "Erro", description: "Falha ao carregar perfil do cliente", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle>Venda Nº {sale.id}</DialogTitle>
                  <Badge variant={!sale.is_open ? "default" : "outline"}>
                    {sale.is_open ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Client Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-info" />
                  <span className="font-medium">{client?.name || "Cliente"}</span>
                </div>
                {client?.phone && (
                  <a
                    href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-success hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Vehicle & Services Card */}
            <Card className="p-4 space-y-4">
              {vehicle && (
                <>
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.year} • {vehicle.plate}
                        {vehicle.size && (
                          <Badge variant="outline" className="ml-2">
                            {vehicle.size}
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Detailed Service Items (new system) */}
              {hasDetailedItems ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    Serviços Detalhados
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Região</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Metros</TableHead>
                        <TableHead className="text-right">R$/m</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedItems.map((item) => (
                        <TableRow key={item.id} className={(item as any).is_customized ? 'bg-muted/30' : ''}>
                          <TableCell>
                            <div>
                              <span>{(item as any).display_name || item.region?.name || 'Região'}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {item.category}
                              </Badge>
                              {(item as any).is_customized && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  Personalizado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.product_type
                              ? `${item.product_type.brand} ${item.product_type.name}${item.product_type.light_transmission ? ` ${item.product_type.light_transmission}` : ''}`
                              : 'Produto'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.meters_used.toFixed(2)}m
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {item.total_price.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-muted-foreground">
                      Total de metros: <span className="font-medium">{totalMeters.toFixed(2)}m</span>
                    </span>
                  </div>
                </div>
              ) : (
                /* Legacy sale items */
                <div className="space-y-2">
                  {saleItems.length > 0 ? (
                    saleItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.service?.name || `Serviço #${item.service_id}`}
                          {item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}
                        </span>
                        <span className="font-medium">
                          R$ {item.total_price.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum serviço registrado</p>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total do veículo</span>
                <span className="text-success">
                  R$ {servicesTotal.toFixed(2)}
                </span>
              </div>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {hasDetailedItems ? detailedItems.length : saleItems.length} serviço(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  Subtotal: R$ {sale.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  Desconto: R$ {(sale.discount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">
                  Total: R$ {sale.total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">
                  {sale.payment_method || 'Não informado'}
                </span>
              </div>
            </div>

            {/* Commissions Summary */}
            {commissions && commissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="h-4 w-4" /> Comissões
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {commissions.map((comm) => (
                    <div key={comm.id} className="flex justify-between items-center p-2 rounded border bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{comm.person_name_snapshot}</p>
                        <p className="text-xs text-muted-foreground">
                          {comm.person_type.replace('_', ' ')} • {comm.percentage_snapshot}%
                        </p>
                      </div>
                      <span className="text-sm font-medium text-success">
                        R$ {Number(comm.commission_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Central de Documentos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => setIsPdfA4Open(true)}
                >
                  <FileText className="h-4 w-4" />
                  PDF A4
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => handleOpenNotinha("80mm")}
                >
                  <FileText className="h-4 w-4" />
                  Notinha 80mm
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => handleOpenNotinha("58mm")}
                >
                  <FileText className="h-4 w-4" />
                  Notinha 58mm
                </Button>
              </div>
            </div>

            {/* CRM Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Ações CRM
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => setIsWhatsAppOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-violet-500 text-violet-500 hover:bg-violet-500/10"
                  onClick={handleOpenClientProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Ver cliente
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-info text-info hover:bg-info/10"
                  onClick={() => setIsTransferOpen(true)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Enviar p/ Espaço
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="default" className="flex-1 gap-2" onClick={() => setIsEditSaleOpen(true)}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" className="flex-1 gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PdfA4Modal
        open={isPdfA4Open}
        onOpenChange={setIsPdfA4Open}
        sale={sale}
      />

      <PdfNotinhaModal
        open={isPdfNotinhaOpen}
        onOpenChange={setIsPdfNotinhaOpen}
        sale={sale}
        size={pdfNotinhaSize}
      />

      <WhatsAppPreviewModal
        open={isWhatsAppOpen}
        onOpenChange={setIsWhatsAppOpen}
        sale={sale}
      />

      <TransferToSpaceModal
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        sale={sale}
      />

      {profileClient && (
        <ClientProfileModal
          open={!!profileClient}
          onOpenChange={(open) => !open && setProfileClient(null)}
          client={profileClient}
          onEdit={() => {}}
        />
      )}

      <EditSaleModal
        open={isEditSaleOpen}
        onOpenChange={setIsEditSaleOpen}
        sale={sale}
      />
    </>
  );
};

export default SaleDetailsModal;
