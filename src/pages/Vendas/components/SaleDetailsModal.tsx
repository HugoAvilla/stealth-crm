// @ts-nocheck
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
  Shield,
  Banknote,
} from "lucide-react";
import { SaleWithDetails, DetailedServiceItemDB } from "@/types/sales";
import { toast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/logger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PdfA4Modal from "@/pages/Vendas/components/PdfA4Modal";
import PdfNotinhaModal from "@/pages/Vendas/components/PdfNotinhaModal";
import WhatsAppPreviewModal from "@/pages/Vendas/components/WhatsAppPreviewModal";
import TransferToSpaceModal from "@/pages/Vendas/components/TransferToSpaceModal";
import { ClientProfileModal } from "@/shared/components/clientes/ClientProfileModal";
import EditSaleModal from "@/pages/Vendas/components/EditSaleModal";
import NewSaleModal from "@/pages/Vendas/components/NewSaleModal";
import { FillSlotModal } from "@/shared/components/espaco/FillSlotModal";
import { EditClientModal } from "@/shared/components/clientes/EditClientModal";
import { Loader2 } from "lucide-react";
import { IssueWarrantyModal } from "@/shared/components/garantias/IssueWarrantyModal";
import { calculateCardMachineNetAmount, formatCardMachineRatePercent } from "@/lib/cardMachineFees";

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithDetails | null;
  onSaleUpdated?: () => void;
}

const SaleDetailsModal = ({ open, onOpenChange, sale, onSaleUpdated }: SaleDetailsModalProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isPdfA4Open, setIsPdfA4Open] = useState(false);
  const [isPdfNotinhaOpen, setIsPdfNotinhaOpen] = useState(false);
  const [pdfNotinhaSize, setPdfNotinhaSize] = useState<"80mm" | "58mm">("80mm");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);
  const [isIssueWarrantyOpen, setIsIssueWarrantyOpen] = useState(false);

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    if (clientToDelete.sales_count > 0) {
      toast({
        title: "Erro",
        description: "Cliente possui vendas vinculadas. Não pode ser excluído.",
        variant: "destructive",
      });
      setClientToDelete(null);
      return;
    }

    try {
      const vehicleIds = (clientToDelete.vehicles || []).map((v: any) => v.id);

      // 1. Delete pipeline items and events associated with the client's vehicles
      if (vehicleIds.length > 0) {
        const { data: pipelineItems } = await supabase
          .from("pipeline_items")
          .select("id")
          .in("vehicle_id", vehicleIds);

        const pipelineItemIds = pipelineItems?.map(item => item.id) || [];
        if (pipelineItemIds.length > 0) {
          await supabase.from("whatsapp_messages").delete().in("related_pipeline_item", pipelineItemIds);
          await supabase.from("pipeline_events").delete().in("item_id", pipelineItemIds);
          await supabase.from("pipeline_items").delete().in("id", pipelineItemIds);
        }

        // Delete other operational data associated with the vehicles
        await supabase.from("pipeline_stages").delete().in("vehicle_id", vehicleIds);
        await supabase.from("spaces").delete().in("vehicle_id", vehicleIds);
        await supabase.from("warranties").delete().in("vehicle_id", vehicleIds);
      }

      // 2. Delete pipeline items and events associated directly with the client
      const { data: clientPipelineItems } = await supabase
        .from("pipeline_items")
        .select("id")
        .eq("client_id", clientToDelete.id);

      const clientPipelineItemIds = clientPipelineItems?.map(item => item.id) || [];
      if (clientPipelineItemIds.length > 0) {
        await supabase.from("whatsapp_messages").delete().in("related_pipeline_item", clientPipelineItemIds);
        await supabase.from("pipeline_events").delete().in("item_id", clientPipelineItemIds);
        await supabase.from("pipeline_items").delete().in("id", clientPipelineItemIds);
      }

      // 3. Delete other operational data associated directly with the client_id
      await supabase.from("pipeline_stages").delete().eq("client_id", clientToDelete.id);
      await supabase.from("spaces").delete().eq("client_id", clientToDelete.id);
      await supabase.from("warranties").delete().eq("client_id", clientToDelete.id);

      // 4. Delete associated vehicles
      const { error: vehiclesError } = await supabase
        .from("vehicles")
        .delete()
        .eq("client_id", clientToDelete.id);

      if (vehiclesError) throw vehiclesError;

      // 5. Delete the client
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Cliente "${clientToDelete.name}" excluído com sucesso`,
      });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erro",
        description: `Erro ao excluir cliente: ${error?.message || "Erro desconhecido"}`,
        variant: "destructive",
      });
    } finally {
      setClientToDelete(null);
    }
  };

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
      const { data: commissions, error: error } = await supabase
        .from('sale_commissions')
        .select('id, person_name_snapshot, person_type, percentage_snapshot, commission_amount')
        .eq('sale_id', sale.id);

      if (error) {
        console.error('Error fetching commissions:', error);
        return [];
      }
      return data;
    },
    enabled: !!sale?.id && open,
  });

  // Fetch sale payments with machine info
  const { data: salePayments } = useQuery({
    queryKey: ['sale-payments-details', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const { data, error } = await supabase
        .from('sale_payments')
        .select(`
          *,
          card_machines (
            id,
            name,
            is_anticipated,
            debit_rate
          )
        `)
        .eq('sale_id', sale.id);

      if (error) {
        console.error('Error fetching sale payments:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!sale?.id && open,
  });

  // Fetch rates for the used machines
  const machineIds = salePayments?.map((p: any) => p.machine_id).filter(Boolean) || [];
  const { data: machineRates } = useQuery({
    queryKey: ['sale-payments-rates', machineIds],
    queryFn: async () => {
      if (machineIds.length === 0) return [];
      const { data, error } = await supabase
        .from('card_machine_rates')
        .select('machine_id, installments, rate')
        .in('machine_id', machineIds);
      if (error) {
        console.error('Error fetching machine rates:', error);
        return [];
      }
      return data || [];
    },
    enabled: machineIds.length > 0,
  });

  // Fetch linked space (vaga)
  const { data: linkedSpace } = useQuery({
    queryKey: ['sale-linked-space', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return null;
      const { data, error } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('sale_id', sale.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching linked space:', error);
        return null;
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
        .select("id, name, phone, email, cpf_cnpj, birth_date, cep, street, number, complement, neighborhood, city, state, origem, created_at, company_id")
        .eq("id", client.id)
        .single();

      if (clientError) throw clientError;

      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("id, brand, model, plate, year, size, client_id, created_at")
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
      setShowProfileModal(true);
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
        description: getFriendlyErrorMessage(error, "Ocorreu um erro ao excluir a venda."),
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
        description: getFriendlyErrorMessage(error, "Ocorreu um erro ao restaurar a venda."),
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
        description: getFriendlyErrorMessage(error, "Ocorreu um erro ao excluir a venda permanentemente."),
        variant: "destructive",
      });
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-[92vw] sm:w-full overflow-x-hidden" confirmClose={false}>
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
                  {/* Tabela para Desktop */}
                  <div className="hidden sm:block w-full overflow-x-auto border rounded-md">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Região</TableHead>
                          <TableHead>Material</TableHead>
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
                                : 'Material'}
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

                  {/* Cards para Mobile */}
                  <div className="block sm:hidden space-y-3">
                    {detailedItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border text-sm space-y-2 bg-card ${(item as any).is_customized ? 'border-primary/30 bg-primary/5' : 'border-border'
                          }`}
                      >
                        {/* Região e Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 justify-between">
                          <span className="font-semibold text-foreground">
                            {(item as any).display_name || item.region?.name || 'Região'}
                          </span>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.category}
                            </Badge>
                            {(item as any).is_customized && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                Personalizado
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Produto */}
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          <span className="font-medium text-foreground block mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Material:</span>
                          {item.product_type
                            ? `${item.product_type.brand} ${item.product_type.name}${item.product_type.light_transmission ? ` ${item.product_type.light_transmission}` : ''}`
                            : 'Material'}
                        </div>

                        {/* Métricas */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Metragem</span>
                            <span className="font-medium text-xs">{item.meters_used.toFixed(2)}m</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Valor/m</span>
                            <span className="font-medium text-xs">R$ {item.unit_price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block text-success">Total</span>
                            <span className="font-semibold text-xs text-success">R$ {item.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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

            {/* Resumo da Venda Premium list */}
            <Card className="p-5 space-y-4 bg-muted/20 border border-border/60">
              <div>
                <h4 className="font-semibold text-base text-foreground">Resumo da venda</h4>
                <p className="text-xs text-muted-foreground">Informações importantes dessa venda</p>
              </div>

              <div className="space-y-3 text-sm">
                {/* 1. Services count */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    Venda com <span className="font-semibold text-primary">{hasDetailedItems ? detailedItems.length : saleItems.length} serviço(s)</span>
                  </span>
                </div>

                {/* 2. Sale Date */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    Venda do dia <span className="font-semibold text-primary">{format(new Date(sale.sale_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </span>
                </div>

                {/* 3. Subtotal */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    Subtotal ficou <span className="font-semibold text-primary">R$ {sale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>

                {/* 4. Discount */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    Desconto de <span className="font-semibold text-primary">R$ {(sale.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>

                {/* 5. Total */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>
                    Valor total da venda ficou <span className="font-semibold text-primary">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>

                {/* 6, 7, 8. Payments (Card Machines details if Crédito/Débito) */}
                {salePayments && salePayments.length > 0 ? (
                  salePayments.map((p: any, index: number) => {
                    const isCard = p.method === "Crédito" || p.method === "Débito";
                    if (!isCard || !p.machine_id) return null;

                    const machine = p.card_machines;
                    const rate = p.method === "Débito"
                      ? machine?.debit_rate || 0
                      : machineRates?.find(r => r.machine_id === p.machine_id && r.installments === p.installments)?.rate || 0;

                    const netAmount = calculateCardMachineNetAmount(p.amount, rate);
                    const isAnticipated = machine?.is_anticipated;

                    const methodLabel = p.method;
                    const installmentsLabel = p.method === "Crédito" ? `${p.installments}x no ` : "no ";
                    const antLabel = ` (${isAnticipated ? "antecipação" : "sem antecipação"})`;

                    return (
                      <div key={p.id || index} className="space-y-3 pt-2 border-t border-dashed border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-muted">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>
                            Forma de pagamento é <span className="font-semibold text-primary">{installmentsLabel}{methodLabel}{antLabel} (R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-muted">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>
                            Taxas de maquininhas <span className="font-semibold text-primary">{formatCardMachineRatePercent(rate)}% no {methodLabel}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-muted">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>
                            Valor total com desconto da maquininha <span className="font-semibold text-primary">R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-3 pt-2 border-t border-dashed border-border">
                    <div className="p-1.5 rounded bg-muted">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>
                      Forma de pagamento é <span className="font-semibold text-primary">{sale.payment_method || 'Não informado'}</span>
                    </span>
                  </div>
                )}

                {/* 10. Space slot linkage */}
                <div className="flex items-center gap-3 pt-2 border-t border-dashed border-border">
                  <div className="p-1.5 rounded bg-muted">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {linkedSpace ? (
                    <span>
                      Vinculado a uma vaga: <Button variant="link" className="p-0 h-auto font-semibold text-primary underline hover:text-primary/80" onClick={() => {
                        setProfileClient(sale.client);
                        setShowNewSlotModal(true);
                      }}>Visualizar vaga ({linkedSpace.name})</Button>
                    </span>
                  ) : (
                    <span>
                      Não vinculado a nenhuma vaga
                    </span>
                  )}
                </div>
              </div>
            </Card>


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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                {!linkedSpace && (
                  <Button
                    variant="outline"
                    className="gap-2 border-info text-info hover:bg-info/10"
                    onClick={() => setIsTransferOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Enviar p/ Espaço
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => setIsIssueWarrantyOpen(true)}
                >
                  <Shield className="h-4 w-4" />
                  Emitir Garantia
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
        <>
          <ClientProfileModal
            open={showProfileModal}
            onOpenChange={(open) => {
              setShowProfileModal(open);
              if (!open) {
                setTimeout(() => setProfileClient(null), 300);
              }
            }}
            client={profileClient}
            onEdit={() => {
              setShowProfileModal(false);
              setShowEditClientModal(true);
            }}
            onCreateSale={() => {
              setShowProfileModal(false);
              setShowNewSaleModal(true);
            }}
            onAddToSpace={() => {
              setShowProfileModal(false);
              setShowNewSlotModal(true);
            }}
            onDelete={(client) => {
              setShowProfileModal(false);
              setClientToDelete(client);
            }}
          />

          <EditClientModal
            open={showEditClientModal}
            onOpenChange={(open) => {
              setShowEditClientModal(open);
              if (!open) {
                setProfileClient(null);
              }
            }}
            client={profileClient}
            onSave={() => {
              setShowEditClientModal(false);
              setProfileClient(null);
              toast({
                title: "Sucesso",
                description: "Cliente atualizado com sucesso!",
              });
              queryClient.invalidateQueries({ queryKey: ['sale-detailed-items'] });
            }}
          />
        </>
      )}

      {/* New Sale Modal */}
      <NewSaleModal
        open={showNewSaleModal}
        onOpenChange={(open) => {
          setShowNewSaleModal(open);
          if (!open) setProfileClient(null);
        }}
        defaultClientId={profileClient?.id}
      />

      {/* New Slot Modal */}
      <FillSlotModal
        open={showNewSlotModal}
        onOpenChange={(open) => {
          setShowNewSlotModal(open);
          if (!open) setProfileClient(null);
        }}
        defaultClientId={profileClient?.id}
      />

      {/* Client Delete Confirmation */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => {
        if (!open) setClientToDelete(null);
      }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSaleModal
        open={isEditSaleOpen}
        onOpenChange={setIsEditSaleOpen}
        sale={sale}
        onSaved={() => {
          // Atualiza os cards de detalhe que ainda estão abertos (itens, comissões, pagamentos)
          queryClient.invalidateQueries({ queryKey: ['sale-detailed-items', sale.id] });
          queryClient.invalidateQueries({ queryKey: ['sale-commissions', sale.id] });
          queryClient.invalidateQueries({ queryKey: ['sale-payments-details', sale.id] });
          // Fecha o modal de detalhes (que mostra dados antigos) e avisa a lista pra recarregar em silêncio
          onOpenChange(false);
          onSaleUpdated?.();
        }}
      />

      <IssueWarrantyModal
        open={isIssueWarrantyOpen}
        onOpenChange={setIsIssueWarrantyOpen}
        preselectedSale={sale}
      />
    </>
  );
};

export default SaleDetailsModal;
