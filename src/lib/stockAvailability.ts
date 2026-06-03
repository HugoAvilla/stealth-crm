/**
 * stockAvailability.ts
 *
 * Centraliza a lógica de disponibilidade de materiais.
 * Usado por ServiceItemRow, NewSaleModal, FillSlotModal e demais
 * pontos que precisam determinar se um produto tem estoque.
 *
 * Fonte de verdade: materials.current_stock (não contagem de bobinas).
 */

// Interfaces locais mínimas — tipagem pura, sem acoplamento externo
export interface AvailabilityMaterial {
  id: number;
  current_stock: number | null;
  product_type_id: number | null;
}

export interface AvailabilityProductType {
  id: number;
  category: string;
  brand: string;
  name: string;
  model: string | null;
  light_transmission: string | null;
}

/**
 * Determina se um material está disponível para uso.
 * Regra: current_stock > 0 → disponível (inclui materiais legados sem bobinas).
 */
export function isAvailable(material: { current_stock: number | null }): boolean {
  return (material.current_stock ?? 0) > 0;
}

/**
 * Agrupa produtos por disponibilidade baseada em current_stock dos materiais vinculados.
 *
 * Um produto é considerado "available" se QUALQUER material vinculado ao seu
 * product_type_id tem current_stock > 0.
 */
export function groupByAvailability(
  products: AvailabilityProductType[],
  materials: AvailabilityMaterial[]
): { available: AvailabilityProductType[]; outOfStock: AvailabilityProductType[] } {
  const available: AvailabilityProductType[] = [];
  const outOfStock: AvailabilityProductType[] = [];

  for (const product of products) {
    const linkedMaterials = materials.filter(
      (m) => m.product_type_id === product.id
    );

    const hasStock = linkedMaterials.some(isAvailable);

    if (hasStock) {
      available.push(product);
    } else {
      outOfStock.push(product);
    }
  }

  return { available, outOfStock };
}
