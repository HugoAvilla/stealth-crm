import {
  Select,
  SelectContent,
  SelectItem,
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
  unitPrice: number;
  totalPrice: number;
}

interface ProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
  unit_price: number;
}

interface VehicleRegion {
  id: number;
  category: string;
  name: string;
  description: string | null;
  fixed_price?: number | null;
}

interface ConsumptionRule {
  id: number;
  category: string;
  region_id: number;
  vehicle_size: string;
  meters_consumed: number;
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
      unitPrice: 0,
      totalPrice: 0,
    });
  };

  const handleRegionChange = (regionId: string) => {
    const region = vehicleRegions.find((r) => r.id === parseInt(regionId));
    const meters = calculateMeters(parseInt(regionId), item.category);
    // Use fixed_price if available, otherwise calculate from meters
    const fixedPrice = region?.fixed_price || 0;
    const calculatedPrice = fixedPrice > 0 ? fixedPrice : (meters * item.unitPrice);

    onUpdate({
      ...item,
      regionId: parseInt(regionId),
      regionName: region?.name || "",
      metersUsed: meters,
      totalPrice: calculatedPrice,
    });
  };

  const handleProductChange = (productTypeId: string) => {
    const product = productTypes.find((p) => p.id === parseInt(productTypeId));
    const unitPrice = product?.unit_price || 0;

    onUpdate({
      ...item,
      productTypeId: parseInt(productTypeId),
      productTypeName: product
        ? `${product.brand} ${product.name}${product.light_transmission ? ` ${product.light_transmission}` : ""}`
        : "",
      unitPrice,
      totalPrice: item.metersUsed * unitPrice,
    });
  };

  const handleMetersChange = (value: string) => {
    const meters = parseFloat(value) || 0;
    onUpdate({
      ...item,
      metersUsed: meters,
      totalPrice: meters * item.unitPrice,
    });
  };

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    onUpdate({
      ...item,
      totalPrice: price,
    });
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
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Produto" />
        </SelectTrigger>
        <SelectContent>
          {filteredProducts.length === 0 ? (
            <SelectItem value="none" disabled>
              Nenhum produto
            </SelectItem>
          ) : (
            filteredProducts.map((product) => (
              <SelectItem key={product.id} value={product.id.toString()}>
                {product.brand} {product.name}
                {product.light_transmission
                  ? ` ${product.light_transmission}`
                  : ""}
              </SelectItem>
            ))
          )}
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
