import { useState } from "react";
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
import { ChevronLeft, ChevronRight, Plus, BarChart3, List, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sales, getClientById, getServiceById, Sale } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import SalesKPIBar from "@/components/vendas/SalesKPIBar";
import NewSaleModal from "@/components/vendas/NewSaleModal";
import SalesDayDrawer from "@/components/vendas/SalesDayDrawer";
import SalesChartsModal from "@/components/vendas/SalesChartsModal";

const Vendas = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isChartsModalOpen, setIsChartsModalOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSalesForDay = (day: Date): Sale[] => {
    return sales.filter((sale) => isSameDay(new Date(sale.date), day));
  };

  const getMonthSales = () => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= monthStart && saleDate <= monthEnd;
    });
  };

  const monthSales = getMonthSales();
  const totalMonthValue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex bg-card rounded-lg p-1">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendário
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
          <Button onClick={() => setIsNewSaleModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova venda
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium min-w-[180px] text-center">
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

          <Badge variant="outline" className="text-sm py-1.5 px-3">
            {monthSales.length} vendas | R$ {totalMonthValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </Badge>

          <Button variant="outline" onClick={() => setIsChartsModalOpen(true)} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Ver gráficos
          </Button>
        </div>
      </div>

      {/* KPI Bar */}
      <SalesKPIBar sales={monthSales} />

      {/* Calendar Grid */}
      {viewMode === "calendar" && (
        <Card className="p-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const daySales = getSalesForDay(day);
              const dayTotal = daySales.reduce((sum, sale) => sum + sale.total, 0);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => daySales.length > 0 && setSelectedDay(day)}
                  className={cn(
                    "min-h-[100px] p-2 border border-border rounded-lg transition-colors",
                    isCurrentMonth ? "bg-card" : "bg-background opacity-50",
                    isToday && "ring-2 ring-primary",
                    daySales.length > 0 && "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-2",
                    isToday && "text-primary"
                  )}>
                    {format(day, "d")}
                  </div>

                  {daySales.length > 0 && (
                    <div className="space-y-1">
                      <Badge className="w-full justify-center text-xs bg-success/20 text-success border-success/30 hover:bg-success/30">
                        {daySales.length} venda{daySales.length > 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="w-full justify-center text-xs">
                        R$ {dayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </Badge>
                    </div>
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
              monthSales.map((sale) => {
                const client = getClientById(sale.client_id);
                return (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDay(new Date(sale.date))}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-success font-semibold">💰</span>
                      </div>
                      <div>
                        <p className="font-medium">Venda #{sale.id}</p>
                        <p className="text-sm text-muted-foreground">{client?.name || "Cliente"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-success">
                        R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sale.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant={sale.status === "Fechada" ? "default" : "outline"}>
                      {sale.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Modals & Drawers */}
      <NewSaleModal
        open={isNewSaleModalOpen}
        onOpenChange={setIsNewSaleModalOpen}
      />

      <SalesDayDrawer
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        selectedDate={selectedDay}
      />

      <SalesChartsModal
        open={isChartsModalOpen}
        onOpenChange={setIsChartsModalOpen}
        sales={monthSales}
      />
    </div>
  );
};

export default Vendas;
