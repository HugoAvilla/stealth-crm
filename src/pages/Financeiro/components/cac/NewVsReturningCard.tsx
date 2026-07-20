import { Card } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

interface NewVsReturningCardProps {
    newClientSales: number;
    returningClientSales: number;
    newClientRevenue: number;
    returningClientRevenue: number;
}

export function NewVsReturningCard({
    newClientSales,
    returningClientSales,
    newClientRevenue,
    returningClientRevenue
}: NewVsReturningCardProps) {
    const totalSales = newClientSales + returningClientSales;

    return (
        <Card className="lg:col-span-2 p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <UserPlus className="w-20 h-20" />
            </div>
            <div>
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Novos vs Retorno
                </h3>
                {totalSales === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados de classificação de clientes no período.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-green-500" />
                                <span className="text-sm font-medium text-muted-foreground">Novos</span>
                            </div>
                            <p className="text-2xl font-bold">{newClientSales}</p>
                            <p className="text-xs text-muted-foreground">
                                {((newClientSales / totalSales) * 100).toFixed(0)}% das vendas
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-blue-500" />
                                <span className="text-sm font-medium text-muted-foreground">Retorno</span>
                            </div>
                            <p className="text-2xl font-bold">{returningClientSales}</p>
                            <p className="text-xs text-muted-foreground">
                                {((returningClientSales / totalSales) * 100).toFixed(0)}% das vendas
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Ticket Médio <span className="text-green-500">Novo</span></p>
                            <p className="text-2xl font-bold text-green-500">
                                {newClientSales > 0
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newClientRevenue / newClientSales)
                                    : 'N/A'
                                }
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Ticket Médio <span className="text-blue-500">Retorno</span></p>
                            <p className="text-2xl font-bold text-blue-500">
                                {returningClientSales > 0
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(returningClientRevenue / returningClientSales)
                                    : 'N/A'
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {totalSales > 0 && (
                <div className="mt-4">
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                        <div
                            className="bg-green-500 transition-all duration-500"
                            style={{ width: `${(newClientSales / totalSales) * 100}%` }}
                        />
                        <div
                            className="bg-blue-500 transition-all duration-500"
                            style={{ width: `${(returningClientSales / totalSales) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-green-500 font-medium">Novos</span>
                        <span className="text-[10px] text-blue-500 font-medium">Retorno</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
