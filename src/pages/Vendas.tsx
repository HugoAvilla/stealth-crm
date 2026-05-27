import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, BarChart3, List, Calendar, Download, Search, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { BrazilCalendarLegend } from "@/components/calendar/BrazilCalendarLegend";
import SalesKPIBar from "@/components/vendas/SalesKPIBar";
import NewSaleModal from "@/components/vendas/NewSaleModal";
import SalesDayDrawer from "@/components/vendas/SalesDayDrawer";
import SalesChartsModal from "@/components/vendas/SalesChartsModal";
import SaleDetailsModal from "@/components/vendas/SaleDetailsModal";
import { DownloadedPDFsTab } from "@/components/shared/DownloadedPDFsTab";
import { SaleWithDetails } from "@/types/sales";
import {
  BRAZIL_CALENDAR_EVENT_STYLES,
  getBrazilCalendarTitle,
  getPrimaryBrazilCalendarEvent,
} from "@/lib/brazilCalendar";

const Vendas = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isChartsModalOpen, setIsChartsModalOpen] = useState(false);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vendas");
  const [initialSaleDate, setInitialSaleDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Deleted Sales state
  const [deletedSales, setDeletedSales] = useState<SaleWithDetails[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [selectedDetailedSale, setSelectedDetailedSale] = useState<SaleWithDetails | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    if (activeTab === "vendas") {
      fetchSales();
    } else if (activeTab === "excluidas") {
      fetchDeletedSales();
    }
  }, [user?.id, currentDate, activeTab]);

  const fetchSales = async () => {
    if (!user?.id || !user?.companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, year, plate, size),
          sale_items(
            id, service_id, quantity, unit_price, total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq('company_id', user.companyId)
        .is('deleted_at', null)
        .gte('sale_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('sale_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('sale_date', { ascending: false });

      if (error) {
        console.error('SUPABASE SALES ERROR:', error);
      }
      if (!error && data) {
        console.log('SUPABASE SALES DATA:', data);
        // Transform data to match SaleWithDetails interface
        const transformedSales: SaleWithDetails[] = data.map((sale: any) => ({
          id: sale.id,
          client_id: sale.client_id,
          vehicle_id: sale.vehicle_id,
          sale_date: sale.sale_date,
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          payment_method: sale.payment_method,
          status: sale.status,
          is_open: sale.is_open,
          observations: sale.observations,
          created_at: sale.created_at,
          client: sale.client,
          vehicle: sale.vehicle,
          sale_items: sale.sale_items || [],
        }));
        setSales(transformedSales);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedSales = async () => {
    if (!user?.id || !user?.companyId) {
      setDeletedLoading(false);
      return;
    }
    setDeletedLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, year, plate, size),
          sale_items(
            id, service_id, quantity, unit_price, total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq('company_id', user.companyId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        const transformedSales: SaleWithDetails[] = data.map((sale: any) => ({
          id: sale.id,
          client_id: sale.client_id,
          vehicle_id: sale.vehicle_id,
          sale_date: sale.sale_date,
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          payment_method: sale.payment_method,
          status: sale.status,
          is_open: sale.is_open,
          observations: sale.observations,
          created_at: sale.created_at,
          client: sale.client,
          vehicle: sale.vehicle,
          sale_items: sale.sale_items || [],
          deleted_at: sale.deleted_at,
          deleted_by: sale.deleted_by,
          deleted_reason: sale.deleted_reason,
          restored_at: sale.restored_at,
          restored_by: sale.restored_by
        }));
        setDeletedSales(transformedSales);
      }
    } catch (error) {
      console.error('Error fetching deleted sales:', error);
    } finally {
      setDeletedLoading(false);
    }
  };

  const getSalesForDay = (day: Date): SaleWithDetails[] => {
    return monthSales.filter((sale) => isSameDay(new Date(sale.sale_date + 'T12:00:00'), day));
  };

  const monthSales = sales.filter((sale) => {
    let pass = true;
    if (statusFilter !== "all") {
      const wantOpen = statusFilter === "aberta";
      if (sale.is_open !== wantOpen) pass = false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchClient = sale.client?.name?.toLowerCase().includes(term);
      const matchId = sale.id.toString() === term;
      if (!matchClient && !matchId) pass = false;
    }
    return pass;
  });
  
  const totalMonthValue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[100vw] overflow-x-hidden">
      <HelpOverlay
        tabId="vendas"
        title="Guia de Vendas"
        sections={[
          {
            title: "Vídeo Aula — Vendas",
            description: "Assista ao vídeo tutorial completo para aprender a usar todas as funcionalidades da gestão de vendas.",
            videoUrl: "/help/video-aula-vendas.mp4"
          },
          {
            title: "Registrar Nova Venda",
            description: "Clique no botão 'Nova venda' no topo da página. Selecione o cliente, o veículo, adicione os serviços realizados e escolha a forma de pagamento. A venda será registrada no calendário na data selecionada.",
            screenshotUrl: "/help/help-vendas-nova.png"
          },
          {
            title: "Alternar entre Calendário e Lista",
            description: "Use os botões 'Calendário' e 'Lista' no topo para alternar a visualização. No modo calendário, cada dia mostra a quantidade de vendas e o valor total. No modo lista, você vê todas as vendas em ordem cronológica.",
            screenshotUrl: "/help/help-vendas-visualizacao.png"
          },
          {
            title: "Detalhes do Dia",
            description: "Clique em um dia no calendário que possua vendas para abrir o drawer lateral com todos os detalhes: cliente, veículo, serviços realizados e valor total de cada venda do dia.",
            screenshotUrl: "/help/help-vendas-dia.png"
          },
          {
            title: "Gráficos e Indicadores (KPIs)",
            description: "A barra de KPIs mostra o resumo rápido (total de vendas, ticket médio, etc). Clique em 'Ver gráficos' para análises detalhadas com gráficos de barras e evolução temporal.",
            screenshotUrl: "/help/help-vendas-graficos.png"
          },
        ]}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-2 pb-1">
          <TabsTrigger value="vendas" className="gap-2">
            <Calendar className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2">
            <Download className="h-4 w-4" />
            PDFs Baixados
          </TabsTrigger>
          <TabsTrigger value="excluidas" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Lixeira / Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6 mt-4">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex bg-card rounded-lg p-1 w-full sm:w-auto">
                  <Button
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Calendar className="h-4 w-4" />
                    Calendário
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </Button>
                </div>
                
                {/* Search and Filters */}
                <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar venda ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full sm:w-[150px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="aberta">Abertas</SelectItem>
                      <SelectItem value="fechada">Fechadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => setIsNewSaleModalOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Nova venda
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-base sm:text-lg font-medium min-w-[140px] sm:min-w-[180px] text-center capitalize">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center w-full justify-between sm:w-auto gap-2 sm:gap-4">
                  <Badge variant="outline" className="text-sm py-1.5 px-3 whitespace-nowrap flex-1 justify-center sm:flex-none">
                    {monthSales.length} vendas | R$ {totalMonthValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Badge>

                  <Button variant="outline" onClick={() => setIsChartsModalOpen(true)} className="gap-2 flex-1 sm:flex-none">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver gráficos</span>
                    <span className="sm:hidden">Gráficos</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Bar */}
          <SalesKPIBar sales={monthSales} />

          {/* Loading State */}
          {loading ? (
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            </Card>
          ) : (
            <>
              {/* Calendar Grid */}
              {viewMode === "calendar" && (
                <Card className="p-4">
                  <div className="mb-4">
                    <BrazilCalendarLegend />
                  </div>

                  {/* Week days header */}
                  <div className="grid grid-cols-7 mb-2">
                    {weekDays.map((day) => (
                      <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2 truncate">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarDays.map((day) => {
                      const daySales = getSalesForDay(day);
                      const dayTotal = daySales.reduce((sum, sale) => sum + sale.total, 0);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isToday = isSameDay(day, new Date());
                      const calendarEvent = getPrimaryBrazilCalendarEvent(day);
                      const eventTitle = getBrazilCalendarTitle(day);

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          title={eventTitle}
                          className={cn(
                            "min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-border rounded-lg transition-colors overflow-hidden cursor-pointer hover:bg-muted/50",
                            isCurrentMonth ? "bg-card" : "bg-background opacity-50",
                            calendarEvent &&
                              BRAZIL_CALENDAR_EVENT_STYLES[calendarEvent.kind].dayClass,
                            isToday && "ring-2 ring-primary"
                          )}
                        >
                          <div className="mb-1 flex items-center justify-center relative min-h-[24px]">
                            <div className={cn(
                              "text-sm sm:text-base font-extrabold",
                              isToday ? "text-primary" : "text-foreground"
                            )}>
                              {format(day, "d")}
                            </div>

                            {isToday ? (
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-red-600 text-white text-[9px] leading-none sm:text-[10px] font-extrabold px-1.5 py-0.5 shadow-sm">
                                HOJE
                              </span>
                            ) : calendarEvent ? (
                              <span
                                className={cn(
                                  "absolute right-1 top-1/2 -translate-y-1/2 max-w-[65%] truncate rounded px-1 py-0.5 text-[9px] leading-none sm:text-[10px]",
                                  BRAZIL_CALENDAR_EVENT_STYLES[calendarEvent.kind].chipClass
                                )}
                              >
                                {calendarEvent.shortName}
                              </span>
                            ) : null}
                          </div>

                          {daySales.length > 0 && (
                            <>
                              {/* Visualização Desktop */}
                              <div className="hidden sm:flex flex-col space-y-1 items-center w-full">
                                <Badge variant="default" className="w-full justify-center text-[10px] sm:text-xs bg-green-500 text-white hover:bg-green-600 px-0 sm:px-2 py-0 sm:py-0.5 max-w-full font-bold shadow-sm">
                                  <span className="truncate">{daySales.length} <span className="hidden sm:inline">venda{daySales.length > 1 ? "s" : ""}</span></span>
                                </Badge>
                                <Badge variant="outline" className="w-full justify-center text-[10px] sm:text-xs px-0 sm:px-2 py-0 sm:py-0.5 max-w-full">
                                  <span className="truncate">R$ {dayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                                </Badge>
                              </div>

                              {/* Visualização Mobile Compacta */}
                              <div className="flex sm:hidden flex-col items-center justify-center gap-0.5 mt-0.5 w-full">
                                <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] font-extrabold shadow-sm">
                                  {daySales.length}
                                </div>
                                <span className="text-[8px] font-extrabold text-green-500 truncate max-w-full">
                                  {dayTotal >= 1000 ? `${(dayTotal / 1000).toFixed(1).replace('.', ',')}k` : dayTotal}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <Card className="p-4">
                  <div className="space-y-2">
                    {monthSales.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Nenhuma venda encontrada neste período
                      </div>
                    ) : (
                      monthSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedDay(new Date(sale.sale_date + 'T12:00:00'))}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                              <span className="text-success font-semibold">💰</span>
                            </div>
                            <div>
                              <p className="font-medium">Venda #{sale.id}</p>
                              <p className="text-sm text-muted-foreground">{sale.client?.name || "Cliente"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-success">
                              R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(sale.sale_date + 'T12:00:00'), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <Badge variant={!sale.is_open ? "default" : "outline"}>
                            {sale.is_open ? 'Aberta' : 'Fechada'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <DownloadedPDFsTab module="vendas" />
        </TabsContent>

        <TabsContent value="excluidas" className="mt-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Lixeira Operacional
              </h3>
              <p className="text-xs text-muted-foreground">
                Exibindo vendas excluídas logicamente. Apenas administradores podem fazer exclusão permanente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na lixeira..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDeletedSales}
                disabled={deletedLoading}
                className="gap-2 h-9"
              >
                <RefreshCw className={cn("h-4 w-4", deletedLoading && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>

          {deletedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-5 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : (() => {
            const filteredDeleted = deletedSales.filter((sale) => {
              if (!searchTerm) return true;
              const term = searchTerm.toLowerCase();
              const matchClient = sale.client?.name?.toLowerCase().includes(term);
              const matchId = sale.id.toString() === term;
              const matchVehicle = sale.vehicle?.plate?.toLowerCase().includes(term) ||
                sale.vehicle?.model?.toLowerCase().includes(term);
              return matchClient || matchId || matchVehicle;
            });

            if (filteredDeleted.length === 0) {
              return (
                <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border-dashed">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Trash2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Lixeira vazia</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Nenhuma venda excluída logicamente foi encontrada para os termos buscados.
                  </p>
                </Card>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeleted.map((sale) => (
                  <Card key={sale.id} className="p-5 flex flex-col justify-between border border-destructive/10 hover:border-destructive/20 hover:shadow-md transition-all">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-base flex items-center gap-1.5">
                            Venda Nº {sale.id}
                          </h4>
                          <span className="text-xs text-muted-foreground block">
                            Realizada em {format(new Date(sale.sale_date + 'T12:00:00'), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" />
                          Excluída
                        </Badge>
                      </div>

                      <div className="text-sm space-y-1.5 text-muted-foreground border-t pt-2 mt-2">
                        <p><strong className="text-foreground font-medium">Cliente:</strong> {sale.client?.name || "Sem Nome"}</p>
                        {sale.vehicle && (
                          <p><strong className="text-foreground font-medium">Veículo:</strong> {sale.vehicle.brand} {sale.vehicle.model} ({sale.vehicle.plate || "S/ Placa"})</p>
                        )}
                        <p className="text-base font-semibold text-destructive mt-2">
                          Total: R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {sale.deleted_at && (
                        <div className="bg-destructive/5 p-3 rounded border border-destructive/10 text-xs text-muted-foreground space-y-1 mt-3">
                          <span className="font-semibold text-destructive block">Motivo da exclusão:</span>
                          <p className="italic">"{sale.deleted_reason || "Nenhum motivo fornecido."}"</p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-5 gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
                      onClick={() => setSelectedDetailedSale(sale)}
                    >
                      Visualizar & Gerenciar
                    </Button>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Modals & Drawers */}
      <NewSaleModal
        open={isNewSaleModalOpen}
        onOpenChange={(open) => {
          setIsNewSaleModalOpen(open);
          if (!open) {
            setInitialSaleDate(undefined);
          }
        }}
        initialDate={initialSaleDate}
        onSuccess={fetchSales}
      />

      <SalesDayDrawer
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        selectedDate={selectedDay}
        allSales={sales}
        onNewSale={(date) => {
          setSelectedDay(null);
          setInitialSaleDate(date);
          setIsNewSaleModalOpen(true);
        }}
      />

      <SalesChartsModal
        open={isChartsModalOpen}
        onOpenChange={setIsChartsModalOpen}
        sales={monthSales}
      />

      <SaleDetailsModal
        open={!!selectedDetailedSale}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDetailedSale(null);
            if (activeTab === "excluidas") {
              fetchDeletedSales();
            } else {
              fetchSales();
            }
          }
        }}
        sale={selectedDetailedSale}
      />
    </div>
  );
};

export default Vendas;
