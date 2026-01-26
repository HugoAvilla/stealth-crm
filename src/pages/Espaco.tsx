import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Car, Clock, Pause, CheckCircle, AlertCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { slots, sales, getClientById, getVehicleById, getServiceById, type Slot } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { SlotCard } from "@/components/espaco/SlotCard";
import { NewSlotModal } from "@/components/espaco/NewSlotModal";
import { SlotsDayDrawer } from "@/components/espaco/SlotsDayDrawer";

export default function Espaco() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slotsData, setSlotsData] = useState<Slot[]>(slots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const occupiedCount = slotsData.filter(s => s.status === "ocupada").length;
  const availableCount = slotsData.filter(s => s.status === "disponivel").length;
  const maintenanceCount = slotsData.filter(s => s.status === "manutencao").length;

  const getStatusIcon = (status: Slot['work_status']) => {
    switch (status) {
      case 'em_andamento': return <Clock className="h-3 w-3" />;
      case 'pausado': return <Pause className="h-3 w-3" />;
      case 'em_espera': return <AlertCircle className="h-3 w-3" />;
      case 'finalizado': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: Slot['work_status']) => {
    switch (status) {
      case 'em_andamento': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'pausado': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'em_espera': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'finalizado': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleFillSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setShowNewSlotModal(true);
  };

  const handleSlotFilled = (slotId: number, saleId: number) => {
    setSlotsData(prev => prev.map(s => 
      s.id === slotId 
        ? { ...s, status: 'ocupada' as const, sale_id: saleId, started_at: new Date().toISOString(), work_status: 'em_andamento' as const }
        : s
    ));
    setShowNewSlotModal(false);
    setSelectedSlot(null);
  };

  const handleStatusChange = (slotId: number, newStatus: Slot['work_status']) => {
    setSlotsData(prev => prev.map(s => 
      s.id === slotId ? { ...s, work_status: newStatus } : s
    ));
  };

  const handleReleaseSlot = (slotId: number) => {
    setSlotsData(prev => prev.map(s => 
      s.id === slotId 
        ? { ...s, status: 'disponivel' as const, sale_id: undefined, started_at: undefined, work_status: undefined }
        : s
    ));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Espaço (Vagas)</h1>
          <p className="text-muted-foreground">Gerencie a ocupação das vagas do seu estabelecimento</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Vagas</p>
                <p className="text-2xl font-bold">{slotsData.length}</p>
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

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manutenção</p>
                <p className="text-2xl font-bold text-orange-500">{maintenanceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slots Grid */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Vagas do Pátio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {slotsData.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onFill={() => handleFillSlot(slot)}
                onStatusChange={handleStatusChange}
                onRelease={handleReleaseSlot}
              />
            ))}
          </div>
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
              const dayStr = format(day, 'yyyy-MM-dd');
              const daySales = sales.filter(s => s.date === dayStr);
              const inProgress = daySales.filter(s => s.status === 'Aberta').length;
              const completed = daySales.filter(s => s.status === 'Fechada').length;

              return (
                <button
                  key={dayStr}
                  onClick={() => !isFuture(day) && setSelectedDay(day)}
                  disabled={isFuture(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1",
                    isToday(day) && "border-primary",
                    isFuture(day) ? "opacity-40 cursor-not-allowed bg-muted/20" : "hover:bg-accent cursor-pointer",
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

      {/* Modals */}
      <NewSlotModal
        open={showNewSlotModal}
        onOpenChange={setShowNewSlotModal}
        slot={selectedSlot}
        onSlotFilled={handleSlotFilled}
      />

      <SlotsDayDrawer
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        date={selectedDay}
      />
    </div>
  );
}
