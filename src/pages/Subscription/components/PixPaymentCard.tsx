import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Check, Copy, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SystemConfig } from '../types';

interface PixPaymentCardProps {
    config: SystemConfig | null;
    finalPrice: number;
    isUpgrade: boolean;
    onOpenConfirmModal: () => void;
}

export function PixPaymentCard({
    config,
    finalPrice,
    isUpgrade,
    onOpenConfirmModal,
}: PixPaymentCardProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const copyPixKey = async () => {
        if (!config) return;
        try {
            await navigator.clipboard.writeText(config.pix_key);
            setCopied(true);
            toast({ title: 'Chave PIX copiada!' });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ title: 'Erro ao copiar', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Pagamento via PIX
                </CardTitle>
                <CardDescription>Copie a chave PIX abaixo e faça a transferência</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* PIX Key */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Chave PIX (Email)</label>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                            {config?.pix_key || 'Carregando...'}
                        </div>
                        <Button variant="outline" size="icon" onClick={copyPixKey}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-2 text-sm p-4 bg-muted/30 rounded-lg">
                    <p><span className="text-muted-foreground">Beneficiário:</span> {config?.beneficiary_name || ''}</p>
                    <p><span className="text-muted-foreground">Banco:</span> {config?.bank_name || ''}</p>
                </div>

                {/* Value to pay */}
                <div className="text-center py-3 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor a pagar</p>
                    <p className="text-2xl font-bold text-primary">
                        R$ {finalPrice.toFixed(2).replace('.', ',')}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={onOpenConfirmModal}
                        disabled={finalPrice === 0 && isUpgrade}
                    >
                        {finalPrice === 0 ? 'Concluir' : 'Já fiz o pagamento'}
                    </Button>
                    <a
                        href="https://wa.me/5517992573141?text=Preciso%20de%20ajuda%20com%20o%20pagamento%20do%20WFE%20Evolution%20CRM"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Preciso de ajuda
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}
