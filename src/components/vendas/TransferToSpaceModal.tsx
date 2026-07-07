// @ts-nocheck
import { useState, useEffect } from "react";
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
import { ArrowRightLeft, Car, User, DollarSign, Loader2, Wrench } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SaleData {
  id: number;
  total: number;
  client_id: number;
  vehicle_id?: number;
}

interface TransferToSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleData | null;
  onTransferComplete?: () => void;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
}

interface Client {
  id: number;
  name: string;
}

const TransferToSpaceModal = ({
  open,
  onOpenChange,
  sale,
  onTransferComplete,
}: TransferToSpaceModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryTime, setEntryTime] = useState(format(new Date(), "HH:mm"));
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("pending");
  const [observations, setObservations] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);

  useEffect(() => {
    if (sale?.client_id && open) {
      fetchClientAndVehicles();
    }
  }, [sale?.client_id, open]);

  const fetchClientAndVehicles = async () => {
    if (!sale?.client_id) return;

    const [clientRes, vehiclesRes, detailedItemsRes, saleItemsRes] = await Promise.all([
      supabase.from("clients").select("id, name").eq("id", sale.client_id).single(),
      supabase.from("vehicles").select("id, brand, model, plate").eq("client_id", sale.client_id),
      supabase.from("service_items_detailed").select("*, product_type:product_types(id, name, brand, light_transmission, category), region:vehicle_regions(id, name, region_code)").eq("sale_id", sale.id),
      supabase.from("sale_items").select("*, service:services(name)").eq("sale_id", sale.id)
    ]);

    if (clientRes.data) setClient(clientRes.data);
    
    if (vehiclesRes.data && vehiclesRes.data.length > 0) {
      setVehicles(vehiclesRes.data);
      if (sale.vehicle_id) {
        setVehicleId(sale.vehicle_id.toString());
      } else {
        setVehicleId(vehiclesRes.data[0].id.toString());
      }
    }

    // Build structured services_data from the sale's service items
    const builtServicesData: any[] = [];
    if (detailedItemsRes.data && detailedItemsRes.data.length > 0) {
      for (const item of detailedItemsRes.data) {
        const productName = item.product_type
          ? `${item.product_type.brand || ''} ${item.product_type.name || ''}`.trim()
          : '';
        builtServicesData.push({
          category: item.category || 'INSULFILM',
          regionId: item.region?.id || item.region_id || null,
          regionName: item.region?.name || item.display_name || 'Serviço',
          productTypeId: item.product_type?.id || item.product_type_id || null,
          productTypeName: productName,
          totalPrice: item.total_price || 0,
          metersUsed: item.meters_used || 0,
          serviceName: item.service_name || item.region?.name || 'Serviço',
          regionCode: item.region?.region_code || null,
          displayName: item.display_name || `${item.region?.name || 'Serviço'} • ${productName}`,
          isCustomized: false,
        });
      }
    } else if (saleItemsRes.data && saleItemsRes.data.length > 0) {
      for (const item of saleItemsRes.data) {
        builtServicesData.push({
          category: 'INSULFILM',
          regionId: null,
          regionName: item.service?.name || `Serviço #${item.service_id}`,
          productTypeId: null,
          productTypeName: '',
          totalPrice: item.total_price || 0,
          metersUsed: 0,
          serviceName: item.service?.name || `Serviço #${item.service_id}`,
          regionCode: null,
          displayName: item.service?.name || `Serviço #${item.service_id}`,
          isCustomized: false,
        });
      }
    }

    setServicesData(builtServicesData);
  };

  if (!sale) return null;

  const selectedVehicle = vehicles.find(v => v.id === Number(vehicleId));

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId) {
      toast({
        title: "Selecione um veículo",
        variant: "destructive",
      });
      return;
    }

    if (!user?.companyId) {
      toast({
        title: "Erro: empresa não encontrada",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Insert the space
      const { data: spaceData, error } = await supabase.from("spaces").insert({
        company_id: user.companyId,
        name: `Vaga - ${client?.name || 'Cliente'}`,
        client_id: sale.client_id,
        vehicle_id: Number(vehicleId),
        sale_id: sale.id,
        status: "ocupado",
        tag: "Em andamento",
        entry_date: entryDate,
        entry_time: entryTime,
        exit_date: exitDate || null,
        exit_time: exitTime || null,
        payment_status: paymentStatus,
        has_exited: !!exitDate,
        observations: observations || null,
      }).select().single();

      if (error) throw error;

      // Save services as services_data JSONB
      if (servicesData.length > 0 && spaceData) {
        await supabase
          .from("spaces")
          .update({ services_data: servicesData } as any)
          .eq("id", spaceData.id);
      }

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
    setServicesData([]);
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
            <span className="text-sm">{client?.name || 'Carregando...'}</span>
          </div>
          {selectedVehicle && (
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {selectedVehicle.brand} {selectedVehicle.model} - {selectedVehicle.plate}
              </span>
            </div>
          )}
        </div>

        {/* Card visual dos serviços da venda */}
        {servicesData.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/50">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Serviços da Venda ({servicesData.length})
              </span>
            </div>
            <div className="p-3 space-y-2">
              {servicesData.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate mr-2">
                    {service.displayName || service.regionName || 'Serviço'}
                  </span>
                  <span className="font-medium text-foreground whitespace-nowrap">
                    R$ {(service.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total em serviços</span>
                <span className="text-success">
                  R$ {servicesData.reduce((sum: number, s: any) => sum + (s.totalPrice || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleTransfer} className="space-y-4">
          {/* Seleção de Veículo */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo *</Label>
            {vehicles.length > 0 ? (
              <Select key={vehicleId} value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.brand} {v.model} - {v.plate || 'Sem placa'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm p-2 border rounded text-muted-foreground flex items-center justify-between">
                <span>Nenhum veículo disponível</span>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            )}
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
