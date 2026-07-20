import {
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BrazilCalendarLegend } from "@/components/calendar/BrazilCalendarLegend";
import { SaleWithDetails } from "@/types/sales";
import {
    BRAZIL_CALENDAR_EVENT_STYLES,
    getBrazilCalendarTitle,
    getPrimaryBrazilCalendarEvent,
} from "@/lib/brazilCalendar";

interface SalesCalendarViewProps {
    currentDate: Date;
    monthSales: SaleWithDetails[];
    onDayClick: (day: Date) => void;
}

export function SalesCalendarView({ currentDate, monthSales, onDayClick }: SalesCalendarViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const getSalesForDay = (day: Date): SaleWithDetails[] => {
        return monthSales.filter((sale) => isSameDay(new Date(sale.sale_date + 'T12:00:00'), day));
    };

    return (
        <Card className="p-4">
            <div className="mb-4">
                <BrazilCalendarLegend />
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-[11px] sm:text-sm font-semibold text-muted-foreground py-1 sm:py-2 truncate">
                        {day}
                    </div>
                ))}
            </div>

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
                            onClick={() => onDayClick(day)}
                            title={eventTitle}
                            className={cn(
                                "h-[72px] sm:h-auto sm:aspect-square sm:min-h-[100px] p-1.5 sm:p-2 border border-border rounded-lg sm:rounded-xl transition-all flex flex-col items-center cursor-pointer hover:bg-accent/80 hover:scale-[1.02] overflow-hidden relative shadow-sm",
                                isCurrentMonth ? "bg-card" : "bg-background opacity-40",
                                calendarEvent && BRAZIL_CALENDAR_EVENT_STYLES[calendarEvent.kind].dayClass,
                                isToday && "border-primary ring-1 ring-primary/20"
                            )}
                        >
                            <div className="flex w-full justify-between items-start mb-0.5 sm:mb-0 sm:absolute sm:top-1.5 sm:left-1.5 sm:right-1.5 pointer-events-none">
                                {isToday ? (
                                    <span className="rounded bg-red-600 text-white text-[8px] sm:text-[10px] font-black px-1 py-px sm:px-1.5 sm:py-0.5 shadow-[0_0_8px_rgba(239,68,68,0.7)] border border-red-500 uppercase tracking-wide leading-none z-10 shrink-0">
                                        Hoje
                                    </span>
                                ) : <div className="shrink-0" />}

                                {calendarEvent ? (
                                    <span
                                        className={cn(
                                            "max-w-[60%] truncate rounded px-1 py-px sm:px-1.5 sm:py-0.5 text-[7px] sm:text-[7px] font-bold leading-none origin-right",
                                            BRAZIL_CALENDAR_EVENT_STYLES[calendarEvent.kind].chipClass
                                        )}
                                    >
                                        {calendarEvent.shortName}
                                    </span>
                                ) : null}
                            </div>

                            <span className={cn(
                                "text-xl sm:text-4xl font-extrabold tracking-tight leading-none my-auto",
                                isToday ? "text-primary" : "text-foreground"
                            )}>
                                {format(day, "d")}
                            </span>

                            {daySales.length > 0 ? (
                                <>
                                    <div className="hidden sm:flex flex-col space-y-1 items-center w-full mt-auto">
                                        <Badge variant="default" className="w-full justify-center text-xs bg-green-500 text-white hover:bg-green-600 px-2 py-0.5 max-w-full font-bold shadow-sm">
                                            <span className="truncate">{daySales.length} venda{daySales.length > 1 ? "s" : ""}</span>
                                        </Badge>
                                        <Badge variant="outline" className="w-full justify-center text-xs px-2 py-0.5 max-w-full">
                                            <span className="truncate">R$ {dayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                                        </Badge>
                                    </div>

                                    <div className="flex sm:hidden items-center justify-center mt-auto w-full">
                                        <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] font-extrabold shadow-sm">
                                            {daySales.length}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-4 sm:h-10 w-full pointer-events-none opacity-0 mt-auto" />
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
