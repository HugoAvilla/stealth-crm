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
import { Car } from "lucide-react";
import { Vehicle } from "@/lib/mockData";
import { toast } from "@/hooks/use-toast";

interface NewVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehicleCreated: (vehicle: Vehicle) => void;
  editVehicle?: Vehicle | null;
}

const brands = [
  "Volkswagen",
  "Fiat",
  "Chevrolet",
  "Ford",
  "Toyota",
  "Honda",
  "Hyundai",
  "Renault",
  "Nissan",
  "Jeep",
  "BMW",
  "Mercedes",
  "Audi",
  "Porsche",
  "Land Rover",
  "Mitsubishi",
  "Peugeot",
  "Citroën",
  "Kia",
  "Outro",
];

const NewVehicleModal = ({ open, onOpenChange, onVehicleCreated, editVehicle }: NewVehicleModalProps) => {
  const [plate, setPlate] = useState(editVehicle?.plate || "");
  const [brand, setBrand] = useState(editVehicle?.brand || "");
  const [model, setModel] = useState(editVehicle?.model || "");
  const [year, setYear] = useState(editVehicle?.year?.toString() || "");
  const [size, setSize] = useState<"P" | "M" | "G" | "">(editVehicle?.size || "");

  // Reset form when editVehicle changes
  useState(() => {
    if (editVehicle) {
      setPlate(editVehicle.plate);
      setBrand(editVehicle.brand);
      setModel(editVehicle.model);
      setYear(editVehicle.year.toString());
      setSize(editVehicle.size);
    }
  });

  const formatPlate = (value: string) => {
    // Accept both old format (ABC-1234) and Mercosul (ABC1D23)
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    
    if (clean.length <= 3) return clean;
    
    // Check if it's Mercosul format (letter at position 5)
    if (clean.length >= 5 && /[A-Z]/.test(clean[4])) {
      return clean;
    }
    
    // Old format with hyphen
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  };

  const handleSubmit = () => {
    if (!plate.trim() || !brand || !model.trim() || !year || !size) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do veículo.",
        variant: "destructive",
      });
      return;
    }

    const vehicle: Vehicle = {
      id: 0, // Will be set by parent
      plate: plate.toUpperCase(),
      brand,
      model,
      year: parseInt(year),
      size,
    };

    onVehicleCreated(vehicle);

    // Reset form
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setSize("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/20">
              <Car className="h-5 w-5 text-info" />
            </div>
            <div>
              <DialogTitle>Adicionar veículo</DialogTitle>
              <DialogDescription>
                Preencha os dados do veículo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plate */}
          <div className="space-y-2">
            <Label>Placa *</Label>
            <Input
              placeholder="ABC-1234 ou ABC1D23"
              value={plate}
              onChange={(e) => setPlate(formatPlate(e.target.value))}
              className="uppercase"
            />
          </div>

          {/* Brand */}
          <div className="space-y-2">
            <Label>Marca *</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Modelo *</Label>
            <Input
              placeholder="Ex: Corolla XEi"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          {/* Year */}
          <div className="space-y-2">
            <Label>Ano *</Label>
            <Input
              type="number"
              placeholder="2024"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value.slice(0, 4))}
            />
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label>Tamanho do Carro *</Label>
            <Select value={size} onValueChange={(v) => setSize(v as "P" | "M" | "G")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o porte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P">P - Hatch pequeno</SelectItem>
                <SelectItem value="M">M - Sedan / Hatch médio</SelectItem>
                <SelectItem value="G">G - SUV / Pickup / Van</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O porte é usado para cálculo de consumo de materiais
            </p>
          </div>
        </div>

        {/* Footer */}
        <Button onClick={handleSubmit} className="w-full">
          Salvar veículo
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default NewVehicleModal;
