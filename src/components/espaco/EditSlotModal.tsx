import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { Calendar, Clock, Car, User, Camera, Tag, FileText, DollarSign, Package, Plus, RefreshCw, Loader2, Check, Percent, X, Sliders, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ServiceItemRow, { DetailedServiceItem, ProductCategory } from "@/components/vendas/ServiceItemRow";
import CustomizedServiceBlock, { CustomizedRegionItem, createInitialCustomItems } from "@/components/vendas/CustomizedServiceBlock";
import NewVehicleModal from "@/components/vendas/NewVehicleModal";
import NewClientModal from "@/components/vendas/NewClientModal";
import { validateUpload, sanitizeFilename } from "@/lib/uploadValidator";

interface EditSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlotUpdated?: () => void;
  space: any;
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
  region_code?: string | null;
}

export function EditSlotModal({ open, onOpenChange, onSlotUpdated, space }: EditSlotModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  // Form state
  const [slotName, setSlotName] = useState(space?.name || "");
  const [selectedClientId, setSelectedClientId] = useState<string>(space?.client_id ? space.client_id.toString() : "");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(space?.vehicle_id ? space.vehicle_id.toString() : "");
  const [entryDate, setEntryDate] = useState<Date>(space?.entry_date ? parseISO(space.entry_date) : new Date());
  const [entryTime, setEntryTime] = useState(space?.entry_time || format(new Date(), 'HH:mm'));
  const [exitDate, setExitDate] = useState<Date | undefined>(space?.exit_date ? parseISO(space.exit_date) : undefined);
  const [exitTime, setExitTime] = useState(space?.exit_time || "");
  const [discount, setDiscount] = useState<number>(space?.discount || 0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [observations, setObservations] = useState(space?.observations || "");
  const [tag, setTag] = useState(space?.tag || "");
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Detailed services state
  const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
  const [customizedGroups, setCustomizedGroups] = useState<Map<string, CustomizedRegionItem[]>>(new Map());
  
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
      // 1. Fetch materials (bobinas) from stock
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('product_type_id, is_open_roll')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (materialsError) throw materialsError;

      // 2. Fetch product types
      const { data: productsData, error: productsError } = await supabase
        .from('product_types')
        .select('id, category, brand, name, model, light_transmission, unit_price')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // 3. Map stock to products
      const materialsList = materialsData || [];
      const enrichedProducts = (productsData || []).map(pt => {
        const ptMaterials = materialsList.filter(m => m.product_type_id === pt.id);
        const openRolls = ptMaterials.filter(m => m.is_open_roll);
        const closedRolls = ptMaterials.filter(m => !m.is_open_roll);
        return {
          ...pt,
          openRollsCount: openRolls.length,
          hasClosedRoll: closedRolls.length > 0
        };
      });

      return enrichedProducts;
    },
    enabled: !!companyId && open,
  });

  // Fetch vehicle regions (services) with fixed_price
  const { data: vehicleRegions } = useQuery({
    queryKey: ['vehicle-regions-with-price', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_regions')
        .select('id, category, name, description, fixed_price, region_code')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as unknown as VehicleRegion[];
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
      return data as any[];
    },
    enabled: !!companyId && open,
  });

  // Get selected data
  const selectedClient = clients?.find(c => c.id === parseInt(selectedClientId));
  const selectedVehicle = clientVehicles?.find(v => v.id === parseInt(selectedVehicleId));

  const rulesWithRegionCode = (consumptionRules || []).map(rule => {
    const region = vehicleRegions?.find(r => r.id === rule.region_id);
    return { ...rule, region_code: (region as any)?.region_code || null };
  });

  // Calculate totals
  const subtotal = detailedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const calculatedDiscount = discountType === 'percent' 
    ? (subtotal * (discountPercent / 100)) 
    : (discount || 0);
  const finalTotal = subtotal - calculatedDiscount;
  const serviceCount = detailedItems.length;

  useEffect(() => {
    if (open && space) {
      setSlotName(space.name || "");
      if (space.client_id) setSelectedClientId(space.client_id.toString());
      if (space.vehicle_id) setSelectedVehicleId(space.vehicle_id.toString());
      
      if (space.entry_date) setEntryDate(parseISO(space.entry_date));
      if (space.entry_time) setEntryTime(space.entry_time);
      if (space.exit_date) setExitDate(parseISO(space.exit_date));
      if (space.exit_time) setExitTime(space.exit_time);
      
      if (space.discount) {
         setDiscount(space.discount);
         // calculate percentage based on services total later if needed, but for now fixed
         setDiscountType('fixed');
      }
      if (space.observations) {
         setObservations(space.observations);
         setShowObservations(true);
      }
      if (space.tag) {
         setTag(space.tag);
         setShowTag(true);
      }
      
      if (space.discount > 0) setShowDiscount(true);
      
      // Detailed items
      if (space.services_data && Array.isArray(space.services_data)) {
         const loadedItems: DetailedServiceItem[] = [];
         const loadedGroups = new Map<string, CustomizedRegionItem[]>();

         for (const item of space.services_data as any[]) {
           if (item.isCustomized && item.customizationGroup && item.items) {
             const groupId = item.customizationGroup;
             loadedItems.push({
               id: crypto.randomUUID(),
               category: item.category || 'INSULFILM' as ProductCategory,
               regionId: null,
               regionName: '',
               productTypeId: null,
               productTypeName: '',
               metersUsed: 0,
               totalPrice: item.totalPrice || 0,
               serviceName: '',
               regionCode: null,
               displayName: '',
               isCustomized: true,
               customizationGroup: groupId,
             });
             loadedGroups.set(groupId, item.items.map((gi: any) => ({
               regionCode: gi.regionCode,
               regionLabel: gi.regionLabel,
               productTypeId: gi.productTypeId,
               productTypeName: gi.productTypeName || '',
               metersUsed: gi.metersUsed || 0,
               totalPrice: gi.totalPrice || 0,
             })));
           } else {
             loadedItems.push({
               id: crypto.randomUUID(),
               category: item.category || 'INSULFILM' as ProductCategory,
               regionId: item.regionId || null,
               regionName: item.regionName || '',
               productTypeId: item.productTypeId || null,
               productTypeName: item.productTypeName || '',
               metersUsed: item.metersUsed || 0,
               totalPrice: item.totalPrice || 0,
               serviceName: item.serviceName || '',
               regionCode: item.regionCode || null,
               displayName: item.displayName || '',
               isCustomized: false,
               customizationGroup: null,
             });
           }
         }
         setDetailedItems(loadedItems);
         setCustomizedGroups(loadedGroups);
      }
    }
  }, [open, space]);

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
      serviceName: "",
      regionCode: null,
      displayName: "",
      isCustomized: false,
      customizationGroup: null,
    };
    setDetailedItems([...detailedItems, newItem]);
  };

  // Toggle customized mode
  const handleToggleCustomize = (itemId: string) => {
    const item = detailedItems.find(i => i.id === itemId);
    if (!item || (item.isCustomized && item.customizationGroup)) return;

    const groupId = crypto.randomUUID();
    const initialItems = createInitialCustomItems(
      selectedVehicle?.size || null,
      consumptionRules || [],
      item.productTypeId,
      item.productTypeName,
      item.regionId
    );

    setDetailedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isCustomized: true, customizationGroup: groupId }
          : i
      )
    );
    setCustomizedGroups(prev => new Map(prev).set(groupId, initialItems));
  };

  const handleRevertToSimple = (itemId: string, groupId: string) => {
    setDetailedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? { ...i, isCustomized: false, customizationGroup: null, productTypeId: null, productTypeName: "" }
          : i
      )
    );
    setCustomizedGroups(prev => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleUpdateCustomizedItems = (groupId: string, items: CustomizedRegionItem[]) => {
    setCustomizedGroups(prev => new Map(prev).set(groupId, items));
  };

  // Handle updating a detailed service item with fixed_price support
  const handleUpdateDetailedItem = (updatedItem: DetailedServiceItem) => {
    // If region changed, apply fixed_price if available
    const region = vehicleRegions?.find(r => r.id === updatedItem.regionId);
    if (region?.fixed_price && region.fixed_price > 0 && updatedItem.totalPrice === 0) {
      updatedItem = { ...updatedItem, totalPrice: region.fixed_price };
    }
    
    setDetailedItems(prev =>
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Update customized group price
  const handleUpdateCustomizedPrice = (itemId: string, newPrice: number) => {
    setDetailedItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, totalPrice: newPrice } : i)
    );
  };

  // Handle removing a detailed service item
  const handleRemoveDetailedItem = (itemId: string) => {
    setDetailedItems(items => items.filter(item => item.id !== itemId));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      const validFiles: File[] = [];
      for (const file of newFiles) {
        const validation = validateUpload(file, { 
          type: 'checklist-photo', 
          maxFiles: 20, 
          currentFiles: photos.length + validFiles.length 
        });
        
        if (!validation.valid) {
          toast.error(`Falha em ${file.name}: ${validation.error}`);
          continue;
        }
        validFiles.push(file);
      }
      
      setPhotos([...photos, ...validFiles]);
    }
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

  // Mutation to update space
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedClientId || !selectedVehicleId) {
        throw new Error("Dados inválidos");
      }

      // Update space
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .update({
          name: slotName || `Vaga de ${selectedClient?.name}`,
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          entry_date: format(entryDate, 'yyyy-MM-dd'),
          entry_time: entryTime,
          exit_date: exitDate ? format(exitDate, 'yyyy-MM-dd') : null,
          exit_time: exitTime || null,
          discount: calculatedDiscount || null,
          observations: observations || null,
          tag: tag || null,
        })
        .eq('id', space.id)
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Save services data as JSONB
      if (detailedItems.length > 0) {
        const servicesData: any[] = [];
        for (const item of detailedItems) {
          if (item.isCustomized && item.customizationGroup) {
            const groupItems = customizedGroups.get(item.customizationGroup) || [];
            servicesData.push({
              category: item.category,
              isCustomized: true,
              customizationGroup: item.customizationGroup,
              totalPrice: item.totalPrice || 0,
              items: groupItems.map(gi => ({
                regionCode: gi.regionCode,
                regionLabel: gi.regionLabel,
                productTypeId: gi.productTypeId,
                productTypeName: gi.productTypeName,
                metersUsed: gi.metersUsed,
                totalPrice: gi.totalPrice,
              })),
            });
          } else {
            const region = (vehicleRegions || []).find(r => r.id === item.regionId);
            servicesData.push({
              category: item.category,
              regionId: item.regionId,
              regionName: item.regionName || 'Serviço',
              productTypeId: item.productTypeId,
              productTypeName: item.productTypeName || '',
              totalPrice: item.totalPrice || 0,
              metersUsed: item.metersUsed || 0,
              serviceName: item.serviceName || item.regionName,
              regionCode: region?.region_code || null,
              displayName: item.displayName || `${item.regionName} • ${item.productTypeName}`,
              isCustomized: false,
            });
          }
        }
        
        await supabase
          .from('spaces')
          .update({ services_data: servicesData } as any)
          .eq('id', spaceData.id);
      }

      // Upload photos (validated locally, but Storage RLS ensures bounds too)
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileExt = photo.name.split('.').pop() || 'jpg';
          const sanitizedName = sanitizeFilename(photo.name.replace(`.${fileExt}`, ''));
          const fileName = `${Date.now()}_${i}_${sanitizedName}.${fileExt}`;
          const filePath = `${companyId}/${spaceData.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('checklists')
            .upload(filePath, photo, { upsert: true });
            
          if (uploadError) {
             console.error("Erro no upload da foto", photo.name, uploadError);
          }
        }
      }

      return spaceData;
    },
    onSuccess: () => {
      toast.success("Vaga atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      onSlotUpdated?.();
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
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar vaga</DialogTitle>
          <DialogDescription>Edite os dados desta vaga</DialogDescription>
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
                    <div key={item.id} className="space-y-2">
                      {item.isCustomized && item.customizationGroup ? (
                        <CustomizedServiceBlock
                          groupId={item.customizationGroup}
                          items={customizedGroups.get(item.customizationGroup) || []}
                          productTypes={productTypes || []}
                          vehicleSize={selectedVehicle?.size || null}
                          consumptionRules={rulesWithRegionCode}
                          servicePrice={item.totalPrice}
                          onUpdate={(items) => handleUpdateCustomizedItems(item.customizationGroup!, items)}
                          onRevertToSimple={() => handleRevertToSimple(item.id, item.customizationGroup!)}
                          onPriceChange={(price) => handleUpdateCustomizedPrice(item.id, price)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ServiceItemRow
                              item={item}
                              vehicleSize={selectedVehicle?.size || null}
                              productTypes={productTypes || []}
                              vehicleRegions={vehicleRegions || []}
                              consumptionRules={rulesWithRegionCode}
                              onUpdate={handleUpdateDetailedItem}
                              onRemove={handleRemoveDetailedItem}
                            />
                          </div>
                          {item.category === 'INSULFILM' && item.regionCode === 'SIDE_REAR' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleToggleCustomize(item.id)}
                              title="Personalizar"
                            >
                              <Sliders className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
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
                <CalendarIcon className="h-4 w-4" />
                Dia da entrada *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(entryDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={entryDate}
                    onSelect={(date) => date && setEntryDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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
                <CalendarIcon className="h-4 w-4" />
                Dia da saída (previsão)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exitDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exitDate
                      ? format(exitDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={exitDate}
                    onSelect={(date) => setExitDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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

          {/* Fotos de checklist */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos de checklist
              </Label>
              <span className="text-xs text-muted-foreground">{photos.length}/20</span>
            </div>
            <p className="text-sm text-muted-foreground">Opcional: Adicione fotos para referenciar a avaria ou condição de recebimento do veículo.</p>
            
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative min-w-[80px] h-[80px] rounded border overflow-hidden shrink-0">
                    <img src={URL.createObjectURL(photo)} alt={`Foto ${index+1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black p-1 rounded-full text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input 
              type="file" 
              multiple 
              accept="image/png, image/jpeg, image/webp, image/heic" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handlePhotoSelect} 
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= 20}
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Carregar nova foto
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
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Em espera">Em espera</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
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
            disabled={updateMutation.isPending || !selectedClientId || !selectedVehicleId}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            Salvar vaga
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
