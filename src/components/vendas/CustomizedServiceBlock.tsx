import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CUSTOM_INSULFILM_REGIONS,
  CUSTOM_SPLIT_RATIOS,
  type VehicleSizeKey,
  type CustomRegionCode,
} from "@/constants/insulfilm-regions";

export interface CustomizedRegionItem {
  regionCode: CustomRegionCode;
  regionLabel: string;
  productTypeId: number | null;
  productTypeName: string;
  metersUsed: number;
  totalPrice: number;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
}

interface ConsumptionRule {
  id: number;
  category: string;
  region_id: number;
  vehicle_size: string;
  meters_consumed: number;
  region_code?: string | null;
}

interface CustomizedServiceBlockProps {
  groupId: string;
  items: CustomizedRegionItem[];
  productTypes: ProductType[];
  vehicleSize: string | null;
  consumptionRules: ConsumptionRule[];
  servicePrice: number; // Preço total do serviço — não muda
  onUpdate: (items: CustomizedRegionItem[]) => void;
  onRevertToSimple: () => void;
}

/**
 * Cria os 4 itens iniciais do modo personalizado.
 * Se vehicleSize e regras de consumo estão disponíveis, auto-calcula metros.
 */
export function createInitialCustomItems(
  vehicleSize: string | null,
  consumptionRules: ConsumptionRule[],
  baseProductTypeId: number | null = null,
  baseProductTypeName: string = ""
): CustomizedRegionItem[] {
  return CUSTOM_INSULFILM_REGIONS.map((region) => {
    let metersUsed = 0;

    if (vehicleSize && (vehicleSize === "P" || vehicleSize === "M" || vehicleSize === "G")) {
      const ratioConfig = CUSTOM_SPLIT_RATIOS[vehicleSize as VehicleSizeKey][region.code];
      // Buscar regra de consumo pela source region_code
      const sourceRule = consumptionRules.find(
        (r) =>
          r.region_code === ratioConfig.source &&
          r.vehicle_size === vehicleSize &&
          r.category === "INSULFILM"
      );
      if (sourceRule) {
        metersUsed = parseFloat((sourceRule.meters_consumed * ratioConfig.ratio).toFixed(2));
      }
    }

    return {
      regionCode: region.code,
      regionLabel: region.label,
      productTypeId: baseProductTypeId,
      productTypeName: baseProductTypeName,
      metersUsed,
      totalPrice: 0, // Preço fica no nível do serviço, não por região
    };
  });
}

export default function CustomizedServiceBlock({
  groupId,
  items,
  productTypes,
  vehicleSize,
  consumptionRules,
  servicePrice,
  onUpdate,
  onRevertToSimple,
}: CustomizedServiceBlockProps) {
  const [showRevertAlert, setShowRevertAlert] = useState(false);

  const filteredProducts = productTypes.filter(
    (p) => p.category === "INSULFILM"
  );

  const handleProductChange = (index: number, productTypeId: string) => {
    const product = productTypes.find((p) => p.id === parseInt(productTypeId));
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productTypeId: parseInt(productTypeId),
      productTypeName: product
        ? `${product.brand} ${product.name}${product.light_transmission ? ` ${product.light_transmission}` : ""}`
        : "",
    };
    onUpdate(newItems);
  };

  const handleMetersChange = (index: number, value: string) => {
    const meters = parseFloat(value) || 0;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], metersUsed: meters };
    onUpdate(newItems);
  };

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            Personalizado
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            3 regiões com películas individuais
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-success">
            R$ {servicePrice.toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowRevertAlert(true)}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Modo simples
          </Button>
        </div>
      </div>

      {/* 3 blocos */}
      <div className="divide-y divide-border/50">
        {items.map((item, index) => (
          <div
            key={item.regionCode}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            {/* Região label */}
            <div className="min-w-[140px]">
              <span className="text-sm font-medium">{item.regionLabel}</span>
            </div>

            {/* Película select */}
            <Select
              value={item.productTypeId?.toString() || ""}
              onValueChange={(v) => handleProductChange(index, v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Película / Tom" />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum produto
                  </SelectItem>
                ) : (
                  filteredProducts.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id.toString()}
                    >
                      {product.brand} {product.name}
                      {product.light_transmission
                        ? ` ${product.light_transmission}`
                        : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Metros */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                className="w-[70px] text-center"
                value={item.metersUsed || ""}
                onChange={(e) => handleMetersChange(index, e.target.value)}
                placeholder="0.0"
              />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert para reverter */}
      <AlertDialog open={showRevertAlert} onOpenChange={setShowRevertAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voltar ao modo simples?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados detalhados das 3 regiões serão perdidos. O serviço voltará
              ao modo simples com uma única película.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowRevertAlert(false);
                onRevertToSimple();
              }}
            >
              Sim, voltar ao simples
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
