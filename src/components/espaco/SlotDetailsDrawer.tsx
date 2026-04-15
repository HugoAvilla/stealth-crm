import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import NewSaleModal from "../vendas/NewSaleModal";

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
  client?: {
    id: number;
    name: string;
    phone: string;
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
  const [checklistPhotos, setChecklistPhotos] = useState<{name: string, url: string}[]>([]);
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
      const previousSpaces = queryClient.getQueryData(['spaces']);
      
      queryClient.setQueryData(['spaces', (space as any)?.company_id], (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === space?.id ? {
          ...s,
          has_exited: completed,
          exit_date: completed ? format(new Date(), 'yyyy-MM-dd') : s.exit_date,
          exit_time: completed ? format(new Date(), 'HH:mm') : s.exit_time,
        } : s);
      });
      return { previousSpaces };
    },
    onSuccess: () => {
      toast.success(isCompleting ? "Vaga liberada!" : "Vaga reaberta!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao atualizar vaga:", error);
      toast.error("Erro ao atualizar vaga");
    },
  });



  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!space) return;
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', space.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga excluída!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      onOpenChange(false);
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Erro ao excluir vaga:", error);
      toast.error("Erro ao excluir vaga");
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

      if (space.sale_id) {
        const { error: saleError } = await supabase
          .from('sales')
          .update({ is_open: false, status: 'Fechada' })
          .eq('id', space.sale_id);

        if (saleError) throw saleError;
      }

      // Optimistic upate
      queryClient.setQueryData(['spaces', (space as any)?.company_id], (old: any) => {
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
      queryClient.setQueryData(['spaces', (space as any)?.company_id], (old: any) => {
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

  const handlePDF = (format: 'a4' | '80mm' | '58mm') => {
    const pdfData = {
      id: space.id,
      client_name: space.client?.name || 'N/A',
      client_phone: space.client?.phone || 'N/A',
      vehicle_brand: space.vehicle?.brand || '',
      vehicle_model: space.vehicle?.model || '',
      vehicle_plate: space.vehicle?.plate || 'N/A',
      entry_date: space.entry_date || '',
      entry_time: space.entry_time || '',
      exit_date: space.exit_date || '',
      exit_time: space.exit_time || '',
      services,
      subtotal,
      discount,
      total,
    };

    if (format === 'a4') {
      generateSpacePDFA4(pdfData, companyId);
    } else {
      generateSpacePDFReceipt(pdfData, format, companyId);
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
          {/* Toggle para concluir */}
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

          {/* Mais opções */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Mais opções</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-primary border-primary/20 hover:bg-primary/10" onClick={() => setShowExportSaleModal(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Exportar para Venda
              </Button>
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
                onClick={() => {
                  onOpenChange(false);
                  navigate('/clientes');
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Ver cliente da vaga
              </Button>
            </div>
          </div>

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
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {checklistPhotos.map((photo, index) => (
                    <a 
                      key={index} 
                      href={photo.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="relative min-w-[100px] h-[100px] rounded border overflow-hidden shrink-0 block hover:opacity-80 transition-opacity"
                    >
                      <img src={photo.url} alt={`Foto ${index+1}`} className="w-full h-full object-cover" />
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
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => {
                if (confirm("Tem certeza que deseja excluir esta vaga?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

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
            prefillData={{
              clientId: space.client_id,
              vehicleId: space.vehicle_id,
              discount: space.discount || 0,
              services: space.services_data || [],
              spaceId: space.id
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
