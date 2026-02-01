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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  CalendarIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Percent,
  User,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { consumeStockForSale, createTransactionFromSale } from "@/lib/stockConsumption";
import NewClientModal from "@/components/vendas/NewClientModal";
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

interface Service {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
}

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewSaleModal = ({ open, onOpenChange }: NewSaleModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [discountValue, setDiscountValue] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user?.id]);

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

      const [clientsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('company_id', profile.company_id).order('name'),
        supabase.from('services').select('id, name, base_price, description').eq('company_id', profile.company_id).eq('is_active', true).order('name'),
      ]);

      setClients(clientsRes.data || []);
      setServices(servicesRes.data || []);
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
      setSelectedVehicleId("");
    };

    fetchVehicles();
  }, [selectedClientId, companyId]);

  // Calculate totals
  const subtotal = selectedServices.reduce((sum, serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return sum + (service?.base_price || 0);
  }, 0);

  const discount = discountValue ? parseFloat(discountValue) : 0;
  const total = subtotal - discount;
  const paid = isOpen ? 0 : total;

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

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedVehicleId || selectedServices.length === 0 || !companyId) {
      toast.error("Preencha cliente, veículo e pelo menos um serviço.");
      return;
    }

    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === parseInt(selectedClientId));
      const selectedVehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));

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

      // Create sale items
      const saleItems = selectedServices.map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return {
          sale_id: sale.id,
          service_id: serviceId,
          unit_price: service?.base_price || 0,
          quantity: 1,
          total_price: service?.base_price || 0,
          company_id: companyId,
        };
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Consume stock based on vehicle size
      if (selectedVehicle?.size) {
        await consumeStockForSale(
          sale.id,
          parseInt(selectedVehicleId),
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

      // Reset form
      setSelectedClientId("");
      setSelectedVehicleId("");
      setSelectedServices([]);
      setDiscountValue("");
      setDiscountPercent("");
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

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

              {/* Services */}
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowServices(!showServices)}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Serviços
                    {selectedServices.length > 0 && (
                      <Badge variant="secondary">{selectedServices.length}</Badge>
                    )}
                  </span>
                  {showServices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showServices && (
                  <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                    {services.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço cadastrado</p>
                    ) : (
                      services.map((service) => (
                        <div
                          key={service.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                            selectedServices.includes(service.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/50"
                          )}
                          onClick={() => handleServiceToggle(service.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedServices.includes(service.id)}
                              onCheckedChange={() => handleServiceToggle(service.id)}
                            />
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {service.description}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold">
                            R$ {service.base_price.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
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
