import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

interface PlanDetailsCardProps {
    isUpgrade: boolean;
    planNameFormatted: string;
    periodFormatted: string;
    displayPeriod: string;
    finalPrice: number;
    planPrice: number;
}

export function PlanDetailsCard({
    isUpgrade,
    planNameFormatted,
    periodFormatted,
    displayPeriod,
    finalPrice,
    planPrice,
}: PlanDetailsCardProps) {
    const navigate = useNavigate();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Plano {planNameFormatted} ({periodFormatted})
                </CardTitle>
                <CardDescription>Resumo do pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Price Display */}
                <div className="text-center py-4 bg-primary/10 rounded-lg space-y-1">
                    <span className="text-4xl font-bold text-primary">
                        R$ {finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-muted-foreground">/{displayPeriod === 'annual' ? 'ano' : 'mês'}</span>
                </div>

                {isUpgrade && (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30 text-sm">
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Valor do plano {planNameFormatted}:</span>
                            <span className="font-medium">R$ {planPrice.toFixed(2).replace('.', ',')}</span>
                        </p>
                        <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                            <p>• O pagamento realizado hoje cobre o <strong>próximo ciclo</strong> de cobrança.</p>
                            <p>• Seu plano atual continua ativo até o fim do ciclo vigente.</p>
                            <p>• Os novos recursos são liberados imediatamente após a aprovação.</p>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => navigate(isUpgrade ? '/planos?mode=upgrade' : '/planos')}>
                        Trocar Plano
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
