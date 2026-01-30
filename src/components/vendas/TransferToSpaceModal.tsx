import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Car, User, DollarSign, Loader2 } from "lucide-react";
import { Sale, getClientById, getVehicleById } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface TransferToSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onTransferComplete?: () => void;
}

const TransferToSpaceModal = ({
  open,
  onOpenChange,
  sale,
  onTransferComplete,
}: TransferToSpaceModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryTime, setEntryTime] = useState(format(new Date(), "HH:mm"));
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("pending");
  const [observations, setObservations] = useState("");

  if (!sale) return null;

  const client = getClientById(sale.client_id);
  const saleVehicle = getVehicleById(sale.vehicle_id);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId) {
      toast({
        title: "Selecione um veículo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simular transferência (em produção, fazer insert no Supabase)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Venda transferida para Espaço!",
        description: `Vaga criada para ${client?.name}`,
      });

      onOpenChange(false);
      onTransferComplete?.();
      resetForm();
    } catch (error) {
      console.error("Erro ao transferir:", error);
      toast({
        title: "Erro ao transferir venda",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setVehicleId("");
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setEntryTime(format(new Date(), "HH:mm"));
    setExitDate("");
    setExitTime("");
    setPaymentStatus("pending");
    setObservations("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/20">
              <ArrowRightLeft className="h-5 w-5 text-info" />
            </div>
            <div>
              <DialogTitle>Transferir para Espaço</DialogTitle>
              <DialogDescription>
                Vincular esta venda a uma ocupação de vaga
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo da Venda */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Venda #{sale.id}</span>
            <span className="text-sm text-success ml-auto">
              R$ {sale.total.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{client?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {saleVehicle?.brand} {saleVehicle?.model} - {saleVehicle?.plate}
            </span>
          </div>
        </div>

        <form onSubmit={handleTransfer} className="space-y-4">
          {/* Seleção de Veículo */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {client?.vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.brand} {v.model} - {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Hora de Entrada */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Data Entrada *</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryTime">Hora Entrada *</Label>
              <Input
                id="entryTime"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Data e Hora de Saída (Opcional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exitDate">Data Saída (opcional)</Label>
              <Input
                id="exitDate"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitTime">Hora Saída (opcional)</Label>
              <Input
                id="exitTime"
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Status do Pagamento */}
          <div className="space-y-2">
            <Label>Status do Pagamento *</Label>
            <RadioGroup
              value={paymentStatus}
              onValueChange={(value) => setPaymentStatus(value as "paid" | "pending")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid" className="text-sm cursor-pointer">
                  Já pago
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending" className="text-sm cursor-pointer">
                  Ainda não pago
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações (opcional)</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informações adicionais sobre a vaga..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Confirmar Transferência
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferToSpaceModal;
