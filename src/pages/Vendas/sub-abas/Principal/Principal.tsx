import { useState, useEffect } from "react";
import { isSameMonth } from "date-fns";
import { List, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import SalesKPIBar from "@/pages/Vendas/components/SalesKPIBar";
import NewSaleModal from "@/pages/Vendas/components/NewSaleModal";
import SalesDayDrawer from "@/pages/Vendas/components/SalesDayDrawer";
import SalesChartsModal from "@/pages/Vendas/components/SalesChartsModal";
import SaleDetailsModal from "@/pages/Vendas/components/SaleDetailsModal";

import { useAuth } from "@/contexts/AuthContext";
import { useSalesRecognition } from "@/hooks/useSalesRecognition";
import { useSalesData } from "./hooks/useSalesData";
import { useInstantSearch } from "./hooks/useInstantSearch";
import { PrincipalHeader } from "./components/PrincipalHeader";
import { SalesInstantSearch } from "./components/SalesInstantSearch";
import { SalesCalendarView } from "./components/SalesCalendarView";
import { SalesListView } from "./components/SalesListView";
import { SaleWithDetails } from "@/types/sales";

export function Principal() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
    const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isChartsModalOpen, setIsChartsModalOpen] = useState(false);
    const [initialSaleDate, setInitialSaleDate] = useState<Date | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedDetailedSale, setSelectedDetailedSale] = useState<SaleWithDetails | null>(null);

    const { user } = useAuth();
    const { sales, setSales, loading, fetchSales } = useSalesData(currentDate);
    const {
        valorTodas,
        valorFechadas,
        valorEmAberto,
        qtdFechadas,
        qtdEmAberto,
        refetch: refetchRecognition
    } = useSalesRecognition(user?.companyId, currentDate);

    const {
        showSearchResults,
        setShowSearchResults,
        isSearching,
        searchResults
    } = useInstantSearch(searchTerm);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleNewSaleSuccess = (newSale?: any) => {
        setIsNewSaleModalOpen(false);
        if (newSale && newSale.id) {
            const isCurrentMonth = isSameMonth(new Date(newSale.sale_date + 'T12:00:00'), currentDate);
            if (isCurrentMonth) {
                setSales(prev => {
                    if (prev.some(s => s.id === newSale.id)) return prev;
                    return [{
                        ...newSale,
                        client: undefined,
                        vehicle: undefined,
                        sale_items: [],
                    }, ...prev];
                });
            }
        }
        fetchSales(true);
        refetchRecognition();
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
            const matchVehicle = sale.vehicle?.plate?.toLowerCase().includes(term) ||
                sale.vehicle?.brand?.toLowerCase().includes(term) ||
                sale.vehicle?.model?.toLowerCase().includes(term);
            if (!matchClient && !matchId && !matchVehicle) pass = false;
        }
        return pass;
    });

    const totalMonthValue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

    return (
        <div className="space-y-6">
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

                        <SalesInstantSearch
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            showSearchResults={showSearchResults}
                            setShowSearchResults={setShowSearchResults}
                            isSearching={isSearching}
                            searchResults={searchResults}
                            onSaleSelect={(sale) => {
                                setSelectedDetailedSale(sale);
                            }}
                        />

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

                    <PrincipalHeader
                        currentDate={currentDate}
                        onChangeDate={setCurrentDate}
                        monthSalesCount={monthSales.length}
                        totalMonthValue={totalMonthValue}
                        onViewCharts={() => setIsChartsModalOpen(true)}
                    />
                </div>
            </div>

            <SalesKPIBar
                sales={monthSales}
                valorTodas={valorTodas}
                valorFechadas={valorFechadas}
                valorEmAberto={valorEmAberto}
                qtdFechadas={qtdFechadas}
                qtdEmAberto={qtdEmAberto}
            />

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
                    {viewMode === "calendar" && (
                        <SalesCalendarView
                            currentDate={currentDate}
                            monthSales={monthSales}
                            onDayClick={(day) => setSelectedDay(day)}
                        />
                    )}

                    {viewMode === "list" && (
                        <SalesListView
                            monthSales={monthSales}
                            onDayClick={(day) => setSelectedDay(day)}
                        />
                    )}
                </>
            )}

            <NewSaleModal
                open={isNewSaleModalOpen}
                onOpenChange={(open) => {
                    setIsNewSaleModalOpen(open);
                    if (!open) {
                        setInitialSaleDate(undefined);
                    }
                }}
                initialDate={initialSaleDate}
                onSuccess={handleNewSaleSuccess}
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
                        fetchSales();
                    }
                }}
                sale={selectedDetailedSale}
            />
        </div>
    );
}
