import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Undo2, Check, Pencil } from "lucide-react";
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
  metersUsed: number | string;
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
  servicePrice: number;
  onUpdate: (items: CustomizedRegionItem[]) => void;
  onRevertToSimple: () => void;
  onPriceChange?: (price: number) => void;
}

/**
 * Cria os 4 itens iniciais do modo personalizado.
 * Se vehicleSize e regras de consumo estão disponíveis, auto-calcula metros.
 */
export function createInitialCustomItems(
  vehicleSize: string | null,
  consumptionRules: ConsumptionRule[],
  baseProductTypeId: number | null = null,
  baseProductTypeName: string = "",
  baseRegionId: number | null = null
): CustomizedRegionItem[] {
  return CUSTOM_INSULFILM_REGIONS.map((region) => {
    let metersUsed = 0;

    if (vehicleSize && (vehicleSize === "P" || vehicleSize === "M" || vehicleSize === "G") && baseRegionId) {
      const ratioConfig = CUSTOM_SPLIT_RATIOS[vehicleSize as VehicleSizeKey][region.code];
      // Buscar regra de consumo pela region base do item original
      const sourceRule = consumptionRules.find(
        (r) =>
          r.region_id === baseRegionId &&
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
  onPriceChange,
}: CustomizedServiceBlockProps) {
  const [showRevertAlert, setShowRevertAlert] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const totalMeters = items.reduce((acc, curr) => acc + (parseFloat(curr.metersUsed?.toString() || "0") || 0), 0);

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
    const newItems = [...items];
    newItems[index] = { ...newItems[index], metersUsed: value };
    onUpdate(newItems);
  };

  return (
    <div className={`rounded-lg border-2 overflow-hidden transition-all duration-300 ${isConfirmed
      ? "border-success/40 bg-success/5"
      : "border-primary/30 bg-primary/5"
      }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b transition-all duration-300 ${isConfirmed
        ? "bg-success/10 border-success/20"
        : "bg-primary/10 border-primary/20"
        }`}>
        <div className="flex items-center gap-2">
          <Badge
            variant={isConfirmed ? "outline" : "default"}
            className={isConfirmed ? "bg-success/20 text-success border-success/30 text-xs" : "text-xs"}
          >
            {isConfirmed ? "Confirmado" : "Personalizado"}
          </Badge>
          <span className={`text-sm font-medium transition-colors duration-300 ${isConfirmed ? "text-success" : "text-muted-foreground"}`}>
            3 regiões com películas individuais {isConfirmed && "(Confirmado)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            disabled={isConfirmed}
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
              disabled={isConfirmed}
              value={item.productTypeId?.toString() || ""}
              onValueChange={(v) => handleProductChange(index, v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  if (filteredProducts.length === 0) {
                    return (
                      <SelectItem value="none" disabled>
                        Nenhum produto
                      </SelectItem>
                    );
                  }

                  const openRolls = filteredProducts.filter((p: any) => p.openRollsCount && p.openRollsCount > 0);
                  const closedRollsOnly = filteredProducts.filter((p: any) => p.hasClosedRoll && (!p.openRollsCount || p.openRollsCount === 0));
                  const outOfStock = filteredProducts.filter((p: any) => !p.openRollsCount && !p.hasClosedRoll);

                  const renderProduct = (product: any) => {
                    let stockDisplay = "";
                    if (product.openRollsCount && product.openRollsCount > 0) {
                      stockDisplay += `${product.openRollsCount} Aberta${product.openRollsCount === 1 ? '' : 's'}`;
                    }
                    if (product.hasClosedRoll) {
                      stockDisplay += (stockDisplay ? " | " : "") + "Fechada em estoque";
                    }

                    return (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.brand} {product.name}
                        {product.light_transmission ? ` ${product.light_transmission}` : ""}
                        {stockDisplay ? ` [${stockDisplay}]` : ""}
                      </SelectItem>
                    );
                  };

                  return (
                    <>
                      {openRolls.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-primary">Estoque Aberto</SelectLabel>
                          {openRolls.map(renderProduct)}
                        </SelectGroup>
                      )}
                      {closedRollsOnly.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">Estoque Fechado</SelectLabel>
                          {closedRollsOnly.map(renderProduct)}
                        </SelectGroup>
                      )}
                      {outOfStock.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs text-destructive/70">Sem Estoque</SelectLabel>
                          {outOfStock.map(renderProduct)}
                        </SelectGroup>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>

            {/* Metros */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                disabled={isConfirmed}
                className="w-[70px] text-center"
                value={item.metersUsed}
                onChange={(e) => handleMetersChange(index, e.target.value)}
                placeholder="0.0"
              />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer com Metros Totais e Ajuste de Preço */}
      <div className={`p-3 flex flex-wrap items-center justify-between border-t gap-4 transition-all duration-300 ${isConfirmed
        ? "bg-success/5 border-success/20"
        : "bg-muted/40 border-primary/20"
        }`}>
        {/* Visualização da Distribuição */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground mr-2">
            Consumo Total: <span className="text-foreground ml-1">{totalMeters.toFixed(2)}m</span>
          </span>
          {items.map((item) => (
            <Badge key={"badge-" + item.regionCode} variant="outline" className="bg-background">
              {item.regionLabel.split(' ')[0]}: {(parseFloat(item.metersUsed?.toString() || "0") || 0).toFixed(2)}m
            </Badge>
          ))}
        </div>

        {/* Input de Preço Total do Serviço & Botões de Confirmação/Edição */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-1">Preço Serviço:</span>
            <div className="flex items-center gap-1 min-w-[110px]">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                disabled={isConfirmed}
                className="w-[90px] text-right font-medium text-success h-8 disabled:opacity-80"
                value={servicePrice || ""}
                onChange={(e) => onPriceChange?.(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isConfirmed}
              onClick={() => setIsConfirmed(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-3 text-xs font-semibold gap-1 transition-all disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Confirmar
            </Button>
            <Button
              type="button"
              disabled={!isConfirmed}
              onClick={() => setIsConfirmed(false)}
              className="h-8 px-3 text-xs font-semibold gap-1 transition-all border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-40 disabled:border-zinc-700 disabled:text-zinc-500"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        </div>
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
