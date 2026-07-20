/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect } from "react";
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
  const [width, setWidth] = useState("");
  const [batch, setBatch] = useState("");
  const [costPerMeter, setCostPerMeter] = useState("");
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

  // Fetch existing material to check width
  const { data: existingMaterial } = useQuery({
    queryKey: ['existing-material-width', selectedProductTypeId, isOpenRoll, batch, companyId, productTypes],
    queryFn: async () => {
      if (!selectedProductTypeId || !companyId || !productTypes) return null;

      const selectedProduct = productTypes.find(p => p.id === parseInt(selectedProductTypeId));
      if (!selectedProduct) return null;

      let materialNameBase = `${selectedProduct.brand ? selectedProduct.brand + ' ' : ''}${selectedProduct.name}`;
      if (batch.trim()) {
        materialNameBase += ` - Lote ${batch.trim()}`;
      }
      const materialName = isOpenRoll ? `${materialNameBase} (Aberta)` : materialNameBase;

      const { data, error } = await supabase
        .from("materials")
        .select("id, width, current_stock")
        .eq("product_type_id", parseInt(selectedProductTypeId))
        .eq("company_id", companyId)
        .eq("is_open_roll", isOpenRoll)
        .eq("name", materialName)
        .maybeSingle();

      if (error) {
        console.error("Error fetching existing material:", error);
        return null;
      }
      return data;
    },
    enabled: !!selectedProductTypeId && !!companyId && !!productTypes && open,
  });

  // Update width when existing material is loaded
  useEffect(() => {
    if (existingMaterial) {
      if (existingMaterial.width) {
        setWidth(existingMaterial.width.toString());
      } else {
        setWidth("1.52");
      }
    } else {
      setWidth("");
    }
  }, [existingMaterial]);

  const insulfilmProducts = productTypes?.filter(p => p.category === 'INSULFILM') || [];
  const ppfProducts = productTypes?.filter(p => p.category === 'PPF') || [];

  const handleSubmit = async () => {
    if (!selectedProductTypeId) {
      toast.error("Selecione um tipo de produto");
      return;
    }

    if (!user?.id || !companyId) {
      toast.error("UsuÃ¡rio nÃ£o autenticado");
      return;
    }

    setLoading(true);

    try {
      const selectedProduct = productTypes?.find(p => p.id === parseInt(selectedProductTypeId));
      if (!selectedProduct) {
        toast.error("Produto nÃ£o encontrado");
        return;
      }

      // Check if material already exists for this product type and roll state (active or inactive)
      let materialNameBase = `${selectedProduct.brand ? selectedProduct.brand + ' ' : ''}${selectedProduct.name}`;
      if (batch.trim()) {
        materialNameBase += ` - Lote ${batch.trim()}`;
      }
      const materialName = isOpenRoll ? `${materialNameBase} (Aberta)` : materialNameBase;

      const { data: existingMaterial } = await supabase
        .from("materials")
        .select("id, is_active, width")
        .eq("product_type_id", selectedProduct.id)
        .eq("company_id", companyId)
        .eq("is_open_roll", isOpenRoll)
        .eq("name", materialName)
        .maybeSingle();

      // ValidaÃ§Ã£o inteligente de largura: obrigatÃ³ria apenas no primeiro cadastro de rolo do tipo "Metros"
      if (unit === "Metros" && !existingMaterial) {
        if (!width || parseFloat(width) <= 0) {
          toast.error("A largura da bobina Ã© obrigatÃ³ria para o primeiro cadastro deste material");
          setLoading(false);
          return;
        }
      }

      let error;

      if (existingMaterial) {
        // Update the existing material with new stock values (keeping or adjusting the width)
        const { error: updateError } = await supabase
          .from("materials")
          .update({
            name: materialName,
            type: selectedProduct.category,
            brand: selectedProduct.brand,
            unit,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            current_stock: isOpenRoll ? 0 : (currentStock ? parseFloat(currentStock) : 0),
            average_cost: costPerMeter ? parseFloat(costPerMeter.toString().replace(',', '.')) : 0,
            product_type_id: selectedProduct.id,
            is_active: true,
            is_open_roll: isOpenRoll,
            width: unit === "Metros" ? (width ? parseFloat(width) : (existingMaterial.width || 1.52)) : null,
          })
          .eq("id", existingMaterial.id);
        error = updateError;
      } else {
        // Create new material
        const initialQty = currentStock && parseFloat(currentStock) > 0 ? parseFloat(currentStock) : 0;

        // Se for metros e tiver estoque inicial, inserimos com 0 e criamos a bobina via RPC depois para sincronizar com material_rolls
        const stockToInsert = (unit === "Metros" && initialQty > 0) ? 0 : initialQty;

        const { data: newMaterial, error: insertError } = await supabase
          .from("materials")
          .insert({
            name: materialName,
            type: selectedProduct.category,
            brand: selectedProduct.brand,
            unit,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            current_stock: stockToInsert,
            average_cost: costPerMeter ? parseFloat(costPerMeter.toString().replace(',', '.')) : 0,
            company_id: companyId,
            product_type_id: selectedProduct.id,
            is_active: true,
            is_open_roll: isOpenRoll,
            width: unit === "Metros" ? (width ? parseFloat(width) : 1.52) : null,
          })
          .select()
          .single();

        if (insertError) {
          error = insertError;
        } else if (unit === "Metros" && initialQty > 0 && newMaterial) {
          // Criar a bobina fÃ­sica correspondente ao estoque inicial
          const { error: rpcError } = await supabase.rpc("add_material_roll", {
            p_material_id: newMaterial.id,
            p_length: initialQty,
            p_status: "fechada",
            p_notes: "Estoque inicial (cadastro de material)",
            p_user_id: user.id,
            p_company_id: companyId,
          });
          error = rpcError;
        }
      }

      if (error) throw error;

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error creating material:", error);
      const e = error as any;
      toast.error(`Erro ao cadastrar material: ${e?.message || e?.details || JSON.stringify(e)}`);
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
    setWidth("");
    setBatch("");
    setCostPerMeter("");
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
            <Label>Tipo de Material *</Label>
            <Select value={selectedProductTypeId} onValueChange={setSelectedProductTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o material..." />
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
                    Cadastre primeiro na aba "Tipos de Materiais".
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
            <Select value={isOpenRoll ? "Aberta" : "Nova"} onValueChange={(v) => {
              const open = v === "Aberta";
              setIsOpenRoll(open);
              if (open) {
                setCurrentStock("");
                setMinStock("");
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nova">Nova</SelectItem>
                <SelectItem value="Aberta">Aberta</SelectItem>
              </SelectContent>
            </Select>
            {isOpenRoll && (
              <p className="text-[11px] text-muted-foreground">
                Bobina aberta nÃ£o possui estoque inicial nem mÃ­nimo. O consumo serÃ¡ acumulado atÃ© o encerramento.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lote</Label>
              <Input
                placeholder="Ex: A001, B002"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Custo / Metro (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50.00"
                value={costPerMeter}
                onChange={(e) => setCostPerMeter(e.target.value)}
              />
            </div>
          </div>

          {!isOpenRoll && (
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
                <Label>Estoque MÃ­nimo</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
            </div>
          )}

          {unit === "Metros" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Largura da Bobina (m)
                {existingMaterial ? (
                  <span className="text-[10px] text-muted-foreground font-normal">(Opcional - JÃ¡ cadastrado)</span>
                ) : (
                  <span className="text-[10px] text-red-500 font-semibold">* ObrigatÃ³rio</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 1.52, 0.60, 1.00"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                {existingMaterial
                  ? "Bobina jÃ¡ existente. Deixe como estÃ¡ ou altere se for necessÃ¡rio."
                  : "Por ser o primeiro rolo deste tipo, informe a largura fÃ­sica real."}
              </p>
            </div>
          )}

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

