import { useEffect, useState } from "react";
import { Plus, Trash2, Tag, ShoppingBag, Info, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export interface PurchaseItemDraft {
  materialId?: number | null;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface MaterialOption {
  id: number;
  name: string;
  unit: string;
  average_cost: number | null;
  product_types?: { cost_per_meter: number | null } | null;
}

interface ItemsInputProps {
  companyId: number;
  items: PurchaseItemDraft[];
  onChange: (items: PurchaseItemDraft[]) => void;
  onUpdateTotalAmount?: (amount: number) => void;
}

export function ItemsInput({
  companyId,
  items,
  onChange,
  onUpdateTotalAmount,
}: ItemsInputProps) {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca os materiais do estoque
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("materials")
          .select("id, name, unit, average_cost, product_types(cost_per_meter)")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        setMaterials(data || []);
      } catch (error) {
        console.error("[ItemsInput] Error fetching materials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [companyId]);

  const handleAddItem = () => {
    const newItem: PurchaseItemDraft = {
      materialId: null,
      description: "",
      quantity: 1,
      unit: "un",
      unitPrice: 0,
      totalPrice: 0,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemDraft, value: any) => {
    const updated = [...items];
    const currentItem = { ...updated[index] };

    if (field === "materialId") {
      const matId = value === "free_text" ? null : Number(value);
      currentItem.materialId = matId;

      if (matId) {
        const selectedMaterial = materials.find((m) => m.id === matId);
        if (selectedMaterial) {
          currentItem.unit = selectedMaterial.unit || "un";
          currentItem.unitPrice = selectedMaterial.product_types?.cost_per_meter || selectedMaterial.average_cost || 0;
          currentItem.description = null;
        }
      } else {
        currentItem.unit = "un";
        currentItem.description = "";
      }
    } else {
      (currentItem as any)[field] = value;
    }

    // Recalcular preço total do item
    if (field === "quantity" || field === "unitPrice" || field === "materialId") {
      const q = Number(currentItem.quantity) || 0;
      const p = Number(currentItem.unitPrice) || 0;
      currentItem.totalPrice = Math.round(q * p * 100) / 100;
    }

    updated[index] = currentItem;
    onChange(updated);
  };

  const sumTotalItems = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleApplyTotalToPurchase = () => {
    if (onUpdateTotalAmount) {
      onUpdateTotalAmount(sumTotalItems);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Itens da Compra (Opcional)</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={handleAddItem}
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg bg-muted/20 text-center">
          <Info className="w-6 h-6 text-muted-foreground opacity-55 mb-1.5" />
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Nenhum item adicionado. A compra será cadastrada com valor global.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[300px] overflow-y-auto pr-1 py-1 space-y-3 scrollbar-thin">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg border border-border bg-card/30 hover:bg-card/65 transition-colors relative"
              >
                {/* Seleção do tipo de item (Estoque ou Descrição Livre) */}
                <div className="flex-1 space-y-1 min-w-[140px]">
                  <span className="text-[10px] font-medium text-muted-foreground">Produto / Item</span>
                  <Select
                    value={item.materialId ? item.materialId.toString() : "free_text"}
                    onValueChange={(val) => handleItemChange(index, "materialId", val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_text" className="font-semibold text-primary">
                        + Item Textual Livre
                      </SelectItem>
                      {materials.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id.toString()}>
                          {mat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Se for item livre, exibe input de texto */}
                {item.materialId === null && (
                  <div className="flex-1 space-y-1 min-w-[140px]">
                    <span className="text-[10px] font-medium text-muted-foreground">Descrição do Item</span>
                    <Input
                      type="text"
                      placeholder="Ex: Parafusos, Fita crepe"
                      value={item.description || ""}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {/* Unidade */}
                <div className="w-20 space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Unidade</span>
                  <Input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                    placeholder="un"
                    className="h-9 text-xs"
                    disabled={item.materialId !== null} // Trava se for material do estoque
                  />
                </div>

                {/* Quantidade */}
                <div className="w-24 space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Qtd.</span>
                  <Input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Preço Unitário */}
                <div className="w-28 space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Preço Unit. (R$)</span>
                  <Input
                    type="text"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(index, "unitPrice", e.target.value.replace(",", "."))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>

                {/* Preço Total (Calculado) */}
                <div className="w-28 space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Total (R$)</span>
                  <Input
                    type="text"
                    value={item.totalPrice.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    className="h-9 text-xs font-mono bg-muted/40 font-semibold"
                    disabled
                  />
                </div>

                {/* Botão de Excluir */}
                <div className="flex items-end justify-end sm:pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo e Ação de Vincular */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Total dos Itens:{" "}
                <strong className="text-foreground text-sm font-semibold ml-1">
                  R$ {sumTotalItems.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
            {onUpdateTotalAmount && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                onClick={handleApplyTotalToPurchase}
              >
                Vincular ao Valor Total da Compra
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
