import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Car, Clock, CheckCircle, AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { BrazilCalendarLegend } from "@/components/calendar/BrazilCalendarLegend";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    BRAZIL_CALENDAR_EVENT_STYLES,
    getBrazilCalendarTitle,
    getPrimaryBrazilCalendarEvent,
} from "@/lib/brazilCalendar";
import { SlotCard } from "../../components/SlotCard";

export interface SpaceData {
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
    deleted_at?: string | null;
    deleted_by?: string | null;
    deleted_reason?: string | null;
    client?: {
        id: number;
        name: string;
        phone: string;
        birth_date: string | null;
        email?: string | null;
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

interface VagasAtivasProps {
    setShowConfigureSlotsModal: (v: boolean) => void;
    setShowFillSlotModal: (v: boolean) => void;
    handleSlotClick: (space: any) => void;
    setSelectedDay: (d: Date | null) => void;
    totalSlots: number;
}

export function VagasAtivas({
    setShowConfigureSlotsModal,
    setShowFillSlotModal,
    handleSlotClick,
    setSelectedDay,
    totalSlots,
}: VagasAtivasProps) {
    const { user } = useAuth();
    const companyId = user?.companyId;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchParams] = useSearchParams();
    const searchParamValue = searchParams.get("search") || "";
    const [searchTerm, setSearchTerm] = useState(searchParamValue);

    useEffect(() => {
        if (searchParamValue) {
            setSearchTerm(searchParamValue);
        }
    }, [searchParamValue]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    // Fetch active spaces from Supabase over month block
    const { data: spaces, isLoading } = useQuery({
        queryKey: ['spaces', companyId, format(currentDate, 'yyyy-MM')],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('spaces')
                .select(`
          *,
          client:clients(id, name, phone, birth_date, email),
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
                .is('deleted_at', null)
                .or(`has_exited.eq.false,and(entry_date.gte.${format(monthStart, 'yyyy-MM-dd')},entry_date.lte.${format(monthEnd, 'yyyy-MM-dd')})`)
                .order('entry_date', { ascending: false });

            if (error) throw error;
            return data as unknown as SpaceData[];
        },
        enabled: !!companyId,
    });

    const occupiedCount = spaces?.filter(s => !s.has_exited).length || 0;
    const availableCount = totalSlots - occupiedCount;

    const filteredSpaces = spaces?.filter(s => !s.has_exited).filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            s.client?.name.toLowerCase().includes(term) ||
            (s.vehicle?.plate && s.vehicle.plate.toLowerCase().includes(term))
        );
    }) || [];

    const getSpacesForDay = (date: Date) => {
        const dayStr = format(date, 'yyyy-MM-dd');
        return spaces?.filter(s => s.entry_date === dayStr) || [];
    };

    return (
        <div className="space-y-6 mt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className="bg-card/50 border-border/50 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => setShowConfigureSlotsModal(true)}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Car className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    Total de Vagas
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 hover:bg-transparent">Configurar</Badge>
                                </p>
                                <p className="text-2xl font-bold">{totalSlots}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                availableCount < 0
                                    ? "bg-red-500/10"
                                    : availableCount === 0
                                        ? "bg-amber-500/10"
                                        : "bg-green-500/10"
                            )}>
                                {availableCount <= 0 ? (
                                    <AlertTriangle className={cn(
                                        "h-5 w-5",
                                        availableCount < 0 ? "text-red-500" : "text-amber-500"
                                    )} />
                                ) : (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Disponíveis</p>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    availableCount < 0
                                        ? "text-red-500"
                                        : availableCount === 0
                                            ? "text-amber-500"
                                            : "text-green-500"
                                )}>{availableCount}</p>
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

            {occupiedCount >= totalSlots && (
                <Alert
                    variant={occupiedCount > totalSlots ? "destructive" : "default"}
                    className={cn(
                        "transition-all duration-300 shadow-md border-2",
                        occupiedCount > totalSlots
                            ? "bg-red-500/10 border-red-500/30 text-red-200"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    )}
                >
                    <AlertTriangle className={cn(
                        "h-5 w-5 animate-pulse shrink-0",
                        occupiedCount > totalSlots ? "text-red-500" : "text-amber-500"
                    )} />
                    <AlertTitle className="font-bold text-base ml-2">
                        {occupiedCount > totalSlots ? "Limite de Vagas Excedido!" : "Limite de Vagas Atingido!"}
                    </AlertTitle>
                    <AlertDescription className="text-sm opacity-90 mt-1 ml-2">
                        O limite de vagas ({totalSlots}) do seu estabelecimento foi {occupiedCount > totalSlots ? "excedido" : "atingido"}. Para que uma nova vaga fique disponível, outra vaga deve encerrar o serviço.
                    </AlertDescription>
                </Alert>
            )}

            {/* Slots Grid */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg">Vagas Ocupadas</CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cliente ou placa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredSpaces.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredSpaces.map(space => (
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
                            <p>{searchTerm ? "Nenhuma vaga encontrada para sua busca" : "Nenhuma vaga ocupada no momento"}</p>
                            {!searchTerm && (
                                <Button
                                    variant="link"
                                    className="mt-2"
                                    onClick={() => setShowFillSlotModal(true)}
                                >
                                    Preencher primeira vaga
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg">Calendário de Ocupação</CardTitle>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium min-w-[120px] sm:min-w-[140px] text-center capitalize">
                                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <BrazilCalendarLegend />
                    </div>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="text-center text-[11px] sm:text-sm font-semibold text-muted-foreground py-1 sm:py-2 truncate">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-[72px] sm:h-auto sm:aspect-square" />
                        ))}
                        {days.map(day => {
                            const daySpaces = getSpacesForDay(day);
                            const inProgress = daySpaces.filter(s => !s.has_exited && s.payment_status !== 'paid').length;
                            const completed = daySpaces.filter(s => s.has_exited || s.payment_status === 'paid').length;
                            const calendarEvent = getPrimaryBrazilCalendarEvent(day);
                            const eventTitle = getBrazilCalendarTitle(day);

                            return (
                                <button
                                    key={format(day, 'yyyy-MM-dd')}
                                    onClick={() => setSelectedDay(day)}
                                    title={eventTitle}
                                    className={cn(
                                        "h-[72px] sm:h-auto sm:aspect-square sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all flex flex-col items-center cursor-pointer hover:bg-accent/80 hover:scale-[1.02] overflow-hidden relative shadow-sm",
                                        calendarEvent &&
                                        BRAZIL_CALENDAR_EVENT_STYLES[calendarEvent.kind].dayClass,
                                        isToday(day) && "border-primary ring-1 ring-primary/20",
                                        !isSameMonth(day, currentDate) && "opacity-40"
                                    )}
                                >
                                    <div className="flex w-full justify-between items-start mb-0.5 sm:mb-0 sm:absolute sm:top-1.5 sm:left-1.5 sm:right-1.5 pointer-events-none">
                                        {isToday(day) ? (
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

                                    <div className="flex flex-col items-center justify-center my-auto">
                                        <span className={cn(
                                            "text-xl sm:text-4xl font-extrabold tracking-tight leading-none",
                                            isToday(day) ? "text-primary" : "text-foreground"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        <span className="text-xs sm:text-sm font-bold text-muted-foreground/60 mt-0.5 sm:mt-1.5 leading-none">
                                            {inProgress}/{totalSlots}
                                        </span>
                                    </div>

                                    {(inProgress > 0 || completed > 0) ? (
                                        <>
                                            <div className="hidden sm:flex flex-col gap-1 items-center w-full mt-auto">
                                                {daySpaces.length > 0 && (
                                                    <Badge variant="default" className="text-xs px-1.5 py-0 bg-green-500 text-white hover:bg-green-600 truncate flex justify-center w-full font-bold shadow-sm">
                                                        {daySpaces.length} {daySpaces.length === 1 ? 'serviço' : 'serviços'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex sm:hidden flex-row items-center justify-center gap-1 mt-auto w-full pb-0.5">
                                                {daySpaces.length > 0 && (
                                                    <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] font-extrabold shadow-sm">
                                                        {daySpaces.length}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-4 sm:h-8 w-full pointer-events-none opacity-0 mt-auto" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-4 mt-4 text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500 shadow-sm" />
                            <span>Total de serviços</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
