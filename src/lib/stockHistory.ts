import { startOfDay, subMonths } from "date-fns";
import { ProductCategory } from "@/lib/database.types";

export type HistoryRange = "1m" | "2m" | "3m" | "6m" | "1y";

export interface HistoryMaterialLike {
  id: number;
  type: string | null;
  created_at: string;
  is_active: boolean | null;
  is_open_roll: boolean | null;
  product_types?: {
    category?: ProductCategory | null;
  } | null;
}

export type OperationalStatus =
  | "open_in_use"
  | "open_closed"
  | "closed_in_stock"
  | "inactive";

export const HISTORY_RANGE_LABELS: Record<HistoryRange, string> = {
  "1m": "1 mes",
  "2m": "2 meses",
  "3m": "3 meses",
  "6m": "6 meses",
  "1y": "1 ano",
};

const HISTORY_RANGE_MONTHS: Record<HistoryRange, number> = {
  "1m": 1,
  "2m": 2,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

export function getOperationalStatus(
  material: HistoryMaterialLike
): OperationalStatus {
  if (material.is_open_roll && material.is_active) return "open_in_use";
  if (material.is_open_roll && !material.is_active) return "open_closed";
  if (!material.is_open_roll && material.is_active) return "closed_in_stock";
  return "inactive";
}

export function getCategoryFromMaterial(
  material: Pick<HistoryMaterialLike, "type" | "product_types">
): ProductCategory | null {
  if (material.product_types?.category) return material.product_types.category;

  if (material.type) {
    const upperType = material.type.toUpperCase();
    if (upperType === "INSULFILM") return "INSULFILM";
    if (upperType === "PPF") return "PPF";
  }

  return null;
}

export function getHistoryRangeStart(
  range: HistoryRange,
  now: Date = new Date()
): Date {
  return startOfDay(subMonths(now, HISTORY_RANGE_MONTHS[range]));
}

export function materialMatchesHistoryRange(
  material: Pick<HistoryMaterialLike, "created_at">,
  lastMovementAt: string | undefined,
  rangeStart: Date
): boolean {
  const relevantDate = lastMovementAt ?? material.created_at;
  return new Date(relevantDate) >= rangeStart;
}
