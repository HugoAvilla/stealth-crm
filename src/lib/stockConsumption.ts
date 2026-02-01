import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConsumptionResult {
  success: boolean;
  consumed: Array<{
    materialName: string;
    quantity: number;
    unit: string;
  }>;
  warnings: string[];
}

/**
 * Automatically consumes stock based on vehicle size and consumption rules
 * Called when a sale is created/closed
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

    // Create a map of materials by type
    const materialsByType = new Map(
      materials.map((m) => [m.type?.toLowerCase() || m.name.toLowerCase(), m])
    );

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
      const material = materialsByType.get(rule.material_type.toLowerCase());

      if (!material) {
        result.warnings.push(
          `Material tipo "${rule.material_type}" não encontrado no estoque`
        );
        continue;
      }

      const currentStock = material.current_stock || 0;

      // Check if we have enough stock
      if (currentStock < consumeAmount) {
        result.warnings.push(
          `Estoque insuficiente de ${material.name}: necessário ${consumeAmount} ${material.unit}, disponível ${currentStock} ${material.unit}`
        );
        // Continue with partial consumption if there's any stock
        if (currentStock <= 0) continue;
        consumeAmount = currentStock;
      }

      // 5. Register stock movement (trigger will update current_stock)
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          material_id: material.id,
          movement_type: "saida",
          quantity: consumeAmount,
          reason: `Consumo automático - Venda #${saleId} (${vehicle.brand} ${vehicle.model} - ${vehicleSize})`,
          user_id: userId,
          company_id: companyId,
        });

      if (movementError) {
        console.error("Error registering stock movement:", movementError);
        result.warnings.push(
          `Erro ao registrar consumo de ${material.name}`
        );
        continue;
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
 * Creates an automatic financial transaction when a sale is closed
 */
export async function createTransactionFromSale(
  saleId: number,
  saleTotal: number,
  clientName: string,
  paymentMethod: string | null,
  saleDate: string,
  companyId: number
): Promise<boolean> {
  try {
    // Find main account
    const { data: mainAccount, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_main", true)
      .single();

    if (accountError || !mainAccount) {
      console.warn("Main account not found, skipping transaction creation");
      return false;
    }

    // Create transaction
    const { error: txError } = await supabase.from("transactions").insert({
      name: `Venda #${saleId} - ${clientName}`,
      amount: saleTotal,
      type: "Entrada",
      transaction_date: saleDate,
      account_id: mainAccount.id,
      payment_method: paymentMethod,
      is_paid: true,
      sale_id: saleId,
      company_id: companyId,
    });

    if (txError) {
      console.error("Error creating transaction:", txError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in createTransactionFromSale:", error);
    return false;
  }
}
