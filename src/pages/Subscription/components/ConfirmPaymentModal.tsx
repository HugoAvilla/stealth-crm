import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmPaymentModalProps {
    finalPrice: number;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}

export function ConfirmPaymentModal({
    finalPrice,
    isOpen,
    onOpenChange,
    onConfirm,
    isSubmitting,
}: ConfirmPaymentModalProps) {
    const [confirmed, setConfirmed] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Confirmar Pagamento</DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-1">
                        Você realmente efetuou o pagamento de R$ {finalPrice.toFixed(2).replace('.', ',')} via PIX?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Highly Visible Warning Box */}
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 space-y-2">
                        <p className="text-sm font-semibold leading-relaxed">
                            Atenção: A liberação é 100% manual.
                        </p>
                        <p className="text-xs leading-relaxed opacity-90">
                            Para sua assinatura ser liberada, envie o comprovante de pagamento pelo WhatsApp. A liberação é feita manualmente pela equipe Master após a conferência.
                        </p>
                    </div>

                    <div className="flex items-start space-x-3 pt-2">
                        <Checkbox
                            id="confirm"
                            checked={confirmed}
                            onCheckedChange={(checked) => setConfirmed(checked === true)}
                            className="mt-1 border-muted-foreground/30 data-[state=checked]:bg-[#D8E600] data-[state=checked]:text-black data-[state=checked]:border-[#D8E600]"
                        />
                        <label
                            htmlFor="confirm"
                            className="text-sm font-medium leading-relaxed cursor-pointer select-none text-foreground"
                        >
                            Confirmo que realizei o pagamento e estou ciente de que a liberação é feita manualmente após o envio do comprovante.
                        </label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-input hover:bg-muted">
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={!confirmed || isSubmitting}
                        className="bg-[#D8E600] hover:bg-[#b8c400] text-black font-semibold shadow-[0_0_15px_rgba(216,230,0,0.15)] disabled:opacity-50 transition-all duration-200"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Enviar comprovante'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
