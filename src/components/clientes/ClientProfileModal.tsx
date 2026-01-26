import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Plus,
  ShoppingBag,
  Car,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Client, Vehicle, sales, services, getServiceById } from "@/lib/mockData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onEdit: () => void;
}

export function ClientProfileModal({
  open,
  onOpenChange,
  client,
  onEdit,
}: ClientProfileModalProps) {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Get client's sales
  const clientSales = useMemo(() => {
    return sales.filter(sale => sale.client_id === client.id);
  }, [client.id]);

  // Filter sales by vehicle if selected
  const filteredSales = useMemo(() => {
    if (!selectedVehicle) return clientSales;
    return clientSales.filter(sale => sale.vehicle_id === selectedVehicle.id);
  }, [clientSales, selectedVehicle]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return client.vehicles;
    const term = vehicleSearch.toLowerCase();
    return client.vehicles.filter(v =>
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.plate.toLowerCase().includes(term)
    );
  }, [client.vehicles, vehicleSearch]);

  const openWhatsApp = () => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const getServiceNames = (serviceIds: number[]) => {
    return serviceIds.map(id => getServiceById(id)?.name || 'Serviço').join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <DialogTitle className="text-xl">{client.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Cliente desde {format(new Date(client.created_at), "MMM yyyy", { locale: ptBR })}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chamar no Whatsapp
              </Button>
              <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10">
                <Plus className="h-4 w-4 mr-2" />
                Criar venda com cliente
              </Button>
              <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Adicionar na vaga do espaço
              </Button>
            </div>

            {/* Client Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-500" />
                <span className="text-foreground">{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="text-foreground">{client.origem}</span>
              </div>
            </div>

            {/* Vehicles Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Gestão de Veículos
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar veículo por marca, modelo, placa..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>

              {selectedVehicle && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <span className="text-sm text-foreground">
                    Filtrando por: {selectedVehicle.brand} {selectedVehicle.model}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVehicle(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="grid gap-2">
                {filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id === selectedVehicle?.id ? null : vehicle)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left w-full ${
                      selectedVehicle?.id === vehicle.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.year} • {vehicle.plate} • Porte {vehicle.size}
                      </p>
                    </div>
                  </button>
                ))}

                {filteredVehicles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum veículo encontrado
                  </p>
                )}
              </div>
            </div>

            {/* Sales History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Histórico de Vendas
                </h3>
                {selectedVehicle && (
                  <span className="text-xs text-primary">
                    Filtrando por {selectedVehicle.model}
                  </span>
                )}
              </div>

              {!selectedVehicle && (
                <p className="text-xs text-muted-foreground">
                  Nenhum filtro aplicado. Clique em um veículo para filtrar.
                </p>
              )}

              <div className="space-y-2">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Venda Nº {sale.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sale.date), "dd/MM/yyyy")} • {getServiceNames(sale.services).slice(0, 30)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge 
                        variant={sale.status === 'Fechada' ? 'default' : 'secondary'}
                        className={sale.status === 'Fechada' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                {filteredSales.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma venda encontrada
                  </p>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-3 p-4 rounded-lg bg-background border border-border">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Estatísticas
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="text-foreground">
                    {format(new Date(client.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Cliente com</span>
                  <span className="text-foreground">{client.vehicles.length} veículos</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Foram</span>
                  <span className="text-foreground">{client.sales_count} vendas realizadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Total gasto:</span>
                  <span className="text-foreground font-semibold">
                    R$ {client.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t border-border flex-shrink-0">
          <Button 
            onClick={onEdit}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="destructive"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
