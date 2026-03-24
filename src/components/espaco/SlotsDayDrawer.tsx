import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, User, Clock, CheckCircle, AlertCircle, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SlotsDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  onAddSlot?: () => void;
}

interface DaySpace {
  id: number;
  name: string;
  entry_time: string | null;
  exit_time: string | null;
  has_exited: boolean | null;
  payment_status: string | null;
  client?: {
    id: number;
    name: string;
    phone: string;
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
  } | null;
}

export function SlotsDayDrawer({ open, onOpenChange, date, onAddSlot }: SlotsDayDrawerProps) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const dayStr = date ? format(date, 'yyyy-MM-dd') : null;

  const { data: spaces, isLoading } = useQuery({
    queryKey: ['spaces-day', dayStr, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          id,
          name,
          entry_time,
          exit_time,
          has_exited,
          payment_status,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, plate, year),
          sale:sales(id, total)
        `)
        .eq('company_id', companyId)
        .eq('entry_date', dayStr)
        .order('entry_time', { ascending: true });

      if (error) throw error;
      return data as unknown as DaySpace[];
    },
    enabled: !!companyId && !!dayStr && open,
  });

  if (!date) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>
              {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </SheetTitle>
            {onAddSlot && (
              <Button size="sm" onClick={onAddSlot}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Vaga
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : spaces && spaces.length > 0 ? (
            spaces.map(space => {
              const isPaid = space.payment_status === 'paid';
              const isCompleted = space.has_exited;

              return (
                <Card key={space.id} className="bg-card/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{space.name}</span>
                      <Badge 
                        variant="outline"
                        className={
                          isCompleted 
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        {isCompleted ? 'Finalizado' : 'Em andamento'}
                      </Badge>
                    </div>

                    {/* Client */}
                    {space.client && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{space.client.name}</span>
                      </div>
                    )}

                    {/* Vehicle */}
                    {space.vehicle && (
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{space.vehicle.brand} {space.vehicle.model}</span>
                        {space.vehicle.plate && (
                          <span className="text-muted-foreground">- {space.vehicle.plate}</span>
                        )}
                      </div>
                    )}

                    {/* Times */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {space.entry_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Entrada: {space.entry_time}
                        </span>
                      )}
                      {space.exit_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Saída: {space.exit_time}
                        </span>
                      )}
                    </div>

                    {/* Payment Status */}
                    <Badge 
                      variant="outline" 
                      className={
                        isPaid 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {isPaid ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Pago</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" />Não pago</>
                      )}
                    </Badge>

                    {/* Total */}
                    {space.sale && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground text-sm">Total:</span>
                        <span className="font-bold text-primary">
                          R$ {space.sale.total.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mb-4 opacity-50" />
              <p className="mb-4">Nenhuma vaga registrada neste dia.</p>
              {onAddSlot && (
                <Button onClick={onAddSlot} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Vaga
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
