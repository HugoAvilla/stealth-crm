// @ts-nocheck
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Car, Phone, User, Calendar, Clock, DollarSign, Link2,
  FileText, MessageSquare, Trash2, Edit,
  CheckCircle, Package, AlertCircle, Loader2, Camera, Undo2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UnpaidExitAlertDialog } from "./UnpaidExitAlertDialog";
import { SpaceWhatsAppModal } from "./SpaceWhatsAppModal";
import { generateSpacePDFA4, generateSpacePDFReceipt } from "@/lib/pdfGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { EditSlotModal } from "./EditSlotModal";
import NewSaleModal from "@/pages/Vendas/components/NewSaleModal";
import { FillSlotModal } from "@/shared/components/espaco/FillSlotModal";
import { createSaleTransaction, reverseAllSaleTransactions } from "@/lib/financialTransactions";
import { ClientProfileModal } from "@/shared/components/clientes/ClientProfileModal";
import { EditClientModal } from "@/shared/components/clientes/EditClientModal";

interface SpaceDetails {
  id: number;
  name: string;
  client_id: number | null;
  vehicle_id: number | null;
  sale_id: number | null;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  has_exited: boolean | null;
  payment_status: string | null;
  observations: string | null;
  tag: string | null;
  discount: number | null;
  services_data?: any[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  client?: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
    birth_date: string | null;
  } | null;
  vehicle?: {
    id: number;
    brand: string;
    model: string;
    plate: string | null;
    year: number | null;
  } | null;
  sale?: {
    id: number;
    total: number;
    subtotal: number;
    discount: number | null;
    sale_items?: {
      id: number;
      total_price: number;
      service?: {
        id: number;
        name: string;
      } | null;
    }[];
  } | null;
}

interface SlotDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceDetails | null;
  onUpdate?: () => void;
}

export function SlotDetailsDrawer({ open, onOpenChange, space, onUpdate }: SlotDetailsDrawerProps) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showUnpaidAlert, setShowUnpaidAlert] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [whatsAppType, setWhatsAppType] = useState<'entrada' | 'saida'>('entrada');
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [checklistPhotos, setChecklistPhotos] = useState<{ name: string, url: string }[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportSaleModal, setShowExportSaleModal] = useState(false);

  // Fetch photos
  useEffect(() => {
    async function fetchPhotos() {
      if (!open || !space || !companyId) return;
      setIsLoadingPhotos(true);
      try {
        const { data, error } = await supabase.storage
          .from('checklists')
          .list(`${companyId}/${space.id}`);

        if (data && !error) {
          const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');
          const urls = await Promise.all(
            files.map(async file => {
              const { data } = await supabase.storage
                .from('checklists')
                .createSignedUrl(`${companyId}/${space.id}/${file.name}`, 3600);
              return { name: file.name, url: data?.signedUrl || '' };
            })
          );
          setChecklistPhotos(urls.filter(u => u.url !== ''));
        } else {
          setChecklistPhotos([]);
        }
      } catch (err) {
        console.error("Erro ao carregar fotos", err);
      } finally {
        setIsLoadingPhotos(false);
      }
    }

    if (open) {
      fetchPhotos();
    } else {
      setChecklistPhotos([]);
    }
  }, [open, space?.id, companyId]);

  // Complete slot mutation (for paid vehicles or reopening)
  const completeMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!space) return;
      const updateData: any = {
        has_exited: completed,
      };

      if (completed) {
        updateData.exit_date = format(new Date(), 'yyyy-MM-dd');
        updateData.exit_time = format(new Date(), 'HH:mm');
      }

      const { error } = await supabase
        .from('spaces')
        .update(updateData)
        .eq('id', space.id);

      if (error) throw error;

      if (completed && space.payment_status === 'paid' && space.sale_id) {
        const { error: saleError } = await supabase
          .from('sales')
          .update({ is_open: false, status: 'Fechada' })
          .eq('id', space.sale_id);

        if (saleError) throw saleError;
      }
    },
    onMutate: async (completed: boolean) => {
      await queryClient.cancelQueries({ queryKey: ['spaces'] });

      queryClient.setQueriesData({ queryKey: ['spaces'] }, (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === space?.id ? {
          ...s,
          has_exited: completed,
          exit_date: completed ? format(new Date(), 'yyyy-MM-dd') : s.exit_date,
          exit_time: completed ? format(new Date(), 'HH:mm') : s.exit_time,
        } : s);
      });
      return {};
    },
    onSuccess: (_, completed) => {
      toast.success(completed ? "Vaga liberada!" : "Vaga reaberta!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      if (completed) {
        onOpenChange(false);
      }
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao atualizar vaga:", error);
      toast.error("Erro ao atualizar vaga");
    },
  });



  const [profileLoading, setProfileLoading] = useState(false);
  const [profileClient, setProfileClient] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  const handleOpenClientProfile = async () => {
    if (!space?.client_id) return;
    setProfileLoading(true);

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, phone, email, cpf_cnpj, birth_date, cep, street, number, complement, neighborhood, city, state, origem, created_at, company_id")
        .eq("id", space.client_id)
        .single();

      if (clientError) throw clientError;

      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("id, brand, model, plate, year, size, client_id, created_at")
        .eq("client_id", space.client_id);

      const { data: salesData } = await supabase
        .from("sales")
        .select("total")
        .eq("client_id", space.client_id);

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
      toast.error("Falha ao carregar perfil do cliente");
    } finally {
      setProfileLoading(false);
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', clientToDelete.id);

      if (error) throw error;

      toast.success("Cliente excluído com sucesso!");
      setClientToDelete(null);
      setProfileClient(null);
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir cliente.");
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);

  // Fetch deleter user profile if space is deleted
  const { data: deleterProfile } = useQuery({
    queryKey: ['profile-deleter-space', space?.deleted_by],
    queryFn: async () => {
      if (!space?.deleted_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', space.deleted_by)
        .maybeSingle();
      if (error) {
        console.error('Error fetching deleter profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!space?.deleted_by && open,
  });

  // Soft Delete space mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!space) return;
      const { error } = await supabase.rpc('soft_delete_space' as any, {
        p_space_id: space.id,
        p_reason: reason.trim() || "Nenhum motivo informado."
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga movida para a lixeira!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-exited-count'] });
      onOpenChange(false);
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao excluir vaga:", error);
      toast.error("Erro ao enviar vaga para a lixeira");
    },
  });

  // Restore space mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!space) return;
      const { error } = await supabase.rpc('restore_space' as any, {
        p_space_id: space.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga restaurada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-exited-count'] });
      onOpenChange(false);
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao restaurar vaga:", error);
      toast.error("Erro ao restaurar vaga");
    },
  });

  // Permanent delete space mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!space) return;
      const { error } = await supabase.rpc('permanently_delete_space' as any, {
        p_space_id: space.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga excluída permanentemente!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces-deleted'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-exited-count'] });
      onOpenChange(false);
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao excluir permanentemente:", error);
      toast.error("Erro ao excluir vaga permanentemente");
    },
  });

  // Early return AFTER all hooks
  if (!space) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatBirthDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
  };

  // Get services from sale_items or services_data
  const saleServices = space.sale?.sale_items?.map(item => ({
    name: item.service?.name || 'Serviço',
    price: item.total_price,
  })) || [];

  const jsonServices: { name: string; price: number }[] = [];
  for (const s of ((space as any).services_data || []) as any[]) {
    if (s.isCustomized && s.items && Array.isArray(s.items)) {
      for (const gi of s.items) {
        jsonServices.push({
          name: `${gi.regionLabel || 'Região'}${gi.productTypeName ? ` • ${gi.productTypeName}` : ''}`,
          price: gi.totalPrice || 0,
        });
      }
    } else {
      jsonServices.push({
        name: s.displayName || s.regionName || 'Serviço',
        price: s.totalPrice || 0,
      });
    }
  }

  const services = saleServices.length > 0 ? saleServices : jsonServices;

  // Calculate totals
  const subtotal = space.sale?.subtotal || services.reduce((sum: number, s: any) => sum + s.price, 0);
  const discount = space.discount || space.sale?.discount || 0;
  const total = subtotal - discount;
  const serviceCount = services.length;

  const handleCompleteToggle = (checked: boolean) => {
    if (checked && space.payment_status !== 'paid') {
      setShowUnpaidAlert(true);
    } else {
      setIsCompleting(checked);
      completeMutation.mutate(checked);
    }
  };

  const handleReleaseWithPayment = async () => {
    if (!space) return;

    if (!space.sale_id) {
      toast.error("Vaga sem venda. Clique em 'Exportar Venda' primeiro para garantir o registro financeiro.");
      setShowUnpaidAlert(false);
      setIsCompleting(false);
      return;
    }

    setIsReleasing(true);

    try {
      const { error: spaceError } = await supabase
        .from('spaces')
        .update({
          has_exited: true,
          payment_status: 'paid',
          exit_date: format(new Date(), 'yyyy-MM-dd'),
          exit_time: format(new Date(), 'HH:mm'),
        })
        .eq('id', space.id);

      if (spaceError) throw spaceError;

      const { error: saleError } = await supabase
        .from('sales')
        .update({ is_open: false, status: 'Fechada' })
        .eq('id', space.sale_id);

      if (saleError) throw saleError;

      // Fetch required data for transaction
      const { data: saleData } = await supabase.from('sales').select('id, total, payment_method, sale_date, client_id, company_id').eq('id', space.sale_id).single();
      let clientName = 'Cliente';
      if (saleData?.client_id) {
        const { data: clientData } = await supabase.from('clients').select('name').eq('id', saleData.client_id).single();
        if (clientData) clientName = clientData.name;
      }

      if (saleData) {
        const { data: payments } = await supabase
          .from('sale_payments')
          .select(`
            *,
            card_machines (
              id,
              name,
              debit_rate
            )
          `)
          .eq('sale_id', saleData.id);

        if (payments && payments.length > 0) {
          await reverseAllSaleTransactions(saleData.id, "delete");
          let allSuccess = true;

          for (const p of payments) {
            let finalNetAmount = p.amount;
            if ((p.method === "Crédito" || p.method === "Débito") && p.machine_id) {
              if (p.method === "Débito") {
                const machine = p.card_machines;
                if (machine?.debit_rate) {
                  finalNetAmount = p.amount * (1 - machine.debit_rate / 100);
                }
              } else {
                const { data: rateData } = await supabase
                  .from("card_machine_rates")
                  .select("rate")
                  .eq("machine_id", p.machine_id)
                  .eq("installments", p.installments)
                  .single();
                if (rateData) {
                  finalNetAmount = p.amount * (1 - rateData.rate / 100);
                }
              }
            }

            const tx = await createSaleTransaction({
              saleId: saleData.id,
              saleTotal: p.amount,
              clientName: clientName,
              paymentMethod: p.method,
              saleDate: saleData.sale_date,
              companyId: saleData.company_id,
              accountId: p.account_id,
              isPaid: true,
              salePaymentId: p.id,
              installments: p.installments,
              netAmount: finalNetAmount
            });
            if (!tx) allSuccess = false;
          }

          if (!allSuccess) {
            console.warn("[SlotDetailsDrawer] Falha ao registrar uma ou mais transações financeiras automáticas no fechamento.");
            toast.error("Vaga liberada, mas não foi possível gerar todos os lançamentos financeiros automáticos. Verifique suas contas.");
          }
        } else {
          const tx = await createSaleTransaction({
            saleId: saleData.id,
            saleTotal: saleData.total,
            clientName: clientName,
            paymentMethod: saleData.payment_method || 'Pix',
            saleDate: saleData.sale_date,
            companyId: saleData.company_id,
            isPaid: true
          });
          if (!tx) {
            console.warn("[SlotDetailsDrawer] Falha ao registrar transação financeira automática no fechamento.");
            toast.error("Vaga liberada, mas não foi possível gerar o lançamento financeiro automático. Verifique suas contas.");
          }
        }
      }


      // Optimistic upate
      queryClient.setQueriesData({ queryKey: ['spaces'] }, (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === space?.id ? {
          ...s,
          has_exited: true,
          payment_status: 'paid',
          exit_date: format(new Date(), 'yyyy-MM-dd'),
          exit_time: format(new Date(), 'HH:mm'),
        } : s);
      });

      toast.success("Pagamento confirmado e vaga liberada!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      setShowUnpaidAlert(false);
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao liberar com pagamento:", error);
      toast.error("Erro ao processar liberação");
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReleaseWithoutPayment = async () => {
    if (!space) return;
    setIsReleasing(true);

    try {
      const { error: spaceError } = await supabase
        .from('spaces')
        .update({
          has_exited: true,
          payment_status: 'pending',
          exit_date: format(new Date(), 'yyyy-MM-dd'),
          exit_time: format(new Date(), 'HH:mm'),
        })
        .eq('id', space.id);

      if (spaceError) throw spaceError;

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['spaces'] }, (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === space?.id ? {
          ...s,
          has_exited: true,
          payment_status: 'pending',
          exit_date: format(new Date(), 'yyyy-MM-dd'),
          exit_time: format(new Date(), 'HH:mm'),
        } : s);
      });

      toast.warning("Vaga liberada sem pagamento. Veículo movido para aba 'Não Pagos'.");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      setShowUnpaidAlert(false);
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao liberar sem pagamento:", error);
      toast.error("Erro ao processar liberação");
    } finally {
      setIsReleasing(false);
    }
  };

  const handlePDF = async (format: 'a4' | '80mm' | '58mm') => {
    let companyName = undefined;
    let companyCnpj = undefined;
    let companyLogoUrl = undefined;

    if (companyId) {
      const { data } = await supabase
        .from('companies')
        .select('company_name, cnpj, logo_url')
        .eq('id', companyId)
        .maybeSingle();

      if (data) {
        companyName = data.company_name;
        companyCnpj = data.cnpj;
        companyLogoUrl = data.logo_url;
      }
    }

    const pdfData = {
      id: space.id,
      client_name: space.client?.name || 'N/A',
      client_phone: space.client?.phone || 'N/A',
      client_email: space.client?.email || undefined,
      vehicle_brand: space.vehicle?.brand || '',
      vehicle_model: space.vehicle?.model || '',
      vehicle_plate: space.vehicle?.plate || 'N/A',
      vehicle_year: space.vehicle?.year || undefined,
      entry_date: space.entry_date || '',
      entry_time: space.entry_time || '',
      exit_date: space.exit_date || '',
      exit_time: space.exit_time || '',
      services,
      subtotal,
      discount,
      total,
      observations: space.observations || undefined,
      company_name: companyName,
      company_cnpj: companyCnpj,
      company_logo_url: companyLogoUrl,
    };

    if (format === 'a4') {
      await generateSpacePDFA4(pdfData, companyId);
    } else {
      await generateSpacePDFReceipt(pdfData, format, companyId);
    }
    toast.success("PDF gerado com sucesso!");
  };

  const handleOpenWhatsApp = (type: 'entrada' | 'saida') => {
    setWhatsAppType(type);
    setShowWhatsApp(true);
  };

  const whatsAppSpaceData = {
    id: space.id,
    name: space.name,
    entry_date: space.entry_date,
    entry_time: space.entry_time,
    exit_date: space.exit_date,
    exit_time: space.exit_time,
    observations: space.observations,
    discount,
    client: space.client ? { name: space.client.name, phone: space.client.phone } : null,
    vehicle: space.vehicle ? { brand: space.vehicle.brand, model: space.vehicle.model, plate: space.vehicle.plate } : null,
    services,
    subtotal,
    total,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            {space.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Banner de Excluído */}
          {space.deleted_at && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex flex-col gap-2 shadow-sm">
              <div className="font-bold flex items-center gap-2 text-base">
                <Trash2 className="h-5 w-5 text-destructive" />
                Vaga Excluída (Lixeira Operacional)
              </div>
              <div className="text-muted-foreground">
                Esta vaga foi movida para a lixeira operacional em{" "}
                <span className="font-semibold text-destructive">
                  {format(new Date(space.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>{" "}
                por <span className="font-semibold text-destructive">{deleterProfile?.name || "Carregando..."}</span>.
              </div>
              {space.deleted_reason && (
                <div className="mt-1 bg-destructive/5 p-3 rounded border border-destructive/10 text-xs text-muted-foreground">
                  <span className="font-semibold block text-destructive mb-1">Motivo da Exclusão:</span>
                  <span className="italic">"{space.deleted_reason}"</span>
                </div>
              )}
            </div>
          )}

          {/* Toggle para concluir */}
          {!space.deleted_at && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <CheckCircle className={space.has_exited ? "h-5 w-5 text-success" : "h-5 w-5 text-muted-foreground"} />
                <span className="text-sm font-medium">Concluir vaga e liberar espaço</span>
              </div>
              <Switch
                checked={space.has_exited || false}
                onCheckedChange={handleCompleteToggle}
                disabled={completeMutation.isPending}
              />
            </div>
          )}

          {/* Info do cliente */}
          {space.client && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-info" />
                <span>{space.client.phone}</span>
              </div>
              {space.client.birth_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Cliente nasceu em {formatBirthDate(space.client.birth_date)}</span>
                </div>
              )}
            </div>
          )}

          {/* Card do veículo com serviços */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Serviços dessa vaga</h4>
            <Card className="bg-muted/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                {space.vehicle && (
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{space.vehicle.brand} {space.vehicle.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {space.vehicle.plate && `Placa: ${space.vehicle.plate}`}
                        {space.vehicle.year && ` | Ano: ${space.vehicle.year}`}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Serviços */}
                {services.length > 0 ? (
                  <div className="space-y-2">
                    {services.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium">R$ {item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum serviço vinculado
                  </p>
                )}

                <Separator />

                <div className="flex justify-between text-sm font-medium">
                  <span>Total em serviços</span>
                  <span className="text-primary">R$ {subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo da vaga */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium">Resumo da vaga</h4>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Entrada em {formatDate(space.entry_date)} {space.entry_time && `às ${space.entry_time}h`}</span>
                </p>
                {space.exit_date && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {space.has_exited ? 'Saída' : 'Saída prevista'} para {formatDate(space.exit_date)} {space.exit_time && `às ${space.exit_time}h`}
                    </span>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>Vaga com {serviceCount} serviço(s)</span>
                </p>
                <p className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Sub-total ficou em R$ {subtotal.toFixed(2)}</span>
                </p>
                {discount > 0 && (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Desconto de R$ {discount.toFixed(2)}</span>
                  </p>
                )}
                <p className="flex items-center gap-2 font-medium text-primary">
                  <DollarSign className="h-4 w-4" />
                  <span>Total ficou em R$ {total.toFixed(2)}</span>
                </p>
                {space.sale_id && (
                  <p className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span>Vinculado à venda Nº {space.sale_id}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status de pagamento */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status do pagamento:</span>
              <Badge
                variant="outline"
                className={
                  space.payment_status === 'paid'
                    ? "bg-success/20 text-success border-success/30"
                    : "bg-destructive/20 text-destructive border-destructive/30"
                }
              >
                {space.payment_status === 'paid' ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Pago</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" />Não pago</>
                )}
              </Badge>
            </div>

          </div>

          {/* Comprovantes em PDF */}
          {!space.deleted_at && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comprovantes em PDF</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => handlePDF('a4')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar PDF em formato A4
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => handlePDF('80mm')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar PDF em formato Notinha
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => handlePDF('58mm')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar PDF em formato Notinha Mini
                </Button>
              </div>
            </div>
          )}

          {/* Mais opções */}
          {!space.deleted_at && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Mais opções</h4>
              <div className="space-y-2">
                {!space.sale_id && (
                  <Button variant="outline" className="w-full justify-start text-primary border-primary/20 hover:bg-primary/10" onClick={() => setShowExportSaleModal(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Exportar para Venda
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start text-success" onClick={() => handleOpenWhatsApp('entrada')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar mensagem de entrada
                </Button>
                <Button variant="outline" className="w-full justify-start text-warning" onClick={() => handleOpenWhatsApp('saida')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar mensagem de saída
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleOpenClientProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Ver cliente da vaga
                </Button>
              </div>
            </div>
          )}

          {/* Fotos do Checklist */}
          {(checklistPhotos.length > 0 || isLoadingPhotos) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4" />
                Fotos da Vaga (Checklist)
              </h4>
              {isLoadingPhotos ? (
                <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2">
                  {checklistPhotos.map((photo, index) => (
                    <a
                      key={index}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative min-w-[100px] h-[100px] rounded border overflow-hidden shrink-0 block hover:opacity-80 transition-opacity"
                    >
                      <img src={photo.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          {space.observations && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Observações</h4>
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                {space.observations}
              </p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-4 border-t mt-4">
            {space.deleted_at ? (
              <>
                <Button
                  variant="default"
                  className="flex-1 gap-2 bg-success hover:bg-success/90 text-white font-medium"
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                >
                  {restoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  Restaurar Vaga
                </Button>
                {user?.role === "ADMIN" && (
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2 font-medium"
                    onClick={() => setIsPermanentDeleteDialogOpen(true)}
                    disabled={permanentDeleteMutation.isPending}
                  >
                    {permanentDeleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir Permanente
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Soft Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="w-11/12 max-w-md rounded-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Vaga (Lixeira)</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja mover esta vaga para a lixeira operacional?
                Insira o motivo abaixo:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Textarea
                placeholder="Ex: Cliente desistiu do serviço, duplicado, etc..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full min-h-[80px]"
              />
            </div>
            <AlertDialogFooter className="flex-row gap-2 justify-end">
              <AlertDialogCancel onClick={() => {
                setDeleteReason("");
                setIsDeleteDialogOpen(false);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => {
                  softDeleteMutation.mutate(deleteReason);
                  setDeleteReason("");
                  setIsDeleteDialogOpen(false);
                }}
                disabled={softDeleteMutation.isPending}
              >
                {softDeleteMutation.isPending ? "Excluindo..." : "Mover para Lixeira"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent Delete Dialog */}
        <AlertDialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
          <AlertDialogContent className="w-11/12 max-w-md rounded-lg border-l-4 border-l-destructive">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Exclusão Definitiva
              </AlertDialogTitle>
              <AlertDialogDescription>
                ATENÇÃO: Esta ação é irreversível. A vaga será excluída permanentemente do banco de dados, incluindo quaisquer registros de checklists associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-2 justify-end">
              <AlertDialogCancel onClick={() => setIsPermanentDeleteDialogOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => {
                  permanentDeleteMutation.mutate();
                  setIsPermanentDeleteDialogOpen(false);
                }}
                disabled={permanentDeleteMutation.isPending}
              >
                {permanentDeleteMutation.isPending ? "Excluindo..." : "Excluir Definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alert Dialog for Unpaid Exit */}
        <UnpaidExitAlertDialog
          open={showUnpaidAlert}
          onOpenChange={setShowUnpaidAlert}
          space={space}
          onReleaseWithPayment={handleReleaseWithPayment}
          onReleaseWithoutPayment={handleReleaseWithoutPayment}
          isLoading={isReleasing}
        />

        {/* WhatsApp Modal */}
        <SpaceWhatsAppModal
          open={showWhatsApp}
          onOpenChange={setShowWhatsApp}
          space={whatsAppSpaceData}
          type={whatsAppType}
        />

        {/* Edit Modal */}
        {space && (
          <EditSlotModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            space={space}
            onSlotUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['spaces'] });
              onUpdate?.();
            }}
          />
        )}

        {/* New Sale Modal */}
        {space && space.client_id && space.vehicle_id && (
          <NewSaleModal
            open={showExportSaleModal}
            onOpenChange={setShowExportSaleModal}
            initialDate={space.entry_date ? new Date(space.entry_date + 'T12:00:00') : undefined}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['spaces'] });
              queryClient.invalidateQueries({ queryKey: ['spaces-day'] });
              queryClient.invalidateQueries({ queryKey: ['sales'] });
              onUpdate?.();
            }}
            prefillData={{
              clientId: space.client_id,
              vehicleId: space.vehicle_id,
              discount: space.discount || 0,
              services: space.services_data || [],
              spaceId: space.id,
              observations: space.observations || undefined
            }}
          />
        )}

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
                toast.success("Cliente atualizado com sucesso!");
                queryClient.invalidateQueries({ queryKey: ['spaces'] });
              }}
            />
          </>
        )}

        {/* New Sale Modal (general) */}
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
      </SheetContent>
    </Sheet>
  );
}
