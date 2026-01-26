import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Plus,
  X,
  CalendarIcon,
  Trash2,
  Edit2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Client, Vehicle } from "@/lib/mockData";
import { toast } from "@/hooks/use-toast";
import NewVehicleModal from "@/components/vendas/NewVehicleModal";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

const originOptions = ["Instagram", "Google", "Indicação", "Passante"] as const;

const NewClientModal = ({ open, onOpenChange, onClientCreated }: NewClientModalProps) => {
  // Required fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Optional fields
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [origem, setOrigem] = useState<typeof originOptions[number] | "">("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Address fields
  const [cep, setCep] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");

  // Field visibility tags
  const [visibleFields, setVisibleFields] = useState<Set<string>>(
    new Set(["cpf", "email", "origem"])
  );

  // Vehicle modal
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const availableFields = [
    { id: "cpf", label: "CPF/CNPJ" },
    { id: "email", label: "E-mail" },
    { id: "origem", label: "Origem" },
    { id: "birthDate", label: "Data de nascimento" },
    { id: "address", label: "Endereço" },
    { id: "observations", label: "Observações" },
  ];

  const toggleField = (fieldId: string) => {
    const newVisible = new Set(visibleFields);
    if (newVisible.has(fieldId)) {
      newVisible.delete(fieldId);
    } else {
      newVisible.add(fieldId);
    }
    setVisibleFields(newVisible);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      // CPF
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    } else {
      // CNPJ
      const cnpj = numbers.slice(0, 14);
      if (cnpj.length <= 2) return cnpj;
      if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
      if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
      if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    }
  };

  const handleCepChange = async (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 8);
    const formatted = numbers.length > 5 ? `${numbers.slice(0, 5)}-${numbers.slice(5)}` : numbers;
    setCep(formatted);

    // Auto-fill address (simulated)
    if (numbers.length === 8) {
      // In production, call ViaCEP API
      setState("SP");
      setCity("São Paulo");
      setNeighborhood("Centro");
      setStreet("Rua Exemplo");
    }
  };

  const handleVehicleCreated = (vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, { ...vehicle, id: Date.now() }]);
    setIsVehicleModalOpen(false);
  };

  const removeVehicle = (vehicleId: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e WhatsApp são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newClient: Client = {
      id: Date.now(),
      name: name.trim(),
      phone: `+55 ${phone}`,
      email: email || "",
      cpf: cpf || null,
      origem: origem as Client["origem"] || "Passante",
      created_at: new Date().toISOString().split("T")[0],
      vehicles,
      total_spent: 0,
      sales_count: 0,
    };

    toast({
      title: "Cliente cadastrado!",
      description: `${newClient.name} foi adicionado com sucesso.`,
    });

    onClientCreated(newClient);

    // Reset form
    setName("");
    setPhone("");
    setEmail("");
    setCpf("");
    setOrigem("");
    setBirthDate(undefined);
    setVehicles([]);
    setCep("");
    setState("");
    setCity("");
    setNeighborhood("");
    setStreet("");
    setNumber("");
    setComplement("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/20">
                <User className="h-5 w-5 text-info" />
              </div>
              <div>
                <DialogTitle>Novo cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar o cliente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome completo *
                </Label>
                <Input
                  placeholder="Nome do cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp *
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                    +55
                  </span>
                  <Input
                    placeholder="(17) 99999-9999"
                    className="rounded-l-none"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Vehicles Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Gestão de Frota
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Novo veículo
                </Button>
              </div>

              {vehicles.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  Nenhum veículo cadastrado
                </Card>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.plate} • {vehicle.year} • Porte {vehicle.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVehicle(vehicle.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Field Toggle Tags */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Dados cadastrais</Label>
              <div className="flex flex-wrap gap-2">
                {availableFields.map((field) => (
                  <Badge
                    key={field.id}
                    variant={visibleFields.has(field.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleField(field.id)}
                  >
                    {visibleFields.has(field.id) ? "-" : "+"} {field.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Optional Fields based on visibility */}
            <div className="space-y-4">
              {visibleFields.has("cpf") && (
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                  />
                </div>
              )}

              {visibleFields.has("email") && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              {visibleFields.has("origem") && (
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={origem} onValueChange={(v) => setOrigem(v as typeof originOptions[number])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {originOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {visibleFields.has("birthDate") && (
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {birthDate
                          ? format(birthDate, "PPP", { locale: ptBR })
                          : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {visibleFields.has("address") && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">CEP</Label>
                      <Input
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Estado</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Bairro</Label>
                      <Input
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Rua</Label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Número</Label>
                      <Input value={number} onChange={(e) => setNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Complemento</Label>
                      <Input
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full">
            Adicionar
          </Button>
        </DialogContent>
      </Dialog>

      <NewVehicleModal
        open={isVehicleModalOpen}
        onOpenChange={setIsVehicleModalOpen}
        onVehicleCreated={handleVehicleCreated}
      />
    </>
  );
};

export default NewClientModal;
