import {
  CAC_GENERAL_ORIGIN,
  normalizeCacOrigin,
  normalizeClientOrigin,
} from "@/lib/clientOrigins";

export const CAC_BUCKET_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "vendas", label: "Vendas" },
] as const;

export type CacBucket = (typeof CAC_BUCKET_OPTIONS)[number]["value"];

export interface CacClientRecord {
  id: number;
  name: string;
  origem: string | null;
  created_at: string | null;
}

export interface CacSaleRecord {
  client_id: number | null;
  total: number | null;
  sale_date: string | null;
}

export interface CacTransactionRecord {
  id: number;
  amount: number;
  cac_bucket: CacBucket | null;
  cac_origin: string | null;
  category_color?: string | null;
  category_name?: string | null;
  description: string | null;
  name: string;
  transaction_date: string;
}

export interface CacOriginMetric {
  origin: string;
  newClients: number;
  directCost: number;
  sharedAllocatedCost: number;
  totalCost: number;
  cac: number | null;
  cohortRevenue: number;
  revenueToCacRatio: number | null;
}

export interface CacCategoryMetric {
  category: string;
  color: string | null;
  totalCost: number;
}

export interface DetailedCacMetrics {
  totalCost: number;
  directCost: number;
  sharedCost: number;
  marketingCost: number;
  salesCost: number;
  newClients: number;
  averageCac: number | null;
  cohortRevenue: number;
  averageCohortRevenue: number | null;
  revenueToCacRatio: number | null;
  origins: CacOriginMetric[];
  categories: CacCategoryMetric[];
  recentTransactions: CacTransactionRecord[];
  warnings: string[];
}

const ZERO_METRICS: DetailedCacMetrics = {
  totalCost: 0,
  directCost: 0,
  sharedCost: 0,
  marketingCost: 0,
  salesCost: 0,
  newClients: 0,
  averageCac: null,
  cohortRevenue: 0,
  averageCohortRevenue: null,
  revenueToCacRatio: null,
  origins: [],
  categories: [],
  recentTransactions: [],
  warnings: [],
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeDate(value: string | null | undefined) {
  return value?.slice(0, 10) || "";
}

function isInPeriod(value: string | null | undefined, startDate: string, endDate: string) {
  const normalized = safeDate(value);
  return Boolean(normalized && normalized >= startDate && normalized <= endDate);
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator) return null;
  return roundCurrency(numerator / denominator);
}

export function calculateDetailedCac(params: {
  clients: CacClientRecord[];
  sales: CacSaleRecord[];
  startDate: string;
  endDate: string;
  transactions: CacTransactionRecord[];
}): DetailedCacMetrics {
  const { clients, sales, startDate, endDate, transactions } = params;

  if (!startDate || !endDate) {
    return ZERO_METRICS;
  }

  const periodClients = clients.filter((client) =>
    isInPeriod(client.created_at, startDate, endDate)
  );

  const acquisitionTransactions = transactions.filter((transaction) =>
    isInPeriod(transaction.transaction_date, startDate, endDate)
  );

  const newClientIds = new Set(periodClients.map((client) => client.id));
  const newClientsCount = periodClients.length;

  const marketingCost = acquisitionTransactions
    .filter((transaction) => transaction.cac_bucket === "marketing")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const salesCost = acquisitionTransactions
    .filter((transaction) => transaction.cac_bucket === "vendas")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const sharedTransactions = acquisitionTransactions.filter(
    (transaction) => normalizeCacOrigin(transaction.cac_origin) === CAC_GENERAL_ORIGIN
  );
  const directTransactions = acquisitionTransactions.filter(
    (transaction) => normalizeCacOrigin(transaction.cac_origin) !== CAC_GENERAL_ORIGIN
  );

  const sharedCost = sharedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const directCost = directTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalCost = acquisitionTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const cohortRevenue = sales
    .filter((sale) => sale.client_id && newClientIds.has(sale.client_id))
    .reduce((sum, sale) => sum + (sale.total || 0), 0);

  const originClientCountMap = periodClients.reduce<Map<string, number>>((accumulator, client) => {
    const origin = normalizeClientOrigin(client.origem);
    accumulator.set(origin, (accumulator.get(origin) || 0) + 1);
    return accumulator;
  }, new Map());

  const originClientIdsMap = periodClients.reduce<Map<string, Set<number>>>((accumulator, client) => {
    const origin = normalizeClientOrigin(client.origem);
    if (!accumulator.has(origin)) {
      accumulator.set(origin, new Set<number>());
    }
    accumulator.get(origin)?.add(client.id);
    return accumulator;
  }, new Map());

  const directCostByOrigin = directTransactions.reduce<Map<string, number>>((accumulator, transaction) => {
    const origin = normalizeCacOrigin(transaction.cac_origin);
    accumulator.set(origin, (accumulator.get(origin) || 0) + transaction.amount);
    return accumulator;
  }, new Map());

  const originNames = new Set<string>([
    ...originClientCountMap.keys(),
    ...directCostByOrigin.keys(),
  ]);

  const origins = Array.from(originNames)
    .map((origin) => {
      const newClients = originClientCountMap.get(origin) || 0;
      const directOriginCost = directCostByOrigin.get(origin) || 0;
      const sharedAllocatedCost =
        newClientsCount > 0 ? (sharedCost * newClients) / newClientsCount : 0;
      const totalOriginCost = directOriginCost + sharedAllocatedCost;
      const clientIds = originClientIdsMap.get(origin) || new Set<number>();
      const originRevenue = sales
        .filter((sale) => sale.client_id && clientIds.has(sale.client_id))
        .reduce((sum, sale) => sum + (sale.total || 0), 0);

      return {
        origin,
        newClients,
        directCost: roundCurrency(directOriginCost),
        sharedAllocatedCost: roundCurrency(sharedAllocatedCost),
        totalCost: roundCurrency(totalOriginCost),
        cac: safeDivide(totalOriginCost, newClients),
        cohortRevenue: roundCurrency(originRevenue),
        revenueToCacRatio: safeDivide(originRevenue, totalOriginCost),
      };
    })
    .sort((left, right) => {
      if (right.totalCost !== left.totalCost) {
        return right.totalCost - left.totalCost;
      }

      return right.newClients - left.newClients;
    });

  const categories = Array.from(
    acquisitionTransactions.reduce<Map<string, CacCategoryMetric>>((accumulator, transaction) => {
      const category = transaction.category_name?.trim() || "Sem categoria";
      const current = accumulator.get(category);

      accumulator.set(category, {
        category,
        color: transaction.category_color || current?.color || null,
        totalCost: roundCurrency((current?.totalCost || 0) + transaction.amount),
      });

      return accumulator;
    }, new Map()).values()
  )
    .sort((left, right) => right.totalCost - left.totalCost)
    .slice(0, 6);

  const warnings: string[] = [];

  if (acquisitionTransactions.length === 0) {
    warnings.push("Nenhuma saída foi marcada para entrar no CAC neste período.");
  }

  if (newClientsCount === 0 && totalCost > 0) {
    warnings.push("Há custos de aquisição no período, mas nenhum novo cliente cadastrado.");
  }

  if (sharedCost > 0) {
    warnings.push("Os custos com origem 'Geral' são rateados proporcionalmente entre os novos clientes do período.");
  }

  if (newClientsCount > 0 && totalCost === 0) {
    warnings.push("Existem novos clientes no período, mas nenhuma despesa de aquisição classificada no CAC.");
  }

  return {
    totalCost: roundCurrency(totalCost),
    directCost: roundCurrency(directCost),
    sharedCost: roundCurrency(sharedCost),
    marketingCost: roundCurrency(marketingCost),
    salesCost: roundCurrency(salesCost),
    newClients: newClientsCount,
    averageCac: safeDivide(totalCost, newClientsCount),
    cohortRevenue: roundCurrency(cohortRevenue),
    averageCohortRevenue: safeDivide(cohortRevenue, newClientsCount),
    revenueToCacRatio: safeDivide(cohortRevenue, totalCost),
    origins,
    categories,
    recentTransactions: [...acquisitionTransactions]
      .sort((left, right) => right.transaction_date.localeCompare(left.transaction_date))
      .slice(0, 6),
    warnings,
  };
}
