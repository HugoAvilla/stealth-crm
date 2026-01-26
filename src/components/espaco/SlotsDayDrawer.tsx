import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { sales, getClientById, getVehicleById, getServiceById } from "@/lib/mockData";

interface SlotsDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
}

export function SlotsDayDrawer({ open, onOpenChange, date }: SlotsDayDrawerProps) {
  if (!date) return null;

  const dayStr = format(date, 'yyyy-MM-dd');
  const daySales = sales.filter(s => s.date === dayStr);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {daySales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum serviço registrado neste dia.
            </p>
          ) : (
            daySales.map(sale => {
              const client = getClientById(sale.client_id);
              const vehicle = getVehicleById(sale.vehicle_id);
              const serviceNames = sale.services.map(id => getServiceById(id)?.name).filter(Boolean);

              return (
                <Card key={sale.id} className="bg-card/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Venda #{sale.id}</span>
                      <Badge variant={sale.status === 'Fechada' ? 'default' : 'secondary'}>
                        {sale.status}
                      </Badge>
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span>{client?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Veículo:</span>
                        <span>{vehicle?.model} - {vehicle?.plate}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {serviceNames.map((name, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Total:</span>
                      <span className="font-bold text-primary">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
