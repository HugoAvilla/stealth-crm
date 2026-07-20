import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaleWithDetails } from "@/types/sales";

interface SalesListViewProps {
    monthSales: SaleWithDetails[];
    onDayClick: (day: Date) => void;
}

export function SalesListView({ monthSales, onDayClick }: SalesListViewProps) {
    return (
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
                            onClick={() => onDayClick(new Date(sale.sale_date + 'T12:00:00'))}
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
    );
}
