import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Plus, 
  Minus,
  Car,
  Pencil,
  Trash2
} from "lucide-react";
import { Client, Vehicle } from "@/lib/mockData";
import NewVehicleModal from "@/components/vendas/NewVehicleModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSave: () => void;
}

const originOptions = ['Instagram', 'Google', 'Indicação', 'Passante'] as const;

export function EditClientModal({
  open,
  onOpenChange,
  client,
  onSave,
}: EditClientModalProps) {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const [cpf, setCpf] = useState(client.cpf || '');
  const [origem, setOrigem] = useState<typeof originOptions[number]>(client.origem);
  const [vehicles, setVehicles] = useState<Vehicle[]>(client.vehicles);
  
  // Field visibility
  const [showCpf, setShowCpf] = useState(!!client.cpf);
  const [showEmail, setShowEmail] = useState(!!client.email);
  const [showOrigem, setShowOrigem] = useState(true);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `+${numbers}`;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleAddVehicle = (vehicle: Vehicle) => {
    if (editingVehicle) {
      setVehicles(vehicles.map(v => v.id === editingVehicle.id ? vehicle : v));
      setEditingVehicle(null);
    } else {
      setVehicles([...vehicles, { ...vehicle, id: Date.now() }]);
    }
    setShowVehicleModal(false);
  };

  const handleRemoveVehicle = (vehicleId: number) => {
    setVehicles(vehicles.filter(v => v.id !== vehicleId));
  };

  const handleSave = async () => {
    try {
      const updateData = {
        name,
        phone,
        email: email || null,
        cpf_cnpj: cpf || null,
        origem,
      };

      const { error: clientError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', client.id);

      if (clientError) throw clientError;

      const existingVehicleIds = client.vehicles.map(v => v.id);
      const currentVehicleIds = vehicles.map(v => v.id);
      
      const removedIds = existingVehicleIds.filter(id => !currentVehicleIds.includes(id));
      
      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('vehicles')
          .delete()
          .in('id', removedIds);
        if (deleteError) throw deleteError;
      }

      for (const vehicle of vehicles) {
        if (existingVehicleIds.includes(vehicle.id)) {
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
              size: vehicle.size,
            })
            .eq('id', vehicle.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('vehicles')
            .insert({
              client_id: client.id,
              company_id: (client as any).company_id,
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
              size: vehicle.size,
            });
          if (insertError) throw insertError;
        }
      }

      onSave();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <User className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Editar cliente</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Atualize os dados do cliente
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="bg-background border-border focus:border-primary"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  WhatsApp <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+55 (00) 00000-0000"
                  className="bg-background border-border focus:border-primary"
                />
              </div>

              {/* Vehicles */}
              <div className="space-y-2">
                <Label className="text-foreground">Veículos</Label>
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
                    >
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.year} • {vehicle.plate}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setShowVehicleModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => {
                      setEditingVehicle(null);
                      setShowVehicleModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo veículo
                  </Button>
                </div>
              </div>

              {/* Field Toggles */}
              <div className="flex flex-wrap gap-2 py-2">
                <Badge
                  variant="secondary"
                  className={`cursor-pointer ${showCpf ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setShowCpf(!showCpf)}
                >
                  {showCpf ? <Minus className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  CPF
                </Badge>
                <Badge
                  variant="secondary"
                  className={`cursor-pointer ${showEmail ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setShowEmail(!showEmail)}
                >
                  {showEmail ? <Minus className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  E-mail
                </Badge>
                <Badge
                  variant="secondary"
                  className={`cursor-pointer ${showOrigem ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                  onClick={() => setShowOrigem(!showOrigem)}
                >
                  {showOrigem ? <Minus className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Origem
                </Badge>
              </div>

              {/* Conditional Fields */}
              {showCpf && (
                <div className="space-y-2">
                  <Label className="text-foreground">CPF</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="bg-background border-border focus:border-primary"
                  />
                </div>
              )}

              {showEmail && (
                <div className="space-y-2">
                  <Label className="text-foreground">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="bg-background border-border focus:border-primary"
                  />
                </div>
              )}

              {showOrigem && (
                <div className="space-y-2">
                  <Label className="text-foreground">Origem</Label>
                  <Select value={origem} onValueChange={(v) => setOrigem(v as typeof originOptions[number])}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {originOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex-shrink-0">
            <Button
              onClick={handleSave}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!name || !phone}
            >
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NewVehicleModal
        open={showVehicleModal}
        onOpenChange={setShowVehicleModal}
        onVehicleCreated={handleAddVehicle}
        editVehicle={editingVehicle}
      />
    </>
  );
}
