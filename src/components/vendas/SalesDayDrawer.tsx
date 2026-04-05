import { useState, useEffect } from "react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  DollarSign,
  Plus,
} from "lucide-react";
import { SaleWithDetails } from "@/types/sales";
import SalesKPIBar from "@/components/vendas/SalesKPIBar";
import SaleDetailsModal from "@/components/vendas/SaleDetailsModal";
import SalesChartsModal from "@/components/vendas/SalesChartsModal";

interface SalesDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  allSales: SaleWithDetails[];
  onNewSale?: (date: Date) => void;
}

const SalesDayDrawer = ({ open, onOpenChange, selectedDate, allSales, onNewSale }: SalesDayDrawerProps) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [isChartsModalOpen, setIsChartsModalOpen] = useState(false);

  // Update current date when selectedDate changes
  useEffect(() => {
    if (selectedDate && !isSameDay(currentDate, selectedDate)) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  // Filter sales for the current day
  const daySales = allSales.filter((sale) =>
    isSameDay(new Date(sale.sale_date + 'T12:00:00'), currentDate)
  );

  const filteredSales = daySales.filter((sale) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      sale.id.toString().includes(searchLower) ||
      sale.client?.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-4">
            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(subDays(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <SheetTitle className="text-center">
                {format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(addDays(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Search and Charts */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por venda..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {onNewSale && (
                <Button 
                  className="gap-2 shrink-0 px-3"
                  onClick={() => onNewSale(currentDate)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova venda</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                className="gap-2 shrink-0 px-3"
                onClick={() => setIsChartsModalOpen(true)}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Ver gráficos</span>
                <span className="sm:hidden">Gráficos</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* KPIs */}
            <SalesKPIBar sales={daySales} className="grid grid-cols-2 sm:grid-cols-3 gap-3" />

            {/* Sales List */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                {filteredSales.length} venda{filteredSales.length !== 1 ? "s" : ""} no dia
              </h3>

              {filteredSales.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </Card>
              ) : (
                filteredSales.map((sale) => {
                  return (
                    <Card
                      key={sale.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">Venda #{sale.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {sale.client?.name || "Cliente"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">
                            R$ {sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <Badge
                            variant={!sale.is_open ? "default" : "outline"}
                            className="mt-1"
                          >
                            {sale.is_open ? 'Aberta' : 'Fechada'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SaleDetailsModal
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
        sale={selectedSale}
      />

      <SalesChartsModal
        open={isChartsModalOpen}
        onOpenChange={setIsChartsModalOpen}
        sales={daySales}
      />
    </>
  );
};

export default SalesDayDrawer;
