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
  const [source, setSource] = useState<"principal" | "aproveitamento">("principal");
  const [rollStatus, setRollStatus] = useState<"fechada" | "aberta">("fechada");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("Retalho útil");
  const [width, setWidth] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Fetch existing material to check width — filtro por product_type_id + width
  const { data: existingMaterial } = useQuery({
    queryKey: ['existing-material-width', selectedProductTypeId, companyId, width],
    queryFn: async () => {
      if (!selectedProductTypeId || !companyId) return null;
      const parsedWidth = width ? parseFloat(width) : null;
      
      // Busca material com mesmo product_type_id e mesma largura
      let query = supabase
        .from("materials")
        .select("id, width, current_stock, name")
        .eq("product_type_id", parseInt(selectedProductTypeId))
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (parsedWidth !== null) {
        query = query.eq("width", parsedWidth);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error("Error fetching existing material:", error);
        return null;
      }
      return data;
    },
    enabled: !!selectedProductTypeId && !!companyId && open && !!width,
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

    const lengthVal = currentStock ? parseFloat(currentStock) : 0;
    if (source === "principal" && lengthVal <= 0) {
      toast.error("Informe o comprimento da bobina");
      return;
    }

    if (unit === "Metros" && (!width || parseFloat(width) <= 0)) {
      toast.error("A largura é obrigatória");
      return;
    }

    setLoading(true);

    try {
      const selectedProduct = productTypes?.find(p => p.id === parseInt(selectedProductTypeId));
      if (!selectedProduct) {
        toast.error("Produto não encontrado");
        return;
      }

      // Check if material already exists for this product type + width
      const parsedWidth = unit === "Metros" ? (width ? parseFloat(width) : 1.52) : null;
      let matchQuery = supabase
        .from("materials")
        .select("id, is_active, width")
        .eq("product_type_id", selectedProduct.id)
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (parsedWidth !== null) {
        matchQuery = matchQuery.eq("width", parsedWidth);
      }

      const { data: matchedMaterial } = await matchQuery.maybeSingle();

      const materialName = `${selectedProduct.brand ? selectedProduct.brand + ' ' : ''}${selectedProduct.name}${selectedProduct.model ? ` - ${selectedProduct.model}` : ''}`;
      
      let materialId: number;

      if (matchedMaterial) {
        materialId = matchedMaterial.id;
        // Atualiza os metadados do material existente
        const { error: updateError } = await supabase
          .from("materials")
          .update({
            name: materialName,
            type: selectedProduct.category,
            brand: selectedProduct.brand,
            unit,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            average_cost: selectedProduct.cost_per_meter || 0,
            is_active: true,
            is_open_roll: false, // is_open_roll obsoleto
            width: unit === "Metros" ? (width ? parseFloat(width) : (matchedMaterial.width || 1.52)) : null,
          })
          .eq("id", materialId);
        
        if (updateError) throw updateError;
      } else {
        // Cria novo material (estoque inicial começa em 0)
        const { data: newMat, error: insertError } = await supabase
          .from("materials")
          .insert({
            name: materialName,
            type: selectedProduct.category,
            brand: selectedProduct.brand,
            unit,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            current_stock: 0, 
            open_roll_accumulated: 0, // Inicia acumulador zerado
            average_cost: selectedProduct.cost_per_meter || 0,
            company_id: companyId,
            product_type_id: selectedProduct.id,
            is_active: true,
            is_open_roll: source === "aproveitamento", // Flag que define se é material de aproveitamento
            width: unit === "Metros" ? (width ? parseFloat(width) : 1.52) : null,
          })
          .select("id")
          .single();
        
        if (insertError) throw insertError;
        materialId = newMat.id;
      }

      if (source === "principal") {
        // Cadastro via RPC add_material_roll (insere bobina + movimento + atualiza estoque atomicamente)
        const { error: rpcError } = await supabase.rpc("add_material_roll", {
          p_material_id: materialId,
          p_length: lengthVal,
          p_status: rollStatus,
          p_notes: notes || "Cadastro inicial de bobina",
          p_user_id: user.id,
          p_company_id: companyId,
        });

        if (rpcError) throw rpcError;
        toast.success(matchedMaterial ? "Entrada registrada em material existente!" : "Material e bobina cadastrados com sucesso!");

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating material:", error);
      toast.error(`Erro ao cadastrar: ${error.message || error.details || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProductTypeId("");
    setUnit("Metros");
    setMinStock("");
    setCurrentStock("");
    setSource("principal");
    setRollStatus("fechada");
    setNotes("");
    setReason("Retalho útil");
    setWidth("");
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


          {(
            <div className="space-y-2">
              <Label>Estado da Bobina Inicial *</Label>
              <Select value={rollStatus} onValueChange={(v: "fechada" | "aberta") => setRollStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fechada">Bobina Fechada (Nova)</SelectItem>
                  <SelectItem value="aberta">Bobina Aberta (Em Uso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Feedback visual: material existente detectado */}
          {existingMaterial && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-blue-600">
              ✓ Material já existe no estoque: <strong>{existingMaterial.name}</strong>. A entrada será registrada no material existente.
            </div>
          )}

          {(
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comprimento (m) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
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
          )}

          {unit === "Metros" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Largura da Bobina (m) *
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 1.52, 0.60, 1.00"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações / Notas</Label>
            <Input
              type="text"
              placeholder="Digite alguma observação adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : (existingMaterial ? "Registrar Entrada" : "Cadastrar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
