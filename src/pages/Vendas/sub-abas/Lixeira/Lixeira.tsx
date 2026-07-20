import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SaleWithDetails } from "@/types/sales";
import SaleDetailsModal from "@/pages/Vendas/components/SaleDetailsModal";

export function Lixeira() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [deletedSales, setDeletedSales] = useState<SaleWithDetails[]>([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [selectedDetailedSale, setSelectedDetailedSale] = useState<SaleWithDetails | null>(null);

    useEffect(() => {
        fetchDeletedSales();
    }, [user?.id]);

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

    const filteredDeleted = deletedSales.filter((sale) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const matchClient = sale.client?.name?.toLowerCase().includes(term);
        const matchId = sale.id.toString() === term;
        const matchVehicle = sale.vehicle?.plate?.toLowerCase().includes(term) ||
            sale.vehicle?.model?.toLowerCase().includes(term);
        return matchClient || matchId || matchVehicle;
    });

    return (
        <div className="space-y-6">
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
            ) : filteredDeleted.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border-dashed">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <Trash2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">Lixeira vazia</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Nenhuma venda excluída logicamente foi encontrada para os termos buscados.
                    </p>
                </Card>
            ) : (
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
            )}

            <SaleDetailsModal
                open={!!selectedDetailedSale}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedDetailedSale(null);
                        fetchDeletedSales();
                    }
                }}
                sale={selectedDetailedSale}
            />
        </div>
    );
}
