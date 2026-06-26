import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [isPdfA4Open, setIsPdfA4Open] = useState(false);
  const [isPdfNotinhaOpen, setIsPdfNotinhaOpen] = useState(false);
  const [pdfNotinhaSize, setPdfNotinhaSize] = useState<"80mm" | "58mm">("80mm");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);
  
  // Soft Delete and Lixeira states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const [permanentConfirmText, setPermanentConfirmText] = useState("");

  // Client Profile state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileClient, setProfileClient] = useState<any>(null);

  // Fetch deleter user profile if sale is deleted
  const { data: deleterProfile } = useQuery({
    queryKey: ['profile-deleter', sale?.deleted_by],
    queryFn: async () => {
      if (!sale?.deleted_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', sale.deleted_by)
        .maybeSingle();
      if (error) {
        console.error('Error fetching deleter profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!sale?.deleted_by && open,
  });

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

  const handleDeleteSale = async () => {
    if (!sale) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc('soft_delete_sale', {
        p_sale_id: sale.id,
        p_reason: deleteReason.trim() || "Nenhum motivo informado."
      });

      if (error) throw error;

      toast({
        title: "Venda excluída",
        description: "A venda foi enviada para a lixeira operacional com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['sale-detailed-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      setDeleteReason("");
    } catch (error: any) {
      console.error("Erro ao enviar venda para a lixeira:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Ocorreu um erro ao excluir a venda.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSale = async () => {
    if (!sale) return;
    setIsRestoring(true);
    try {
      const { data, error } = await supabase.rpc('restore_sale', {
        p_sale_id: sale.id
      });

      if (error) throw error;

      toast({
        title: "Venda restaurada",
        description: "A venda foi restaurada e retornou à operação ativa com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['sale-detailed-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao restaurar venda:", error);
      toast({
        title: "Erro ao restaurar",
        description: error.message || "Ocorreu um erro ao restaurar a venda.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDeleteSale = async () => {
    if (!sale) return;
    if (permanentConfirmText !== "EXCLUIR") {
      toast({
        title: "Confirmação incorreta",
        description: "Digite exatamente 'EXCLUIR' para confirmar a exclusão.",
        variant: "destructive",
      });
      return;
    }
    setIsPermanentlyDeleting(true);
    try {
      const { data, error } = await supabase.rpc('permanently_delete_sale', {
        p_sale_id: sale.id
      });

      if (error) throw error;

      toast({
        title: "Venda excluída permanentemente",
        description: "A venda foi excluída definitivamente e todos os dados foram apagados fisicamente.",
      });

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['sale-detailed-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      setIsPermanentDeleteDialogOpen(false);
      onOpenChange(false);
      setPermanentConfirmText("");
    } catch (error: any) {
      console.error("Erro na exclusão definitiva:", error);
      toast({
        title: "Erro ao excluir definitivamente",
        description: error.message || "Ocorreu um erro ao excluir a venda permanentemente.",
        variant: "destructive",
      });
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-[92vw] sm:w-full overflow-x-hidden">
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
            {sale.deleted_at && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex flex-col gap-2 shadow-sm animate-pulse-subtle">
                <div className="font-bold flex items-center gap-2 text-base">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Venda Excluída (Lixeira Operacional)
                </div>
                <div className="text-muted-foreground">
                  Esta venda foi movida para a lixeira operacional em{" "}
                  <span className="font-semibold text-destructive">
                    {format(new Date(sale.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>{" "}
                  por <span className="font-semibold text-destructive">{deleterProfile?.name || "Carregando..."}</span>.
                </div>
                {sale.deleted_reason && (
                  <div className="mt-1 bg-destructive/5 p-3 rounded border border-destructive/10 text-xs text-muted-foreground">
                    <span className="font-semibold block text-destructive mb-1">Motivo da Exclusão:</span>
                    <span className="italic">"{sale.deleted_reason}"</span>
                  </div>
                )}
              </div>
            )}

            {/* Client Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-info" />
                  <span className="font-medium">{client?.name || "Cliente"}</span>
                </div>
                {client?.phone && (
                  <a
                    href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-success hover:underline w-fit"
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
                  <div className="w-full overflow-x-auto border rounded-md">
                    <Table className="min-w-[650px] w-full">
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
                  </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {sale.deleted_at ? (
              <>
                {/* Visualização de Venda na Lixeira */}
                {(user?.role === "ADMIN" || (user?.role === "VENDEDOR" && sale.seller_id === user?.id)) ? (
                  <Button
                    variant="default"
                    className="flex-1 gap-2 bg-success hover:bg-success/90 text-white"
                    onClick={handleRestoreSale}
                    disabled={isRestoring}
                  >
                    {isRestoring ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                    Restaurar Venda
                  </Button>
                ) : (
                  <div className="flex-1 text-center py-2 text-sm text-muted-foreground italic">
                    Apenas o autor da venda ou um administrador podem restaurar esta venda.
                  </div>
                )}

                {user?.role === "ADMIN" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2 border-primary text-primary hover:bg-primary/10"
                      onClick={() => setIsEditSaleOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={() => setIsPermanentDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Permanente
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Visualização de Venda Ativa Normal */}
                <Button variant="default" className="flex-1 gap-2" onClick={() => setIsEditSaleOpen(true)}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Soft Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta venda será movida para a lixeira operacional e todos os KPIs, gráficos e comissões associados serão suspensos. Você poderá restaurá-la a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-muted-foreground block">
              Motivo da exclusão (opcional):
            </label>
            <Textarea
              placeholder="Digite o motivo pelo qual está excluindo esta venda (ex: cliente desistiu, erro de digitação)..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="resize-none h-20"
              maxLength={200}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setDeleteReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSale();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Mover para a Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Hard Delete Permanente */}
      <AlertDialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Exclusão Permanente e Irreversível!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-medium">
              Esta ação apagará fisicamente a venda e todas as dependências do banco de dados para sempre.
              Um snapshot de segurança completo será salvo de forma estruturada nos logs de auditoria.
            </AlertDialogDescription>
            <p className="text-xs text-muted-foreground bg-destructive/10 p-3 rounded border border-destructive/20 mt-2">
              Para confirmar que deseja apagar DEFINITIVAMENTE todos os registros dessa venda, digite <span className="font-bold text-destructive">EXCLUIR</span> no campo abaixo:
            </p>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              type="text"
              placeholder="Digite EXCLUIR para confirmar"
              value={permanentConfirmText}
              onChange={(e) => setPermanentConfirmText(e.target.value)}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isPermanentlyDeleting}
              onClick={() => setPermanentConfirmText("")}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handlePermanentDeleteSale();
              }}
              disabled={isPermanentlyDeleting || permanentConfirmText !== "EXCLUIR"}
            >
              {isPermanentlyDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
