import { useState, useEffect } from "react";
import { Car, Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpaceData {
  id: number;
  name: string;
  client_id: number | null;
  vehicle_id: number | null;
  sale_id: number | null;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  has_exited: boolean | null;
  payment_status: string | null;
  observations: string | null;
  tag: string | null;
  discount: number | null;
  status: string | null;
  client?: {
    id: number;
    name: string;
    phone: string;
    birth_date: string | null;
  } | null;
  vehicle?: {
    id: number;
    brand: string;
    model: string;
    plate: string | null;
    year: number | null;
  } | null;
  sale?: {
    id: number;
    total: number;
    subtotal: number;
    discount: number | null;
  } | null;
}

interface SlotCardProps {
  space: SpaceData;
  onClick: () => void;
}

export function SlotCard({ space, onClick }: SlotCardProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  // Timer effect
  useEffect(() => {
    if (!space.entry_date || !space.entry_time || space.has_exited) return;

    const updateTimer = () => {
      const entryDateTime = new Date(`${space.entry_date}T${space.entry_time}`);
      const now = Date.now();
      const diff = now - entryDateTime.getTime();

      if (diff < 0) {
        setElapsedTime("00:00:00");
        return;
      }

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
  }, [space.entry_date, space.entry_time, space.has_exited]);

  const isPaid = space.payment_status === 'paid';
  const isCompleted = space.has_exited;

  return (
    <Card 
      className={cn(
        "border cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isCompleted ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{space.name}</span>
          {space.tag && (
            <Badge variant="outline" className="text-xs">
              {space.tag}
            </Badge>
          )}
        </div>

        {/* Vehicle info */}
        {space.vehicle && (
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{space.vehicle.brand} {space.vehicle.model}</p>
              {space.vehicle.plate && (
                <p className="text-muted-foreground text-xs">{space.vehicle.plate}</p>
              )}
            </div>
          </div>
        )}

        {/* Client */}
        {space.client && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{space.client.name}</span>
          </div>
        )}

        {/* Payment Status */}
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isPaid 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-red-500/20 text-red-400 border-red-500/30"
          )}
        >
          {isPaid ? (
            <><CheckCircle className="h-3 w-3 mr-1" />Pago</>
          ) : (
            <><AlertCircle className="h-3 w-3 mr-1" />Não pago</>
          )}
        </Badge>

        {/* Timer */}
        {!isCompleted && (
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{elapsedTime}</span>
          </div>
        )}

        {/* Total */}
        {space.sale && (
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="font-bold text-primary">
              R$ {space.sale.total.toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
