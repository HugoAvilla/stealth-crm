import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, CheckCircle, AlertTriangle, Download, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { FillSlotModal } from "@/shared/components/espaco/FillSlotModal";
import { SlotDetailsDrawer } from "./components/SlotDetailsDrawer";
import { SlotsDayDrawer } from "./components/SlotsDayDrawer";
import { ConfigureSlotsModal } from "./components/ConfigureSlotsModal";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";
import { VagasAtivas } from "./sub-abas/VagasAtivas/VagasAtivas";
import { Lixeira } from "./sub-abas/Lixeira/Lixeira";
import VeiculosPagos from "./sub-abas/VeiculosPagos/VeiculosPagos";
import VeiculosNaoPagos from "./sub-abas/VeiculosNaoPagos/VeiculosNaoPagos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Espaco() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  const [showFillSlotModal, setShowFillSlotModal] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showConfigureSlotsModal, setShowConfigureSlotsModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("vagas");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fallbackSpace, setFallbackSpace] = useState<any | null>(null);

  // Global counts and settings
  const { data: unpaidCount } = useQuery({
    queryKey: ['unpaid-exited-count', companyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('spaces')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .or('payment_status.neq.paid,payment_status.is.null');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: companySettings, refetch: refetchSettings } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('total_slots')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const totalSlots = companySettings?.total_slots || 10;

  // Real-time Space selected logic
  const { data: spaces } = useQuery({ queryKey: ['spaces', companyId] });
  const { data: deletedSpaces } = useQuery({ queryKey: ['spaces-deleted', companyId] });
  const selectedSpace = (spaces as any[])?.find(s => s.id === selectedSpaceId)
    || (deletedSpaces as any[])?.find(s => s.id === selectedSpaceId)
    || fallbackSpace || null;

  const handleSlotFilled = () => {
    queryClient.invalidateQueries({ queryKey: ['spaces'] });
    queryClient.invalidateQueries({ queryKey: ['spaces-deleted'] });
    queryClient.invalidateQueries({ queryKey: ['unpaid-exited-count'] });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSlotClick = (space: any) => {
    setFallbackSpace(space);
    setSelectedSpaceId(space.id);
    setShowDetailsDrawer(true);
  };

  const handleUnpaidSpaceClick = (space: any) => {
    setFallbackSpace(space);
    setSelectedSpaceId(space.id);
    setShowDetailsDrawer(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="espaco"
        title="Guia de Vagas"
        sections={[
          {
            title: "Vídeo Aula — Espaço",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de vagas.",
            videoUrl: "/help/video-aula-espaco.mp4"
          },
          {
            title: "Preencher Vaga",
            description: "Clique em 'Preencher Vaga' para registrar a entrada de um veículo. Selecione o cliente, veículo, serviços a serem realizados e a data/hora de entrada. O veículo aparecerá como vaga ocupada.",
            screenshotUrl: "/help/help-espaco-preencher.png"
          },
          {
            title: "Vagas Ativas",
            description: "Na aba 'Vagas Ativas' você vê os cards de resumo (Total, Disponíveis, Ocupadas) e os cards de cada veículo em serviço. Clique em um card para ver detalhes, registrar saída ou alterar informações.",
            screenshotUrl: "/help/help-espaco-ativas.png"
          },
          {
            title: "Veículos Pagos e Não Pagos",
            description: "Use as abas 'Veículos Pagos' e 'Não Pagos' para acompanhar o status de pagamento dos veículos. O badge vermelho na aba indica quantos veículos não foram pagos.",
            screenshotUrl: "/help/help-espaco-pagos.png"
          },
          {
            title: "Calendário de Ocupação",
            description: "O calendário mostra a ocupação diária. Dias com badges amarelos indicam veículos em andamento, verdes indicam finalizados. Clique em um dia para ver detalhes.",
            screenshotUrl: "/help/help-espaco-calendario.png"
          }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Espaço (Vagas)</h1>
          <p className="text-muted-foreground">Gerencie a ocupação das vagas do seu estabelecimento</p>
        </div>
        <Button onClick={() => setShowFillSlotModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Preencher Vaga
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-2 pb-1">
          <TabsTrigger value="vagas" className="gap-2">
            <Car className="h-4 w-4" />
            Vagas Ativas
          </TabsTrigger>
          <TabsTrigger value="pagos-saida" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Veículos Pagos
          </TabsTrigger>
          <TabsTrigger value="nao-pagos-saida" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Não Pagos
            {unpaidCount !== undefined && unpaidCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground animate-pulse flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                {unpaidCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2">
            <Download className="h-4 w-4" />
            PDFs Baixados
          </TabsTrigger>
          <TabsTrigger value="lixeira" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Lixeira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vagas">
          <VagasAtivas
            setShowConfigureSlotsModal={setShowConfigureSlotsModal}
            setShowFillSlotModal={setShowFillSlotModal}
            handleSlotClick={handleSlotClick}
            setSelectedDay={setSelectedDay}
            totalSlots={totalSlots}
          />
        </TabsContent>

        <TabsContent value="pagos-saida" className="mt-6">
          <VeiculosPagos refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="nao-pagos-saida" className="mt-6">
          <VeiculosNaoPagos refreshTrigger={refreshTrigger} onSpaceClick={handleUnpaidSpaceClick} />
        </TabsContent>

        <TabsContent value="pdfs" className="mt-6">
          <DownloadedPDFsTab module="espaco" />
        </TabsContent>

        <TabsContent value="lixeira">
          <Lixeira handleSlotClick={handleSlotClick} />
        </TabsContent>
      </Tabs>

      {/* Modals & Drawers */}
      <FillSlotModal
        open={showFillSlotModal}
        onOpenChange={setShowFillSlotModal}
        onSlotFilled={handleSlotFilled}
        preselectedDate={selectedDay || undefined}
        totalSlots={totalSlots}
        occupiedCount={(spaces as any[])?.filter(s => !s.has_exited).length || 0}
      />
      <SlotDetailsDrawer
        open={showDetailsDrawer}
        onOpenChange={(open) => {
          setShowDetailsDrawer(open);
          if (!open) setFallbackSpace(null);
        }}
        space={selectedSpace}
        onUpdate={handleSlotFilled}
      />
      <SlotsDayDrawer
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        date={selectedDay}
        onAddSlot={() => setShowFillSlotModal(true)}
      />
      <ConfigureSlotsModal
        open={showConfigureSlotsModal}
        onOpenChange={setShowConfigureSlotsModal}
        currentTotal={totalSlots}
        onSuccess={() => refetchSettings()}
      />
    </div>
  );
}
