import type { DayRange } from "@/lib/period";
import { isInRange } from "@/lib/period";
import type { Unit } from "@/products/types";
import {
  displayInvoiceStatus,
  needsRetry,
} from "@/db/sales";
import type { LocalSale, PaymentMethod } from "./types";

export function filterSalesByRange(
  sales: LocalSale[],
  range: DayRange,
): LocalSale[] {
  return sales
    .filter((sale) => isInRange(sale.soldAt, range))
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt));
}

export type SalesTotals = {
  total: number;
  count: number;
  average: number;
  byPayment: Record<PaymentMethod, number>;
  invoicesAccepted: number;
  invoicesTotal: number;
  retryCount: number;
};

export function summarizeSales(sales: LocalSale[]): SalesTotals {
  const byPayment: Record<PaymentMethod, number> = {
    cash: 0,
    transfer: 0,
    card: 0,
  };
  let total = 0;
  let invoicesAccepted = 0;
  let retryCount = 0;

  for (const sale of sales) {
    total += sale.total;
    byPayment[sale.paymentMethod] =
      (byPayment[sale.paymentMethod] ?? 0) + sale.total;
    const chip = displayInvoiceStatus(sale);
    if (chip === "accepted") invoicesAccepted += 1;
    if (needsRetry(sale)) retryCount += 1;
  }

  const count = sales.length;
  return {
    total,
    count,
    average: count === 0 ? 0 : Math.round(total / count),
    byPayment,
    invoicesAccepted,
    invoicesTotal: count,
    retryCount,
  };
}

export type TopProductAgg = {
  rank: number;
  name: string;
  quantityMillis: number;
  unit: Unit;
  total: number;
};

export function topProducts(
  sales: LocalSale[],
  limit = 3,
): TopProductAgg[] {
  const map = new Map<
    string,
    { name: string; quantityMillis: number; unit: Unit; total: number }
  >();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const key = `${line.name}::${line.unit}`;
      const current = map.get(key) ?? {
        name: line.name,
        quantityMillis: 0,
        unit: line.unit,
        total: 0,
      };
      current.quantityMillis += line.quantityMillis;
      current.total += line.lineTotal;
      map.set(key, current);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      name: row.name,
      quantityMillis: row.quantityMillis,
      unit: row.unit,
      total: row.total,
    }));
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 100);
}
