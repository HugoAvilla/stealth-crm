import { useState, useEffect } from "react";
import { Car, Clock, Pause, AlertCircle, CheckCircle, Wrench, Play, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sales, getClientById, getVehicleById, getServiceById, type Slot } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface SlotCardProps {
  slot: Slot;
  onFill: () => void;
  onStatusChange: (slotId: number, status: Slot['work_status']) => void;
  onRelease: (slotId: number) => void;
}

export function SlotCard({ slot, onFill, onStatusChange, onRelease }: SlotCardProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  const sale = slot.sale_id ? sales.find(s => s.id === slot.sale_id) : null;
  const client = sale ? getClientById(sale.client_id) : null;
  const vehicle = sale ? getVehicleById(sale.vehicle_id) : null;
  const serviceNames = sale?.services.map(id => getServiceById(id)?.name).filter(Boolean).join(", ");

  useEffect(() => {
    if (!slot.started_at || slot.work_status === 'finalizado') return;

    const updateTimer = () => {
      const start = new Date(slot.started_at!).getTime();
      const now = Date.now();
      const diff = now - start;

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [slot.started_at, slot.work_status]);

  const getStatusConfig = () => {
    switch (slot.status) {
      case 'disponivel':
        return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' };
      case 'ocupada':
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' };
      case 'manutencao':
        return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' };
      default:
        return { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground' };
    }
  };

  const getWorkStatusBadge = () => {
    switch (slot.work_status) {
      case 'em_andamento':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Em andamento</Badge>;
      case 'pausado':
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs"><Pause className="h-3 w-3 mr-1" />Pausado</Badge>;
      case 'em_espera':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Em espera</Badge>;
      case 'finalizado':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Finalizado</Badge>;
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (slot.status === 'disponivel') {
    return (
      <Card className={cn("border-2 border-dashed", config.border, config.bg)}>
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px] gap-3">
          <Car className={cn("h-8 w-8", config.text)} />
          <span className="font-medium">{slot.name}</span>
          <Button size="sm" variant="outline" onClick={onFill} className="w-full">
            Preencher
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (slot.status === 'manutencao') {
    return (
      <Card className={cn("border", config.border, config.bg)}>
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px] gap-3">
          <Wrench className={cn("h-8 w-8", config.text)} />
          <span className="font-medium">{slot.name}</span>
          <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            Manutenção
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border", config.border, config.bg)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{slot.name}</span>
          {getWorkStatusBadge()}
        </div>

        {vehicle && (
          <div className="text-sm">
            <p className="font-medium">{vehicle.model}</p>
            <p className="text-muted-foreground">{vehicle.plate}</p>
          </div>
        )}

        {client && (
          <p className="text-xs text-muted-foreground truncate">{client.name}</p>
        )}

        {slot.work_status !== 'finalizado' && (
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{elapsedTime}</span>
          </div>
        )}

        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 text-xs">
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onStatusChange(slot.id, 'em_andamento')}>
                <Play className="h-4 w-4 mr-2 text-yellow-400" /> Em andamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(slot.id, 'pausado')}>
                <Pause className="h-4 w-4 mr-2 text-orange-400" /> Pausado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(slot.id, 'em_espera')}>
                <AlertCircle className="h-4 w-4 mr-2 text-blue-400" /> Em espera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(slot.id, 'finalizado')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" /> Finalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {slot.work_status === 'finalizado' && (
            <Button size="sm" variant="destructive" className="text-xs" onClick={() => onRelease(slot.id)}>
              Liberar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
