import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface NewMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  cost_per_meter: number | null;
}

export function NewMaterialModal({ open, onOpenChange, onSuccess }: NewMaterialModalProps) {
  const { user } = useAuth();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [unit, setUnit] = useState("Metros");
  const [minStock, setMinStock] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [isOpenRoll, setIsOpenRoll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Fetch company ID
  const { data: profile } = useQuery({
    queryKey: ['profile-for-material', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch product types for the select
  const { data: productTypes } = useQuery({
    queryKey: ['product-types-for-select', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('product_types')
        .select('id, category, brand, name, model, light_transmission, cost_per_meter')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('category')
        .order('brand')
        .order('name');
      if (error) throw error;
      return data as ProductType[];
    },
    enabled: !!companyId && open,
  });

  const insulfilmProducts = productTypes?.filter(p => p.category === 'INSULFILM') || [];
  const ppfProducts = productTypes?.filter(p => p.category === 'PPF') || [];

  const handleSubmit = async () => {
    if (!selectedProductTypeId) {
      toast.error("Selecione um tipo de produto");
      return;
    }

    if (!user?.id || !companyId) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);

    try {
      const selectedProduct = productTypes?.find(p => p.id === parseInt(selectedProductTypeId));
      if (!selectedProduct) {
        toast.error("Produto não encontrado");
        return;
      }

      // Check if material already exists for this product type and roll state (active or inactive)
      const { data: existingMaterial } = await supabase
        .from("materials")
        .select("id, is_active")
        .eq("product_type_id", selectedProduct.id)
        .eq("company_id", companyId)
        .eq("is_open_roll", isOpenRoll)
        .maybeSingle();

      const materialNameBase = `${selectedProduct.brand ? selectedProduct.brand + ' ' : ''}${selectedProduct.name}${selectedProduct.model ? ` - ${selectedProduct.model}` : ''}`;
      const materialName = isOpenRoll ? `${materialNameBase} (Aberta)` : materialNameBase;

      let error;

      if (existingMaterial) {
        // Update the existing material (auto-created or previously inactive) with new values
        const { error: updateError } = await supabase
          .from("materials")
          .update({
            name: materialName,
            type: selectedProduct.category,
            brand: selectedProduct.brand,
            unit,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            current_stock: isOpenRoll ? 0 : (currentStock ? parseFloat(currentStock) : 0),
            average_cost: selectedProduct.cost_per_meter || 0,
            product_type_id: selectedProduct.id,
            is_active: true,
            is_open_roll: isOpenRoll,
          })
          .eq("id", existingMaterial.id);
        error = updateError;
      } else {
        // Create new material
        const { error: insertError } = await supabase.from("materials").insert({
          name: materialName,
          type: selectedProduct.category,
          brand: selectedProduct.brand,
          unit,
          minimum_stock: minStock ? parseFloat(minStock) : 0,
          current_stock: isOpenRoll ? 0 : (currentStock ? parseFloat(currentStock) : 0),
          average_cost: selectedProduct.cost_per_meter || 0,
          company_id: companyId,
          product_type_id: selectedProduct.id,
          is_active: true,
          is_open_roll: isOpenRoll,
        });
        error = insertError;
      }

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
    setSelectedProductTypeId("");
    setUnit("Metros");
    setMinStock("");
    setCurrentStock("");
    setIsOpenRoll(false);
  };

  const formatProductLabel = (product: ProductType) => {
    let label = product.brand ? `${product.brand} ${product.name}` : product.name;
    if (product.light_transmission) label += ` (${product.light_transmission})`;
    if (product.model) label += ` - ${product.model}`;
    return label;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Produto *</Label>
            <Select value={selectedProductTypeId} onValueChange={setSelectedProductTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {insulfilmProducts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>INSULFILM</SelectLabel>
                    {insulfilmProducts.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {formatProductLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {insulfilmProducts.length > 0 && ppfProducts.length > 0 && <SelectSeparator />}
                {ppfProducts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>PPF</SelectLabel>
                    {ppfProducts.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {formatProductLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {!insulfilmProducts.length && !ppfProducts.length && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Nenhum tipo de produto cadastrado.
                    <br />
                    Cadastre primeiro na aba "Tipos de Produtos".
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Metros">Metros</SelectItem>
                <SelectItem value="Unidades">Unidades</SelectItem>
                <SelectItem value="Litros">Litros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado da Bobina</Label>
            <Select value={isOpenRoll ? "Aberta" : "Nova"} onValueChange={(v) => setIsOpenRoll(v === "Aberta")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nova">Nova</SelectItem>
                <SelectItem value="Aberta">Aberta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estoque Inicial</Label>
              <Input
                type="number"
                placeholder="0"
                value={isOpenRoll ? "0" : currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                disabled={isOpenRoll}
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
