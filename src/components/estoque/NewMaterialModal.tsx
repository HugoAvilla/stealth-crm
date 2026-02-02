import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface NewMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewMaterialModal({ open, onOpenChange, onSuccess }: NewMaterialModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [minStock, setMinStock] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !unit) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        toast.error("Empresa não encontrada");
        return;
      }

      const { error } = await supabase.from("materials").insert({
        name,
        type: type || null,
        brand: brand || null,
        unit,
        minimum_stock: minStock ? parseFloat(minStock) : 0,
        current_stock: currentStock ? parseFloat(currentStock) : 0,
        average_cost: costPerUnit ? parseFloat(costPerUnit) : 0,
        company_id: profile.company_id,
        is_active: true,
      });

      if (error) throw error;

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating material:", error);
      toast.error("Erro ao cadastrar material");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setType("");
    setBrand("");
    setUnit("");
    setMinStock("");
    setCurrentStock("");
    setCostPerUnit("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Material *</Label>
            <Input
              placeholder="Ex: Película PPF Metro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPF">PPF</SelectItem>
                  <SelectItem value="Vitrificação">Vitrificação</SelectItem>
                  <SelectItem value="Polimento">Polimento</SelectItem>
                  <SelectItem value="Insulfilm">Insulfilm</SelectItem>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                  <SelectItem value="Acessórios">Acessórios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                placeholder="Ex: 3M"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unidades">Unidades</SelectItem>
                <SelectItem value="Metros">Metros</SelectItem>
                <SelectItem value="Litros">Litros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estoque Inicial</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo Unitário (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
