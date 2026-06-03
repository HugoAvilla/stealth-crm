import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createSaleTransaction } from "@/lib/financialTransactions";

interface ConsumptionResult {
  success: boolean;
  consumed: Array<{
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  warnings: string[];
}

interface DetailedServiceItem {
  sale_id: number;
  category: string;
  product_type_id: number;
  region_id: number;
  meters_used: number;
  unit_price: number;
  total_price: number;
  company_id: number;
}

/**
 * Automatically consumes stock based on vehicle size and consumption rules
 * Called when a sale is created/closed (legacy system)
 */
export async function consumeStockForSale(
  saleId: number,
  vehicleId: number,
  companyId: number,
  userId: string
): Promise<ConsumptionResult> {
  const result: ConsumptionResult = {
    success: true,
    consumed: [],
    warnings: [],
  };

  try {
    // 1. Get vehicle size
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("size, brand, model")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle?.size) {
      console.warn("Vehicle size not found, skipping stock consumption");
      return result;
    }

    const vehicleSize = vehicle.size.toUpperCase() as "P" | "M" | "G";

    // 2. Get consumption rules for this company
    const { data: rules, error: rulesError } = await supabase
      .from("consumption_rules")
      .select("*")
      .eq("company_id", companyId);

    if (rulesError || !rules || rules.length === 0) {
      console.warn("No consumption rules configured");
      return result;
    }

    // 3. Get materials for this company
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (materialsError || !materials) {
      console.error("Error fetching materials:", materialsError);
      return result;
    }

    // Create a map of materials by type, keeping both open rolls and regular ones
    const materialsByType = new Map<string, any[]>();
    const materialsByProductTypeId = new Map<number, any[]>();

    for (const m of materials || []) {
      // Indexa por type
      const typeKey = m.type?.toLowerCase() || m.name.toLowerCase();
      const typeArr = materialsByType.get(typeKey) || [];
      typeArr.push(m);
      materialsByType.set(typeKey, typeArr);

      // Indexa por product_type_id quando existir
      if (m.product_type_id) {
        const prodArr = materialsByProductTypeId.get(m.product_type_id) || [];
        prodArr.push(m);
        materialsByProductTypeId.set(m.product_type_id, prodArr);
      }
    }

    // 4. Process each consumption rule
    for (const rule of rules) {
      // Get consumption amount based on vehicle size
      let consumeAmount = 0;
      switch (vehicleSize) {
        case "P":
          consumeAmount = rule.size_p || 0;
          break;
        case "M":
          consumeAmount = rule.size_m || 0;
          break;
        case "G":
          consumeAmount = rule.size_g || 0;
          break;
      }

      if (consumeAmount <= 0) continue;

      // Find matching material
      // Tenta usar product_type_id se a rule tiver (fallback para type)
      const ruleProdId = (rule as any).product_type_id;
      let productMaterials = ruleProdId
        ? materialsByProductTypeId.get(ruleProdId) || []
        : materialsByType.get(rule.material_type.toLowerCase()) || [];

      if (productMaterials.length === 0 && ruleProdId) {
        productMaterials = materialsByType.get(rule.material_type.toLowerCase()) || [];
      }

      // Ordena: primeiro os que tem current_stock > 0, depois por largura (maior primeiro)
      productMaterials.sort((a, b) => {
        const aStock = (a.current_stock || 0) > 0 ? 1 : 0;
        const bStock = (b.current_stock || 0) > 0 ? 1 : 0;
        if (aStock !== bStock) return bStock - aStock;

        const aWidth = a.width || 0;
        const bWidth = b.width || 0;
        return bWidth - aWidth;
      });

      const openRollMaterial = productMaterials.find((m: any) => m.is_open_roll);
      const material = openRollMaterial || productMaterials.find((m: any) => !m.is_open_roll) || productMaterials[0];

      if (!material) {
        result.warnings.push(
          `Material tipo "${rule.material_type}" não encontrado no estoque`
        );
        continue;
      }

      const reasonText = `Consumo automático - Venda #${saleId} (${vehicle.brand} ${vehicle.model} - ${vehicleSize})`;

      if (material.is_open_roll) {
        // Aproveitamento: acumula o consumo em open_roll_accumulated
        const { error: rpcError } = await supabase.rpc("consume_open_roll", {
          p_material_id: material.id,
          p_meters: consumeAmount,
          p_reason: reasonText,
          p_user_id: userId,
          p_company_id: companyId,
        });

        if (rpcError) {
          console.error("Error consuming open roll:", rpcError);
          result.warnings.push(`Erro ao registrar consumo de ${material.name}`);
          continue;
        }
      } else {
        // Estoque Principal: consome das bobinas
        const { data: rpcData, error: rpcError } = await supabase.rpc("consume_material_rolls", {
          p_material_id: material.id,
          p_meters: consumeAmount,
          p_source: 'venda',
          p_reason: reasonText,
          p_user_id: userId,
          p_company_id: companyId,
        });

        if (rpcError) {
          console.error("Error consuming rolls:", rpcError);
          result.warnings.push(`Erro ao registrar consumo de ${material.name}`);
          continue;
        }

        const response = rpcData as any;
        if (response && response.warning) {
          result.warnings.push(
            `Estoque insuficiente de ${material.name}: necessário ${response.required_meters} ${material.unit}, disponível ${response.available_meters} ${material.unit}`
          );
          // Tenta consumir pelo menos o disponível, se houver
          if (response.available_meters > 0) {
            consumeAmount = response.available_meters;
            const { error: retryError } = await supabase.rpc("consume_material_rolls", {
               p_material_id: material.id,
               p_meters: consumeAmount,
               p_source: 'venda',
               p_reason: reasonText + ' (Consumo parcial)',
               p_user_id: userId,
               p_company_id: companyId,
            });
            if (retryError) continue;
          } else {
            continue;
          }
        }
      }

      result.consumed.push({
        materialName: material.name,
        quantity: consumeAmount,
        unit: material.unit,
      });
    }

    // Show summary toast
    if (result.consumed.length > 0) {
      const summary = result.consumed
        .map((c) => `${c.quantity} ${c.unit} de ${c.materialName}`)
        .join(", ");
      toast.success(`Estoque atualizado: ${summary}`);
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => toast.warning(w));
    }

    return result;
  } catch (error) {
    console.error("Error in consumeStockForSale:", error);
    result.success = false;
    return result;
  }
}

/**
 * Consumes stock based on detailed service items (INSULFILM/PPF system)
 * Each item specifies product_type which is linked to a material
 */
export async function consumeStockForDetailedSale(
  saleId: number,
  detailedItems: DetailedServiceItem[],
  vehicleBrand: string,
  vehicleModel: string,
  vehicleSize: string,
  companyId: number,
  userId: string
): Promise<ConsumptionResult> {
  const result: ConsumptionResult = {
    success: true,
    consumed: [],
    warnings: [],
  };

  if (!detailedItems || detailedItems.length === 0) {
    return result;
  }

  try {
    // 1. Get all materials linked to product types for this company
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .not("product_type_id", "is", null);

    if (materialsError) {
      console.error("Error fetching materials:", materialsError);
      result.warnings.push("Erro ao buscar materiais do estoque");
      return result;
    }

    // Create a map of materials by product_type_id
    const materialsByProductType = new Map<number, any[]>();
    for (const m of materials || []) {
      const arr = materialsByProductType.get(m.product_type_id) || [];
      arr.push(m);
      materialsByProductType.set(m.product_type_id, arr);
    }

    // 2. Group consumption by product_type_id
    const consumptionByProduct = new Map<number, number>();
    for (const item of detailedItems) {
      const currentAmount = consumptionByProduct.get(item.product_type_id) || 0;
      consumptionByProduct.set(item.product_type_id, currentAmount + item.meters_used);
    }

    // 3. Process each product type consumption
    for (const [productTypeId, metersToConsume] of consumptionByProduct) {
      if (metersToConsume <= 0) continue;

      const productMaterials = materialsByProductType.get(productTypeId) || [];
      
      // Ordena: primeiro current_stock > 0, depois por largura (maior primeiro)
      productMaterials.sort((a, b) => {
        const aStock = (a.current_stock || 0) > 0 ? 1 : 0;
        const bStock = (b.current_stock || 0) > 0 ? 1 : 0;
        if (aStock !== bStock) return bStock - aStock;

        const aWidth = a.width || 0;
        const bWidth = b.width || 0;
        return bWidth - aWidth;
      });

      const openRollMaterial = productMaterials.find((m: any) => m.is_open_roll);
      const material = openRollMaterial || productMaterials.find((m: any) => !m.is_open_roll) || productMaterials[0];

      if (!material) {
        // Get product type name for warning
        const { data: productType } = await supabase
          .from("product_types")
          .select("brand, name")
          .eq("id", productTypeId)
          .single();
        
        const productName = productType 
          ? `${productType.brand} ${productType.name}` 
          : `Produto #${productTypeId}`;
        
        result.warnings.push(
          `Material não vinculado ao produto "${productName}". Configure no Estoque > Materiais.`
        );
        continue;
      }

      let consumeAmount = metersToConsume;

      const reasonText = `Consumo automático - Venda #${saleId} (${vehicleBrand} ${vehicleModel} - ${vehicleSize})`;

      if (material.is_open_roll) {
        // Aproveitamento: acumula o consumo em open_roll_accumulated
        const { error: rpcError } = await supabase.rpc("consume_open_roll", {
          p_material_id: material.id,
          p_meters: consumeAmount,
          p_reason: reasonText,
          p_user_id: userId,
          p_company_id: companyId,
        });

        if (rpcError) {
          console.error("Error consuming open roll:", rpcError);
          result.warnings.push(`Erro ao registrar consumo de ${material.name}`);
          continue;
        }
      } else {
        // Estoque Principal: consome das bobinas
        const { data: rpcData, error: rpcError } = await supabase.rpc("consume_material_rolls", {
          p_material_id: material.id,
          p_meters: consumeAmount,
          p_source: 'espaco',
          p_reason: reasonText,
          p_user_id: userId,
          p_company_id: companyId,
        });

        if (rpcError) {
          console.error("Error consuming rolls:", rpcError);
          result.warnings.push(`Erro ao registrar consumo de ${material.name}`);
          continue;
        }

        const response = rpcData as any;
        if (response && response.warning) {
          result.warnings.push(
            `Estoque insuficiente de ${material.name}: necessário ${response.required_meters?.toFixed(2)} ${material.unit}, disponível ${response.available_meters?.toFixed(2)} ${material.unit}`
          );
          // Tenta consumir pelo menos o disponível, se houver
          if (response.available_meters > 0) {
            consumeAmount = response.available_meters;
            const { error: retryError } = await supabase.rpc("consume_material_rolls", {
               p_material_id: material.id,
               p_meters: consumeAmount,
               p_source: 'espaco',
               p_reason: reasonText + ' (Consumo parcial)',
               p_user_id: userId,
               p_company_id: companyId,
            });
            if (retryError) continue;
          } else {
            continue;
          }
        }
      }

      result.consumed.push({
        materialName: material.name,
        quantity: consumeAmount,
        unit: material.unit,
      });
    }

    // Show summary toast
    if (result.consumed.length > 0) {
      const summary = result.consumed
        .map((c) => `${c.quantity.toFixed(2)} ${c.unit} de ${c.materialName}`)
        .join(", ");
      toast.success(`Estoque atualizado: ${summary}`);
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => toast.warning(w));
    }

    return result;
  } catch (error) {
    console.error("Error in consumeStockForDetailedSale:", error);
    result.success = false;
    return result;
  }
}

/**
 * Creates an automatic financial transaction when a sale is closed.
 * Delegates to the centralized financialTransactions service.
 * @param isPaid - Defaults to true for backward compatibility. Set to false for boleto.
 */
export async function createTransactionFromSale(
  saleId: number,
  saleTotal: number,
  clientName: string,
  paymentMethod: string | null,
  saleDate: string,
  companyId: number,
  accountId?: number | null,
  machineId?: number | null,
  installments?: number,
  netAmount?: number,
  isPaid: boolean = true,
  salePaymentId?: number | null
): Promise<boolean> {
  try {
    const result = await createSaleTransaction({
      saleId,
      saleTotal,
      clientName,
      paymentMethod,
      saleDate,
      companyId,
      accountId,
      isPaid,
      salePaymentId: salePaymentId ?? undefined,
      installments,
      netAmount,
    });

    return result !== null;
  } catch (error) {
    console.error("Error in createTransactionFromSale:", error);
    return false;
  }
}

/**
 * Reverses a previous stock consumption by calling the reverse_material_roll_consumption RPC
 */
export async function reverseStockForSale(
  materialId: number,
  meters: number,
  reason: string,
  userId: string,
  companyId: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("reverse_material_roll_consumption", {
      p_material_id: materialId,
      p_meters: meters,
      p_source: 'venda',
      p_reason: reason,
      p_user_id: userId,
      p_company_id: companyId
    });

    if (error) {
      console.error("Error reversing stock:", error);
      toast.error("Erro ao estornar estoque");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected error in reverseStockForSale:", err);
    return false;
  }
}
