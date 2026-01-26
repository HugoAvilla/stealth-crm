import { useState } from "react";
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
import { clients, services, users, Client, Service } from "@/lib/mockData";
import NewClientModal from "@/components/vendas/NewClientModal";
import { toast } from "@/hooks/use-toast";

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewSaleModal = ({ open, onOpenChange }: NewSaleModalProps) => {
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [discountValue, setDiscountValue] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [notifyOnDue, setNotifyOnDue] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Calculate totals
  const subtotal = selectedServices.reduce((sum, serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return sum + (service?.price || 0);
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

  const handleSubmit = () => {
    if (!selectedClient || !selectedVehicleId || selectedServices.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, veículo e pelo menos um serviço.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Venda cadastrada!",
      description: `Venda de R$ ${total.toFixed(2)} para ${selectedClient.name} registrada com sucesso.`,
    });

    // Reset form
    setSelectedClient(null);
    setSelectedVehicleId(null);
    setSelectedServices([]);
    setDiscountValue("");
    setDiscountPercent("");
    setNotes("");
    setIsOpen(false);
    onOpenChange(false);
  };

  const handleNewClientCreated = (client: Client) => {
    setSelectedClient(client);
    if (client.vehicles.length > 0) {
      setSelectedVehicleId(client.vehicles[0].id);
    }
    setIsNewClientModalOpen(false);
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
                <Select
                  value={selectedClient?.id.toString() || ""}
                  onValueChange={(value) => {
                    const client = clients.find((c) => c.id.toString() === value);
                    setSelectedClient(client || null);
                    setSelectedVehicleId(null);
                  }}
                >
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

            {/* Vehicle Selection (when client selected) */}
            {selectedClient && selectedClient.vehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select
                  value={selectedVehicleId?.toString() || ""}
                  onValueChange={(value) => setSelectedVehicleId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClient.vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          {vehicle.brand} {vehicle.model} - {vehicle.plate}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {/* Employee */}
            <div className="space-y-2">
              <Label>Funcionário (opcional)</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Expandable Sections */}
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
                {showNotes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
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
                {showServices ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {showServices && (
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                  {services.map((service) => (
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
                        R$ {service.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
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

              {isOpen && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Checkbox
                    id="notify"
                    checked={notifyOnDue}
                    onCheckedChange={(checked) => setNotifyOnDue(!!checked)}
                  />
                  <Label htmlFor="notify" className="text-sm text-muted-foreground cursor-pointer">
                    Notificar quando chegar dia de cobrar
                  </Label>
                </div>
              )}
            </Card>
          </div>

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full">
            Adicionar
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
