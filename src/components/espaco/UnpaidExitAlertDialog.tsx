import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, LogOut, X, Loader2 } from "lucide-react";

interface SpaceDetails {
  id: number;
  name: string;
  client?: {
    id: number;
    name: string;
  } | null;
  sale?: {
    id: number;
    total: number;
  } | null;
}

interface UnpaidExitAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: SpaceDetails;
  onReleaseWithPayment: () => void;
  onReleaseWithoutPayment: () => void;
  isLoading?: boolean;
}

export function UnpaidExitAlertDialog({
  open,
  onOpenChange,
  space,
  onReleaseWithPayment,
  onReleaseWithoutPayment,
  isLoading = false,
}: UnpaidExitAlertDialogProps) {
  const pendingAmount = space.sale?.total || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Atenção: Veículo Não Pago!
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p>
              O veículo de <strong>{space.client?.name || "Cliente"}</strong> será
              liberado sem pagamento confirmado.
            </p>
            
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-lg font-bold text-warning text-center">
                Valor pendente: R$ {pendingAmount.toFixed(2)}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              O que deseja fazer?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-success hover:bg-success/90 text-success-foreground"
            onClick={onReleaseWithPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirmar Pagamento e Liberar
          </Button>
          
          <Button
            variant="outline"
            className="w-full border-warning/50 text-warning hover:bg-warning/10"
            onClick={onReleaseWithoutPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Liberar Sem Pagamento
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
