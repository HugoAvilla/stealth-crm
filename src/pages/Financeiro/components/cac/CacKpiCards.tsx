import { Card } from "@/components/ui/card";
import { DollarSign, Users, Target, TrendingUp, PieChart } from "lucide-react";

interface CacKpiCardsProps {
    totalCac: number;
    marketingCost: number;
    salesCost: number;
    newPayingClients: number;
    avgCac: number;
    cohortRevenue: number;
    globalRoas: number;
    targetRoas: number;
    roasProgress: number;
    onTargetRoasChange: (val: string) => void;
}

export function CacKpiCards({
    totalCac,
    marketingCost,
    salesCost,
    newPayingClients,
    avgCac,
    cohortRevenue,
    globalRoas,
    targetRoas,
    roasProgress,
    onTargetRoasChange
}: CacKpiCardsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <DollarSign className="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Investimento (CAC)</p>
                <h3 className="text-lg sm:text-3xl font-bold text-red-500" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCac)}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCac)}
                </h3>
                <div className="flex flex-col sm:flex-row text-[10px] text-muted-foreground gap-0.5 sm:gap-2 mt-1">
                    <span className="text-orange-500/80 truncate">Mkt: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marketingCost)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-blue-500/80 truncate">Vendas: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesCost)}</span>
                </div>
            </Card>

            <Card className="p-3 sm:p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Novos Clientes <span className="hidden sm:inline">(Pagantes)</span></p>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {newPayingClients}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    Clientes que geraram vendas
                </p>
            </Card>

            <Card className="p-3 sm:p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Target className="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">CAC Médio Global</p>
                <h3 className="text-lg sm:text-3xl font-bold text-info" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgCac)}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgCac)}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    Custo médio por aquisição
                </p>
            </Card>

            <Card className="p-3 sm:p-5 flex flex-col justify-center space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Receita da Coorte</p>
                <h3 className="text-lg sm:text-3xl font-bold text-green-500" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cohortRevenue)}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cohortRevenue)}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    LTV Inicial gerado
                </p>
            </Card>

            <Card className="p-3 sm:p-5 flex flex-col justify-between space-y-2 relative overflow-hidden group min-h-[120px] sm:min-h-[140px]">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <PieChart className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                </div>
                <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">ROAS Global</p>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mt-1">
                        <h3 className={`text-lg sm:text-3xl font-bold ${globalRoas === 0 ? 'text-primary' : (globalRoas >= targetRoas ? 'text-green-500' : 'text-red-500')}`}>
                            {globalRoas === 0 ? '0.00x' : `${globalRoas.toFixed(2)}x`}
                        </h3>
                        {targetRoas > 0 && globalRoas > 0 && (
                            <span className="text-[10px] text-muted-foreground font-medium truncate">
                                ({roasProgress.toFixed(0)}% da meta)
                            </span>
                        )}
                    </div>
                    {targetRoas > 0 && (
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                                className={`h-full transition-all duration-500 ${globalRoas >= targetRoas ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${roasProgress}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/10">
                    <span className={`text-[10px] ${globalRoas === 0 ? 'text-muted-foreground' : (globalRoas >= targetRoas ? 'text-green-500/80 font-medium' : 'text-red-400/80 font-medium')}`}>
                        {globalRoas === 0 ? 'Sem retorno' : (globalRoas >= targetRoas ? 'Meta atingida 🎉' : 'Abaixo da meta ⚠️')}
                    </span>
                    <div className="flex items-center gap-1 bg-muted/40 rounded px-1.5 py-0.5 border border-border/50">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase">Meta:</span>
                        <input
                            type="number"
                            step="0.5"
                            value={targetRoas || ''}
                            onChange={(e) => onTargetRoasChange(e.target.value)}
                            className="w-8 h-4 bg-transparent text-foreground text-center rounded text-[10px] focus:outline-none border-none p-0 font-bold"
                        />
                        <span className="text-[9px] text-muted-foreground font-medium">x</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
