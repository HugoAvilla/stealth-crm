import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export type ProductCategory = 'INSULFILM' | 'PPF';

export interface DetailedServiceItem {
  id: string;
  category: ProductCategory;
  regionId: number | null;
  regionName: string;
  productTypeId: number | null;
  productTypeName: string;
  metersUsed: number;
  totalPrice: number; // Preço vem do serviço (fixed_price), não do material
  // Novos campos para personalização
  serviceName: string;
  regionCode: string | null;
  displayName: string;
  isCustomized: boolean;
  customizationGroup: string | null;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  openRollsCount?: number;
  hasClosedRoll?: boolean;
}

interface VehicleRegion {
  id: number;
  category: string;
  name: string;
  description: string | null;
  fixed_price?: number | null;
  region_code?: string | null;
}

interface ConsumptionRule {
  id: number;
  category: string;
  region_id: number;
  vehicle_size: string;
  meters_consumed: number;
  region_code?: string | null;
}

interface ServiceItemRowProps {
  item: DetailedServiceItem;
  vehicleSize: string | null;
  productTypes: ProductType[];
  vehicleRegions: VehicleRegion[];
  consumptionRules: ConsumptionRule[];
  onUpdate: (item: DetailedServiceItem) => void;
  onRemove: (id: string) => void;
}

const ServiceItemRow = ({
  item,
  vehicleSize,
  productTypes,
  vehicleRegions,
  consumptionRules,
  onUpdate,
  onRemove,
}: ServiceItemRowProps) => {
  // Filter regions by category
  const filteredRegions = vehicleRegions.filter(
    (r) => r.category === item.category
  );

  // Filter products by category
  const filteredProducts = productTypes.filter(
    (p) => p.category === item.category
  );

  // Calculate meters when region and vehicle size are selected
  const calculateMeters = (regionId: number, category: string): number => {
    if (!vehicleSize) return 0;
    const rule = consumptionRules.find(
      (r) =>
        r.region_id === regionId &&
        r.vehicle_size === vehicleSize &&
        r.category === category
    );
    return rule?.meters_consumed || 0;
  };

  const handleCategoryChange = (category: ProductCategory) => {
    onUpdate({
      ...item,
      category,
      regionId: null,
      regionName: "",
      productTypeId: null,
      productTypeName: "",
      metersUsed: 0,
      totalPrice: 0,
    });
  };

  const handleRegionChange = (regionId: string) => {
    const region = vehicleRegions.find((r) => r.id === parseInt(regionId));
    const meters = calculateMeters(parseInt(regionId), item.category);
    // Usar APENAS o fixed_price do serviço
    const fixedPrice = region?.fixed_price || 0;

    onUpdate({
      ...item,
      regionId: parseInt(regionId),
      regionName: region?.name || "",
      regionCode: region?.region_code || null,
      metersUsed: meters,
      totalPrice: fixedPrice, // Sempre usa o preço do serviço
    });
  };

  const handleProductChange = (productTypeId: string) => {
    const product = productTypes.find((p) => p.id === parseInt(productTypeId));
    // Não altera o preço - apenas atualiza o produto para baixa de estoque
    onUpdate({
      ...item,
      productTypeId: parseInt(productTypeId),
      productTypeName: product
        ? `${product.brand} ${product.name}${product.light_transmission ? ` ${product.light_transmission}` : ""}`
        : "",
      // Mantém o totalPrice definido pelo serviço (região)
    });
  };

  const handleMetersChange = (value: string) => {
    const meters = parseFloat(value) || 0;
    onUpdate({
      ...item,
      metersUsed: meters,
      // NÃO altera totalPrice - metros é apenas para baixa de estoque
    });
  };

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    onUpdate({
      ...item,
      totalPrice: price,
    });
  };

  const renderProductSelect = () => {
    if (filteredProducts.length === 0) {
      return (
        <SelectItem value="none" disabled>
          Nenhum produto
        </SelectItem>
      );
    }

    const openRolls = filteredProducts.filter((p) => p.openRollsCount && p.openRollsCount > 0);
    const closedRollsOnly = filteredProducts.filter((p) => p.hasClosedRoll && (!p.openRollsCount || p.openRollsCount === 0));
    const outOfStock = filteredProducts.filter((p) => !p.openRollsCount && !p.hasClosedRoll);

    const renderProduct = (product: ProductType) => {
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
            <SelectLabel className="text-xs font-semibold text-primary">Com Bobina Aberta</SelectLabel>
            {openRolls.map(renderProduct)}
          </SelectGroup>
        )}
        {closedRollsOnly.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">Somente Bobina Fechada</SelectLabel>
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
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
      {/* Category Select */}
      <Select value={item.category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="INSULFILM">INSULFILM</SelectItem>
          <SelectItem value="PPF">PPF</SelectItem>
        </SelectContent>
      </Select>

      {/* Region Select */}
      <Select
        value={item.regionId?.toString() || ""}
        onValueChange={handleRegionChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Região" />
        </SelectTrigger>
        <SelectContent>
          {filteredRegions.length === 0 ? (
            <SelectItem value="none" disabled>
              Nenhuma região
            </SelectItem>
          ) : (
            filteredRegions.map((region) => (
              <SelectItem key={region.id} value={region.id.toString()}>
                {region.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Product Select */}
      <Select
        value={item.productTypeId?.toString() || ""}
        onValueChange={handleProductChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Produto" />
        </SelectTrigger>
        <SelectContent>
          {renderProductSelect()}
        </SelectContent>
      </Select>

      {/* Meters Input */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.1"
          className="w-[70px] text-center"
          value={item.metersUsed || ""}
          onChange={(e) => handleMetersChange(e.target.value)}
          placeholder="0.0"
        />
        <span className="text-sm text-muted-foreground">m</span>
      </div>

      {/* Editable Price Input */}
      <div className="flex items-center gap-1 min-w-[110px]">
        <span className="text-sm text-muted-foreground">R$</span>
        <Input
          type="number"
          step="0.01"
          className="w-[90px] text-right font-medium text-success"
          value={item.totalPrice || ""}
          onChange={(e) => handlePriceChange(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ServiceItemRow;
