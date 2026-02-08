import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Car, Clock, CheckCircle, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { HelpOverlay } from "@/components/help/HelpOverlay";
import { SlotCard } from "@/components/espaco/SlotCard";
import { FillSlotModal } from "@/components/espaco/FillSlotModal";
import { SlotDetailsDrawer } from "@/components/espaco/SlotDetailsDrawer";
import { SlotsDayDrawer } from "@/components/espaco/SlotsDayDrawer";
import PaidExitedVehicles from "@/components/espaco/PaidExitedVehicles";
import UnpaidExitedVehicles from "@/components/espaco/UnpaidExitedVehicles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SpaceData {
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
  status: string | null;
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

export default function Espaco() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFillSlotModal, setShowFillSlotModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<SpaceData | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("vagas");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  // Fetch active spaces from Supabase
  const { data: spaces, isLoading } = useQuery({
    queryKey: ['spaces', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          *,
          client:clients(id, name, phone, birth_date),
          vehicle:vehicles(id, brand, model, plate, year),
          sale:sales(
            id, total, subtotal, discount,
            sale_items(
              id,
              total_price,
              service:services(id, name)
            )
          )
        `)
        .eq('company_id', companyId)
        .eq('has_exited', false)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return data as unknown as SpaceData[];
    },
    enabled: !!companyId,
  });

  // Fetch unpaid exited vehicles count
  const { data: unpaidCount } = useQuery({
    queryKey: ['unpaid-exited-count', companyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('spaces')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('has_exited', true)
        .or('payment_status.neq.paid,payment_status.is.null');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId,
  });

  // Calculate counts
  const occupiedCount = spaces?.length || 0;
  const availableCount = 10 - occupiedCount; // Assuming 10 slots total

  const handleSlotClick = (space: SpaceData) => {
    setSelectedSpace(space);
    setShowDetailsDrawer(true);
  };

  const handleSlotFilled = () => {
    queryClient.invalidateQueries({ queryKey: ['spaces'] });
    queryClient.invalidateQueries({ queryKey: ['unpaid-exited-count'] });
    setRefreshTrigger(prev => prev + 1);
  };

  // Group spaces by entry date for calendar
  const getSpacesForDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return spaces?.filter(s => s.entry_date === dayStr) || [];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Espaço (Vagas)</h1>
          <p className="text-muted-foreground">Gerencie a ocupação das vagas do seu estabelecimento</p>
        </div>
        <Button onClick={() => setShowFillSlotModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Preencher Vaga
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vagas" className="gap-2">
            <Car className="h-4 w-4" />
            Vagas Ativas
          </TabsTrigger>
          <TabsTrigger value="pagos-saida" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Veículos Pagos (Saída)
          </TabsTrigger>
          <TabsTrigger value="nao-pagos-saida" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Não Pagos (Saída)
            {unpaidCount !== undefined && unpaidCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground animate-pulse flex items-center gap-0.5"
              >
                <AlertTriangle className="h-3 w-3" />
                {unpaidCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vagas" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Vagas</p>
                    <p className="text-2xl font-bold">10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disponíveis</p>
                    <p className="text-2xl font-bold text-green-500">{availableCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ocupadas</p>
                    <p className="text-2xl font-bold text-yellow-500">{occupiedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Slots Grid */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Vagas Ocupadas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : spaces && spaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {spaces.map(space => (
                    <SlotCard
                      key={space.id}
                      space={space}
                      onClick={() => handleSlotClick(space)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Car className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma vaga ocupada no momento</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setShowFillSlotModal(true)}
                  >
                    Preencher primeira vaga
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Calendário de Ocupação</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-sm text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {days.map(day => {
                  const daySpaces = getSpacesForDay(day);
                  const inProgress = daySpaces.filter(s => !s.has_exited && s.payment_status !== 'paid').length;
                  const completed = daySpaces.filter(s => s.has_exited || s.payment_status === 'paid').length;

                  return (
                    <button
                      key={format(day, 'yyyy-MM-dd')}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1 hover:bg-accent cursor-pointer",
                        isToday(day) && "border-primary",
                        !isSameMonth(day, currentDate) && "opacity-50"
                      )}
                    >
                      <span className={cn(
                        "text-sm",
                        isToday(day) && "font-bold text-primary"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {(inProgress > 0 || completed > 0) && (
                        <div className="flex gap-0.5">
                          {inProgress > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              {inProgress}
                            </Badge>
                          )}
                          {completed > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                              {completed}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
                  <span>Em andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                  <span>Finalizados</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos-saida" className="mt-6">
          <PaidExitedVehicles refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="nao-pagos-saida" className="mt-6">
          <UnpaidExitedVehicles refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <FillSlotModal
        open={showFillSlotModal}
        onOpenChange={setShowFillSlotModal}
        onSlotFilled={handleSlotFilled}
        preselectedDate={selectedDay || undefined}
      />

      <SlotDetailsDrawer
        open={showDetailsDrawer}
        onOpenChange={setShowDetailsDrawer}
        space={selectedSpace}
        onUpdate={handleSlotFilled}
      />

      <SlotsDayDrawer
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        date={selectedDay}
      />
    </div>
  );
}
