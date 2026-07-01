import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaleWithDetails } from "@/types/sales";
import SaleDetailsModal from "@/components/vendas/SaleDetailsModal";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  size: string | null;
}

interface ClientData {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  cpf_cnpj?: string | null;
  origem?: string | null;
  created_at: string | null;
  vehicles: Vehicle[];
  total_spent: number;
  sales_count: number;
  last_sale_date?: string | null;
  status?: string;
  tier?: string;
}

interface ProfileSale {
  id: number;
  sale_date: string;
  total: number;
  is_open: boolean | null;
  vehicle_id: number | null;
  payment_method: string | null;
  sale_items: {
    id: number;
    service: { name: string } | null;
  }[];
}

interface ClientProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData;
  onEdit: () => void;
  onCreateSale?: () => void;
  onAddToSpace?: () => void;
  onDelete?: (client: ClientData) => void;
}

export function ClientProfileModal({
  open,
  onOpenChange,
  client,
  onEdit,
  onCreateSale,
  onAddToSpace,
  onDelete,
}: ClientProfileModalProps) {
  const { user } = useAuth();
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [clientSales, setClientSales] = useState<ProfileSale[]>([]);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // Fetch real sales from Supabase when modal opens
  useEffect(() => {
    if (open && client?.id) {
      fetchClientSales();
    }
    if (!open) {
      // Reset state when modal closes
      setClientSales([]);
      setSelectedVehicle(null);
      setVehicleSearch("");
      setLoadingSaleId(null);
    }
  }, [open, client?.id]);

  const fetchClientSales = async () => {
    if (!user?.id) return;

    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          total,
          is_open,
          vehicle_id,
          payment_method,
          sale_items(
            id,
            service:services(name)
          )
        `)
        .eq("client_id", client.id)
        .is("deleted_at", null)
        .order("sale_date", { ascending: false });

      if (error) {
        console.error("Error fetching client sales:", error);
      } else {
        setClientSales(data || []);
      }
    } catch (err) {
      console.error("Error fetching client sales:", err);
    } finally {
      setLoadingSales(false);
    }
  };

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
      (v.brand?.toLowerCase() || "").includes(term) ||
      (v.model?.toLowerCase() || "").includes(term) ||
      (v.plate?.toLowerCase() || "").includes(term)
    );
  }, [client.vehicles, vehicleSearch]);

  const openWhatsApp = () => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    window.location.href = url;
  };

  const getServiceNames = (saleItems: ProfileSale["sale_items"]) => {
    if (!saleItems || saleItems.length === 0) return "Serviço";
    return saleItems
      .map(item => item.service?.name || "Serviço")
      .join(", ");
  };

  const handleOpenSaleDetails = async (saleId: number) => {
    setLoadingSaleId(saleId);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          client:clients(id, name, phone),
          vehicle:vehicles(id, brand, model, year, plate, size),
          sale_items(
            id, service_id, quantity, unit_price, total_price,
            service:services(id, name, base_price)
          )
        `)
        .eq("id", saleId)
        .single();

      if (error) {
        console.error("Error fetching sale details:", error);
        return;
      }

      if (data) {
        const saleDetails: SaleWithDetails = {
          id: data.id,
          client_id: data.client_id,
          vehicle_id: data.vehicle_id,
          sale_date: data.sale_date,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          payment_method: data.payment_method,
          status: data.status,
          is_open: data.is_open,
          observations: data.observations,
          created_at: data.created_at,
          client: data.client,
          vehicle: data.vehicle,
          sale_items: data.sale_items || [],
        };
        setSelectedSaleDetails(saleDetails);
      }
    } catch (err) {
      console.error("Error fetching sale details:", err);
    } finally {
      setLoadingSaleId(null);
    }
  };

  return (
    <>
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
              <p className="text-sm text-muted-foreground">
                Cliente desde {client.created_at ? format(new Date(client.created_at), "MMM yyyy", { locale: ptBR }) : "—"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
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
              <Button 
                variant="outline" 
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                onClick={onCreateSale}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar venda com cliente
              </Button>
              <Button 
                variant="outline" 
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                onClick={onAddToSpace}
              >
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
              {client.origem && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-foreground">{client.origem}</span>
                </div>
              )}
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
                        {vehicle.year} • {vehicle.plate || "S/ Placa"} • Porte {vehicle.size || "—"}
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

              {loadingSales ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenSaleDetails(sale.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        {loadingSaleId === sale.id ? (
                          <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          Venda Nº {sale.id}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {format(new Date(sale.sale_date + 'T12:00:00'), "dd/MM/yyyy")} • {getServiceNames(sale.sale_items).slice(0, 40)}{getServiceNames(sale.sale_items).length > 40 ? '...' : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-foreground">
                          R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge 
                          variant={!sale.is_open ? 'default' : 'secondary'}
                          className={!sale.is_open ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}
                        >
                          {sale.is_open ? 'Aberta' : 'Fechada'}
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
              )}
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
                    {client.created_at ? format(new Date(client.created_at), "dd/MM/yyyy") : "—"}
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
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t border-border flex-shrink-0">
          <Button 
            onClick={onEdit}
            className="flex-1 bg-[#c6e60b] hover:bg-[#b0cc0a] text-black font-semibold"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="destructive"
            className="flex-1"
            onClick={() => onDelete?.(client)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Sale Details Modal */}
    <SaleDetailsModal
      open={!!selectedSaleDetails}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedSaleDetails(null);
          // Refresh sales list in case something was edited
          fetchClientSales();
        }
      }}
      sale={selectedSaleDetails}
    />
    </>
  );
}
