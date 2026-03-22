import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Car, User, Camera, Tag, FileText, DollarSign, Package, Plus, RefreshCw, Loader2, Check, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ServiceItemRow, { DetailedServiceItem, ProductCategory } from "@/components/vendas/ServiceItemRow";
import NewVehicleModal from "@/components/vendas/NewVehicleModal";
import NewClientModal from "@/components/vendas/NewClientModal";

interface FillSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlotFilled?: () => void;
  preselectedDate?: Date;
}

interface ClientVehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  size: string | null;
}

interface VehicleRegion {
  id: number;
  category: string;
  name: string;
  description: string | null;
  fixed_price: number | null;
}

export function FillSlotModal({ open, onOpenChange, onSlotFilled, preselectedDate }: FillSlotModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  // Form state
  const [slotName, setSlotName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(format(preselectedDate || new Date(), 'yyyy-MM-dd'));
  const [entryTime, setEntryTime] = useState(format(new Date(), 'HH:mm'));
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [observations, setObservations] = useState("");
  const [tag, setTag] = useState("");
  
  // Detailed services state
  const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
  
  // New vehicle modal
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  // Toggle states for optional fields
  const [showDiscount, setShowDiscount] = useState(false);
  const [showObservations, setShowObservations] = useState(false);
  const [showTag, setShowTag] = useState(false);

  // Fetch clients
  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['clients-for-slot', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, birth_date')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Fetch client's vehicles
  const { data: clientVehicles, isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ['client-vehicles', selectedClientId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, plate, year, size')
        .eq('client_id', parseInt(selectedClientId))
        .eq('company_id', companyId);
      if (error) throw error;
      return data as ClientVehicle[];
    },
    enabled: !!selectedClientId && !!companyId,
  });

  // Fetch product types for services
  const { data: productTypes } = useQuery({
    queryKey: ['product-types', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_types')
        .select('id, category, brand, name, model, light_transmission, unit_price')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Fetch vehicle regions (services) with fixed_price
  const { data: vehicleRegions } = useQuery({
    queryKey: ['vehicle-regions-with-price', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_regions')
        .select('id, category, name, description, fixed_price')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as VehicleRegion[];
    },
    enabled: !!companyId && open,
  });

  // Fetch consumption rules
  const { data: consumptionRules } = useQuery({
    queryKey: ['consumption-rules', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('region_consumption_rules')
        .select('id, category, region_id, vehicle_size, meters_consumed')
        .eq('company_id', companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Get selected data
  const selectedClient = clients?.find(c => c.id === parseInt(selectedClientId));
  const selectedVehicle = clientVehicles?.find(v => v.id === parseInt(selectedVehicleId));

  // Calculate totals
  const subtotal = detailedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const calculatedDiscount = discountType === 'percent' 
    ? (subtotal * (discountPercent / 100)) 
    : (discount || 0);
  const finalTotal = subtotal - calculatedDiscount;
  const serviceCount = detailedItems.length;

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSlotName("");
      setSelectedClientId("");
      setSelectedVehicleId("");
      setEntryDate(format(new Date(), 'yyyy-MM-dd'));
      setEntryTime(format(new Date(), 'HH:mm'));
      setExitDate("");
      setExitTime("");
      setDiscount(0);
      setDiscountPercent(0);
      setDiscountType('fixed');
      setObservations("");
      setTag("");
      setDetailedItems([]);
      setShowDiscount(false);
      setShowObservations(false);
      setShowTag(false);
    }
  }, [open]);

  // Update entry date when preselectedDate changes
  useEffect(() => {
    if (preselectedDate) {
      setEntryDate(format(preselectedDate, 'yyyy-MM-dd'));
    }
  }, [preselectedDate]);

  // Reset vehicle and services when client changes
  useEffect(() => {
    setDetailedItems([]);
    setSelectedVehicleId("");
  }, [selectedClientId]);

  // Auto-select vehicle if there is exactly 1
  useEffect(() => {
    if (clientVehicles && clientVehicles.length === 1 && !selectedVehicleId) {
      setSelectedVehicleId(clientVehicles[0].id.toString());
    }
  }, [clientVehicles]);

  // Handle adding a new detailed service item
  const handleAddDetailedItem = () => {
    const newItem: DetailedServiceItem = {
      id: crypto.randomUUID(),
      category: "INSULFILM" as ProductCategory,
      regionId: null,
      regionName: "",
      productTypeId: null,
      productTypeName: "",
      metersUsed: 0,
      totalPrice: 0,
    };
    setDetailedItems([...detailedItems, newItem]);
  };

  // Handle updating a detailed service item with fixed_price support
  const handleUpdateDetailedItem = (updatedItem: DetailedServiceItem) => {
    // If region changed, apply fixed_price if available
    const region = vehicleRegions?.find(r => r.id === updatedItem.regionId);
    if (region?.fixed_price && region.fixed_price > 0 && updatedItem.totalPrice === 0) {
      updatedItem = { ...updatedItem, totalPrice: region.fixed_price };
    }
    
    setDetailedItems(items =>
      items.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Handle removing a detailed service item
  const handleRemoveDetailedItem = (itemId: string) => {
    setDetailedItems(items => items.filter(item => item.id !== itemId));
  };

  // Handle new vehicle created
  const handleVehicleCreated = async (vehicleData: any) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          client_id: parseInt(selectedClientId),
          brand: vehicleData.brand,
          model: vehicleData.model,
          plate: vehicleData.plate,
          year: vehicleData.year,
          size: vehicleData.size,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Veículo cadastrado com sucesso!");
      refetchVehicles();
      setSelectedVehicleId(data.id.toString());
      setShowNewVehicleModal(false);
    } catch (error) {
      console.error("Erro ao cadastrar veículo:", error);
      toast.error("Erro ao cadastrar veículo");
    }
  };

  // Mutation to create space (without sale_id)
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedClientId || !selectedVehicleId) {
        throw new Error("Dados inválidos");
      }

      // Insert space without sale_id
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name: slotName || `Vaga de ${selectedClient?.name}`,
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          sale_id: null, // No sale yet - will be created later
          company_id: companyId,
          entry_date: entryDate,
          entry_time: entryTime,
          exit_date: exitDate || null,
          exit_time: exitTime || null,
          discount: calculatedDiscount || null,
          observations: observations || null,
          tag: tag || null,
          status: 'ocupado',
          payment_status: 'pending',
          has_exited: false,
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Save services data as JSONB
      if (detailedItems.length > 0) {
        const servicesData = detailedItems.map(item => ({
          regionName: item.regionName || 'Serviço',
          productTypeName: item.productTypeName || '',
          totalPrice: item.totalPrice || 0,
          metersUsed: item.metersUsed || 0,
        }));
        
        await supabase
          .from('spaces')
          .update({ services_data: servicesData } as any)
          .eq('id', spaceData.id);
      }

      return spaceData;
    },
    onSuccess: () => {
      toast.success("Vaga preenchida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      onSlotFilled?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao criar vaga:", error);
      toast.error("Erro ao preencher vaga");
    },
  });

  const handleSubmit = () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!selectedVehicleId) {
      toast.error("Selecione um veículo");
      return;
    }
    if (!entryDate || !entryTime) {
      toast.error("Informe a data e hora de entrada");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher vaga</DialogTitle>
          <DialogDescription>Informe os dados para preencher a vaga</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nome da vaga */}
          <div className="space-y-2">
            <Label>Nome da vaga (opcional)</Label>
            <Input 
              value={slotName} 
              onChange={(e) => setSlotName(e.target.value)}
              placeholder="Ex: Vaga 1, Box A, etc."
            />
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNewClientModal(true)}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo
              </Button>
            </div>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione um cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(client => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{client.name}</span>
                      {client.phone && (
                        <span className="text-muted-foreground text-xs">({client.phone})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Veículo */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>Veículo *</Label>
              {loadingVehicles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientVehicles && clientVehicles.length > 0 ? (
                        clientVehicles.map(vehicle => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>{vehicle.brand} {vehicle.model}</span>
                              {vehicle.plate && (
                                <Badge variant="outline" className="text-xs">{vehicle.plate}</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum veículo cadastrado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setShowNewVehicleModal(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Novo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Serviços Detalhados */}
          {selectedVehicleId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Serviços</Label>
                <Button variant="outline" size="sm" onClick={handleAddDetailedItem}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
                </Button>
              </div>

              {detailedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Clique em "Adicionar Serviço" para incluir serviços na vaga
                </p>
              ) : (
                <div className="space-y-2">
                  {detailedItems.map(item => (
                    <ServiceItemRow
                      key={item.id}
                      item={item}
                      vehicleSize={selectedVehicle?.size || null}
                      productTypes={productTypes || []}
                      vehicleRegions={vehicleRegions || []}
                      consumptionRules={consumptionRules || []}
                      onUpdate={handleUpdateDetailedItem}
                      onRemove={handleRemoveDetailedItem}
                    />
                  ))}
                </div>
              )}

              {detailedItems.length > 0 && (
                <div className="flex justify-end">
                  <Badge variant="secondary">
                    {serviceCount} serviço(s) - R$ {subtotal.toFixed(2)}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Datas de entrada e saída */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dia da entrada *
              </Label>
              <Input 
                type="date" 
                value={entryDate} 
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora da entrada *
              </Label>
              <Input 
                type="time" 
                value={entryTime} 
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dia da saída (previsão)
              </Label>
              <Input 
                type="date" 
                value={exitDate} 
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora da saída
              </Label>
              <Input 
                type="time" 
                value={exitTime} 
                onChange={(e) => setExitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Fotos de checklist - placeholder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos de checklist
            </Label>
            <p className="text-sm text-muted-foreground">Abaixo estão as fotos dessa vaga</p>
            <Button variant="outline" className="w-full" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Carregar nova foto 0/20
            </Button>
          </div>

          {/* Campos opcionais */}
          <div className="space-y-2">
            <Label>Campos opcionais</Label>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={showDiscount ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowDiscount(!showDiscount)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Desconto
              </Button>
              <Button 
                variant={showObservations ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowObservations(!showObservations)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Observações
              </Button>
              <Button 
                variant={showTag ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowTag(!showTag)}
              >
                <Tag className="h-4 w-4 mr-1" />
                Tag
              </Button>
            </div>
          </div>

          {/* Campos opcionais expandidos */}
          {showDiscount && (
            <div className="space-y-3">
              {/* Seleção do tipo de desconto */}
              <div className="flex gap-2">
                <Card 
                  className={`flex-1 cursor-pointer transition-all ${
                    discountType === 'fixed' 
                      ? "border-primary bg-primary/10" 
                      : "border-border/50 hover:border-muted-foreground"
                  }`}
                  onClick={() => setDiscountType('fixed')}
                >
                  <CardContent className="p-3 text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Valor (R$)</span>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`flex-1 cursor-pointer transition-all ${
                    discountType === 'percent' 
                      ? "border-primary bg-primary/10" 
                      : "border-border/50 hover:border-muted-foreground"
                  }`}
                  onClick={() => setDiscountType('percent')}
                >
                  <CardContent className="p-3 text-center">
                    <Percent className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Percentual (%)</span>
                  </CardContent>
                </Card>
              </div>
              
              {/* Input baseado no tipo selecionado */}
              {discountType === 'fixed' ? (
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input 
                    type="number" 
                    value={discount || ""} 
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input 
                    type="number" 
                    value={discountPercent || ""} 
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    max={100}
                  />
                  {discountPercent > 0 && subtotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      = R$ {(subtotal * (discountPercent / 100)).toFixed(2)} de desconto
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {showObservations && (
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={observations} 
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações sobre a vaga..."
              />
            </div>
          )}

          {showTag && (
            <div className="space-y-2">
              <Label>Tag</Label>
              <Input 
                value={tag} 
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex: Urgente, VIP, etc."
              />
            </div>
          )}

          {/* Resumo da vaga */}
          {selectedVehicleId && (
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4 space-y-2">
                <h4 className="font-medium">Resumo da vaga</h4>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient?.name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedVehicle?.brand} {selectedVehicle?.model} {selectedVehicle?.plate && `- ${selectedVehicle.plate}`}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{serviceCount} serviço(s) adicionado(s)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Sub-total: R$ {subtotal.toFixed(2)}</span>
                  </p>
                  {calculatedDiscount > 0 && (
                    <p className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Desconto: R$ {calculatedDiscount.toFixed(2)}
                        {discountType === 'percent' && ` (${discountPercent}%)`}
                      </span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 font-medium">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-primary">Total: R$ {finalTotal.toFixed(2)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Entrada em {format(new Date(entryDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de ação */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !selectedClientId || !selectedVehicleId}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            Adicionar vaga
          </Button>
        </div>
      </DialogContent>

      {/* New Vehicle Modal */}
      <NewVehicleModal
        open={showNewVehicleModal}
        onOpenChange={setShowNewVehicleModal}
        onVehicleCreated={handleVehicleCreated}
      />

      {/* New Client Modal */}
      <NewClientModal
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={() => {
          refetchClients();
          setShowNewClientModal(false);
        }}
      />
    </Dialog>
  );
}
