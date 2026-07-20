import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PrincipalHeaderProps {
    currentDate: Date;
    onChangeDate: (date: Date) => void;
    monthSalesCount: number;
    totalMonthValue: number;
    onViewCharts: () => void;
}

export function PrincipalHeader({
    currentDate,
    onChangeDate,
    monthSalesCount,
    totalMonthValue,
    onViewCharts
}: PrincipalHeaderProps) {
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChangeDate(prevMonth)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-base sm:text-lg font-medium min-w-[140px] sm:min-w-[180px] text-center capitalize">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChangeDate(nextMonth)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center w-full justify-between sm:w-auto gap-2 sm:gap-4">
                <Badge variant="outline" className="text-sm py-1.5 px-3 whitespace-nowrap flex-1 justify-center sm:flex-none">
                    {monthSalesCount} vendas | R$ {totalMonthValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Badge>

                <Button variant="outline" onClick={onViewCharts} className="gap-2 flex-1 sm:flex-none">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver gráficos</span>
                    <span className="sm:hidden">Gráficos</span>
                </Button>
            </div>
        </div>
    );
}
