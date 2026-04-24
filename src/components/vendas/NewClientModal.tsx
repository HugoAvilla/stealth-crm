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
  CalendarIcon,
  Trash2,
  Edit2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NewVehicleModal from "@/components/vendas/NewVehicleModal";
import PhoneInputWithDDI from "@/components/ui/PhoneInputWithDDI";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  size: 'P' | 'M' | 'G';
}

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client?: any) => void;
}

import { ORIGIN_OPTIONS, ClientOrigin } from "@/constants/origins";

const NewClientModal = ({ open, onOpenChange, onClientCreated }: NewClientModalProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Required fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Optional fields
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [origem, setOrigem] = useState<ClientOrigin | "">("");
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

  // Keep formatPhone for potential other uses, but phone input now uses PhoneInputWithDDI

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    } else {
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

    if (numbers.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setState(data.uf || "");
          setCity(data.localidade || "");
          setNeighborhood(data.bairro || "");
          setStreet(data.logradouro || "");
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      }
    }
  };

  const handleVehicleCreated = (vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, { ...vehicle, id: Date.now() }]);
    setIsVehicleModalOpen(false);
  };

  const removeVehicle = (vehicleId: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  };

  const resetForm = () => {
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

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Create client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: name.trim(),
          phone: phone,
          email: email || null,
          cpf_cnpj: cpf || null,
          origem: origem || 'Passante',
          birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
          cep: cep || null,
          state: state || null,
          city: city || null,
          neighborhood: neighborhood || null,
          street: street || null,
          number: number || null,
          complement: complement || null,
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create vehicles if any
      if (vehicles.length > 0 && newClient) {
        const vehiclesData = vehicles.map(v => ({
          brand: v.brand,
          model: v.model,
          year: v.year,
          plate: v.plate,
          size: v.size,
          client_id: newClient.id,
          company_id: profile.company_id,
        }));

        const { error: vehiclesError } = await supabase
          .from('vehicles')
          .insert(vehiclesData);

        if (vehiclesError) {
          console.error('Error creating vehicles:', vehiclesError);
        }
      }

      toast.success(`${name} foi adicionado com sucesso!`);
      resetForm();
      onClientCreated(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error("Erro ao cadastrar cliente");
    } finally {
      setSaving(false);
    }
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
                <PhoneInputWithDDI
                  value={phone}
                  onChange={setPhone}
                />
              </div>
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
                  <Select value={origem} onValueChange={(v) => setOrigem(v as ClientOrigin)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGIN_OPTIONS.map((opt) => (
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
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
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
            {/* Vehicles Section */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Car className="h-5 w-5 text-primary" />
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
                <Card className="p-4 text-center text-muted-foreground border-dashed bg-muted/30">
                  Nenhum veículo cadastrado
                  <p className="text-xs text-muted-foreground mt-1">Adicione pelo menos um veículo se o cliente tiver frota</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
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
          </div>

          {/* Footer */}
          <Button onClick={handleSubmit} className="w-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar'}
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
