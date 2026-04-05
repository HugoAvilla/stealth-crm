import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  CalendarIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Percent,
  User,
  Car,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { consumeStockForDetailedSale, createTransactionFromSale } from "@/lib/stockConsumption";
import NewClientModal from "@/components/vendas/NewClientModal";
import ServiceItemRow, { DetailedServiceItem, ProductCategory } from "@/components/vendas/ServiceItemRow";
import { toast } from "sonner";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  plate: string | null;
  size: string | null;
  client_id: number | null;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  // unit_price removido - preço vem do serviço
}

interface VehicleRegion {
  id: number;
  category: string;
  name: string;
  description: string | null;
  fixed_price: number | null;
}

interface ConsumptionRule {
  id: number;
  category: string;
  region_id: number;
  vehicle_size: string;
  meters_consumed: number;
}

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: number;
  initialDate?: Date;
  prefillData?: {
    clientId: number;
    vehicleId: number;
    discount?: number;
    services: any[];
  };
  onSuccess?: () => void;
}

const NewSaleModal = ({ open, onOpenChange, defaultClientId, initialDate, prefillData, onSuccess }: NewSaleModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showDetailedServices, setShowDetailedServices] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [servicePrice, setServicePrice] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [vehicleRegions, setVehicleRegions] = useState<VehicleRegion[]>([]);
  const [consumptionRules, setConsumptionRules] = useState<ConsumptionRule[]>([]);
  const [detailedItems, setDetailedItems] = useState<DetailedServiceItem[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      if (initialDate) {
        setSaleDate(initialDate);
      } else {
        setSaleDate(new Date());
      }
      fetchData();
      if (prefillData) {
        setSelectedClientId(prefillData.clientId.toString());
        setSelectedVehicleId(prefillData.vehicleId.toString());
        if (prefillData.discount) setDiscountValue(prefillData.discount.toString());
        if (prefillData.services && prefillData.services.length > 0) {
          // Initialize detailed services from prefill
          setDetailedItems(prefillData.services.map((s: any) => ({
            id: crypto.randomUUID(),
            category: s.category || "INSULFILM" as ProductCategory,
            regionId: s.regionId || null,
            regionName: s.regionName || "",
            productTypeId: s.productTypeId || null,
            productTypeName: s.productTypeName || "",
            metersUsed: s.metersUsed || 0,
            totalPrice: s.totalPrice || 0,
          })));
        }
      } else if (defaultClientId) {
        setSelectedClientId(defaultClientId.toString());
      }
    }
  }, [open, user?.id, initialDate, prefillData]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id);

      const [clientsRes, productTypesRes, regionsRes, rulesRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id).order('name'),
        supabase.from('product_types').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('brand'),
        supabase.from('vehicle_regions').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('sort_order'),
        supabase.from('region_consumption_rules').select('*').eq('company_id', profile.company_id)
      ]);
      const regionsList = regionsRes.data || [];
      const productsList = productTypesRes.data || [];

      setClients(clientsRes.data || []);
      setProductTypes(productsList);
      setVehicleRegions(regionsList);
      setConsumptionRules(rulesRes.data || []);

      // Retroactive mapping for spaces created before ID tracking
      setDetailedItems(currentItems => {
        if (!currentItems || currentItems.length === 0) return currentItems;
        
        return currentItems.map(item => {
          let mappedRegionId = item.regionId;
          if (!mappedRegionId && item.regionName) {
            const itemCategory = item.category || 'INSULFILM';
            const found = regionsList.find(r => r.name?.toLowerCase().trim() === item.regionName?.toLowerCase().trim() && r.category === itemCategory);
            if (found) mappedRegionId = found.id;
          }
          
          let mappedProductId = item.productTypeId;
          if (!mappedProductId && item.productTypeName) {
            const itemCategory = item.category || 'INSULFILM';
            const found = productsList.find(p => {
               const brand = p.brand || "";
               const name = p.name || "";
               const light = p.light_transmission ? ` ${p.light_transmission}` : "";
               const fullName = `${brand} ${name}${light}`.trim().toLowerCase();
               return fullName === item.productTypeName?.toLowerCase().trim() && p.category === itemCategory;
            });
            if (found) mappedProductId = found.id;
          }
          
          return { ...item, regionId: mappedRegionId, productTypeId: mappedProductId };
        });
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicles when client changes
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selectedClientId || !companyId) {
        setVehicles([]);
        return;
      }

      const { data } = await supabase
        .from('vehicles')
        .select('id, brand, model, plate, size, client_id')
        .eq('client_id', parseInt(selectedClientId))
        .eq('company_id', companyId);

      setVehicles(data || []);
      
      if (data && data.length === 1) {
        setSelectedVehicleId(data[0].id.toString());
      } else {
        setSelectedVehicleId("");
      }
    };

    fetchVehicles();
  }, [selectedClientId, companyId]);

  // Get selected vehicle
  const selectedVehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));

  // Recalculate meters when vehicle changes (mantém o preço do serviço)
  useEffect(() => {
    if (selectedVehicle?.size && detailedItems.length > 0) {
      const updatedItems = detailedItems.map(item => {
        if (item.regionId) {
          const rule = consumptionRules.find(
            r => r.region_id === item.regionId && 
                r.vehicle_size === selectedVehicle.size && 
                r.category === item.category
          );
          const meters = rule?.meters_consumed || item.metersUsed;
          return {
            ...item,
            metersUsed: meters,
            // Mantém totalPrice - preço vem do serviço, não recalcula
          };
        }
        return item;
      });
      setDetailedItems(updatedItems);
    }
  }, [selectedVehicleId, consumptionRules]);

  // Calculate totals - use servicePrice if set, otherwise use calculated subtotal
  const calculatedSubtotal = detailedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotal = servicePrice ? parseFloat(servicePrice) : calculatedSubtotal;
  const discount = discountValue ? parseFloat(discountValue) : 0;
  const total = subtotal - discount;
  const paid = isOpen ? 0 : total;

  // Update service price when calculated subtotal changes (only if not manually set)
  useEffect(() => {
    if (calculatedSubtotal > 0 && !servicePrice) {
      setServicePrice(calculatedSubtotal.toFixed(2));
    }
  }, [calculatedSubtotal]);

  // Handle discount changes
  const handleDiscountValueChange = (value: string) => {
    setDiscountValue(value);
    if (value && subtotal > 0) {
      const percent = (parseFloat(value) / subtotal) * 100;
      setDiscountPercent(percent.toFixed(1));
    } else {
      setDiscountPercent("");
    }
  };

  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercent(value);
    if (value && subtotal > 0) {
      const discValue = (parseFloat(value) / 100) * subtotal;
      setDiscountValue(discValue.toFixed(2));
    } else {
      setDiscountValue("");
    }
  };

  // Add new detailed service item
  const handleAddDetailedItem = () => {
    const newItem: DetailedServiceItem = {
      id: crypto.randomUUID(),
      category: 'INSULFILM' as ProductCategory,
      regionId: null,
      regionName: "",
      productTypeId: null,
      productTypeName: "",
      metersUsed: 0,
      totalPrice: 0,
    };
    setDetailedItems([...detailedItems, newItem]);
  };

  // Update detailed service item
  const handleUpdateDetailedItem = (updatedItem: DetailedServiceItem) => {
    setDetailedItems(prev =>
      prev.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  // Remove detailed service item
  const handleRemoveDetailedItem = (id: string) => {
    setDetailedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedVehicleId || detailedItems.length === 0 || !companyId) {
      toast.error("Preencha cliente, veículo e pelo menos um serviço.");
      return;
    }

    // Validate all items have required fields
    const invalidItems = detailedItems.filter(
      item => !item.regionId || !item.productTypeId || item.metersUsed <= 0
    );
    if (invalidItems.length > 0) {
      toast.error("Preencha todos os campos de cada serviço (região, produto e metros).");
      return;
    }

    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === parseInt(selectedClientId));

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          client_id: parseInt(selectedClientId),
          vehicle_id: parseInt(selectedVehicleId),
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          subtotal,
          discount: discount || 0,
          total,
          payment_method: paymentMethod,
          is_open: isOpen,
          status: isOpen ? 'Aberta' : 'Fechada',
          observations: notes || null,
          company_id: companyId,
          seller_id: user?.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create service_items_detailed
      const serviceItemsData = detailedItems.map(item => ({
        sale_id: sale.id,
        category: item.category,
        product_type_id: item.productTypeId!,
        region_id: item.regionId!,
        meters_used: item.metersUsed,
        unit_price: 0, // Preço unitário não é mais usado
        total_price: item.totalPrice,
        company_id: companyId,
      }));

      const { error: itemsError } = await supabase
        .from('service_items_detailed')
        .insert(serviceItemsData);

      if (itemsError) throw itemsError;

      // Consume stock based on detailed items
      if (selectedVehicle?.size) {
        await consumeStockForDetailedSale(
          sale.id,
          serviceItemsData,
          selectedVehicle.brand,
          selectedVehicle.model,
          selectedVehicle.size,
          companyId,
          user?.id || ''
        );
      }

      // Create financial transaction if sale is closed
      if (!isOpen) {
        await createTransactionFromSale(
          sale.id,
          total,
          selectedClient?.name || 'Cliente',
          paymentMethod,
          format(saleDate, 'yyyy-MM-dd'),
          companyId
        );
      }

      toast.success(`Venda de R$ ${total.toFixed(2)} cadastrada com sucesso!`);

      // Call onSuccess to notify parent components
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setSelectedClientId("");
      setSelectedVehicleId("");
      setDetailedItems([]);
      setDiscountValue("");
      setDiscountPercent("");
      setServicePrice("");
      setNotes("");
      setIsOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error("Erro ao cadastrar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleNewClientCreated = () => {
    setIsNewClientModalOpen(false);
    fetchData();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Cadastrar venda</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar a venda
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Data da Venda *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(saleDate, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={saleDate}
                      onSelect={(date) => date && setSaleDate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {client.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewClientModalOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Novo
                  </Button>
                </div>
              </div>

              {/* Vehicle Selection */}
              {selectedClientId && (
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  {vehicles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cliente não possui veículos cadastrados</p>
                  ) : (
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              {vehicle.brand} {vehicle.model} - {vehicle.plate}
                              {vehicle.size && (
                                <Badge variant="outline" className="ml-2">
                                  {vehicle.size}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Detailed Services Section */}
              {selectedVehicleId && (
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => setShowDetailedServices(!showDetailedServices)}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Serviços Detalhados
                      {detailedItems.length > 0 && (
                        <Badge variant="secondary">{detailedItems.length}</Badge>
                      )}
                    </span>
                    {showDetailedServices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {showDetailedServices && (
                    <div className="space-y-3">
                      {!selectedVehicle?.size && (
                        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                          ⚠️ Veículo sem tamanho (P/M/G) cadastrado. Os metros serão calculados manualmente.
                        </p>
                      )}

                      {detailedItems.map((item) => (
                        <ServiceItemRow
                          key={item.id}
                          item={item}
                          vehicleSize={selectedVehicle?.size || null}
                          productTypes={productTypes}
                          vehicleRegions={vehicleRegions}
                          consumptionRules={consumptionRules}
                          onUpdate={handleUpdateDetailedItem}
                          onRemove={handleRemoveDetailedItem}
                        />
                      ))}

                      <Button
                        variant="outline"
                        className="w-full gap-2 border-dashed"
                        onClick={handleAddDetailedItem}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Região / Serviço
                      </Button>

                      {detailedItems.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <span className="text-sm text-muted-foreground">
                            Subtotal serviços:{" "}
                            <span className="font-semibold text-foreground">
                              R$ {subtotal.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Débito">Débito</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service Price - NEW FIELD */}
              <div className="space-y-2">
                <Label>Preço do Serviço (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9"
                    value={servicePrice}
                    onChange={(e) => {
                      setServicePrice(e.target.value);
                      // Reset discount when price changes
                      if (e.target.value) {
                        const newSubtotal = parseFloat(e.target.value);
                        if (discountPercent) {
                          const discValue = (parseFloat(discountPercent) / 100) * newSubtotal;
                          setDiscountValue(discValue.toFixed(2));
                        }
                      }
                    }}
                  />
                </div>
                {calculatedSubtotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Valor calculado: R$ {calculatedSubtotal.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label>Desconto</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0,00"
                      className="pl-9"
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-9"
                      value={discountPercent}
                      onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Toggle Open Sale */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Essa venda ficará em aberto?</Label>
                  <p className="text-sm text-muted-foreground">
                    {isOpen ? "Gera conta a receber" : "Paga agora"}
                  </p>
                </div>
                <Switch checked={isOpen} onCheckedChange={setIsOpen} />
              </div>

              {/* Notes */}
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Observações
                  </span>
                  {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showNotes && (
                  <Textarea
                    placeholder="Observações sobre a venda (máx. 4000 caracteres)"
                    className="mt-2"
                    maxLength={4000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                )}
              </div>

              {/* Live Summary */}
              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Resumo da venda</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-info" />
                      Data da venda
                    </span>
                    <span>{format(saleDate, "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4 text-info" />
                      Serviços
                    </span>
                    <span>{detailedItems.length} item(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Sub-total
                    </span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Desconto
                    </span>
                    <span className="text-destructive">- R$ {discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      Valor total
                    </span>
                    <span className="text-success">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-info" />
                      Valor pago
                    </span>
                    <span>R$ {paid.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full" disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogContent>
      </Dialog>

      <NewClientModal
        open={isNewClientModalOpen}
        onOpenChange={setIsNewClientModalOpen}
        onClientCreated={handleNewClientCreated}
      />
    </>
  );
};

export default NewSaleModal;
