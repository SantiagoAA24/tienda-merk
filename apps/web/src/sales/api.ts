import { apiJson } from "@/auth/api";

import type { LocalInvoiceStatus, LocalSale } from "./types";

export type SaleLineApi = {
  product_id: string | null;
  product_name: string;
  unit_price: string;
  quantity: string;
  unit: string;
  iva: string;
  line_total: string;
  position: number;
};

export type SaleCreateBody = {
  id: string;
  sold_at: string;
  internal_number: string;
  subtotal: string;
  tax: string;
  total: string;
  payment_method: string;
  cash_received: string | null;
  customer: {
    doc_type: "cc" | "nit" | "other";
    document: string;
    name: string;
    email: string | null;
  } | null;
  lines: SaleLineApi[];
};

export type SaleOut = {
  id: string;
  sold_at: string;
  internal_number: string;
  subtotal: string;
  tax: string;
  total: string;
  payment_method: string;
  cash_received: string | null;
  customer_id: string | null;
  invoice: {
    id: string;
    number: string | null;
    status: LocalInvoiceStatus;
  } | null;
  lines?: SaleLineApi[];
};

function money(value: number): string {
  return String(value);
}

function quantityFromMillis(millis: number): string {
  return (millis / 1000).toFixed(3);
}

export function toSaleCreateBody(sale: LocalSale): SaleCreateBody {
  return {
    id: sale.id,
    sold_at: sale.soldAt,
    internal_number: sale.internalNumber,
    subtotal: money(sale.subtotal),
    tax: money(sale.tax),
    total: money(sale.total),
    payment_method: sale.paymentMethod,
    cash_received:
      sale.cashReceivedPesos === null ? null : money(sale.cashReceivedPesos),
    customer:
      sale.customerMode === "named" && sale.customer
        ? {
            doc_type: sale.customer.docType,
            document: sale.customer.document,
            name: sale.customer.name,
            email: sale.customer.email || null,
          }
        : null,
    lines: sale.lines.map((line, position) => ({
      product_id: line.productId,
      product_name: line.name,
      unit_price: money(line.unitPricePesos),
      quantity: quantityFromMillis(line.quantityMillis),
      unit: line.unit,
      iva: line.iva,
      line_total: money(line.lineTotal),
      position,
    })),
  };
}

export async function postSale(sale: LocalSale): Promise<SaleOut> {
  return apiJson<SaleOut>("/sales", {
    method: "POST",
    body: JSON.stringify(toSaleCreateBody(sale)),
  });
}

export type FetchSalesParams = {
  from?: string;
  to?: string;
  status?: LocalInvoiceStatus;
};

export async function fetchSales(
  params: FetchSalesParams = {},
): Promise<SaleOut[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query}` : "";
  return apiJson<SaleOut[]>(`/sales${suffix}`);
}

export async function fetchSaleDetail(id: string): Promise<SaleOut> {
  return apiJson<SaleOut>(`/sales/${id}`);
}

export type StatsSummary = {
  period: "day" | "week" | "month";
  from_date: string;
  to_date: string;
  total: string;
  sale_count: number;
  average_ticket: string;
  previous_total: string;
  invoices_accepted: number;
  invoices_total: number;
  daily: Array<{
    date: string;
    label: string;
    total: string;
    sale_count: number;
  }>;
};

export type TopProduct = {
  rank: number;
  product_name: string;
  quantity: string;
  unit: string;
  total: string;
};

export async function fetchStatsSummary(params: {
  period?: "day" | "week" | "month";
  on?: string;
}): Promise<StatsSummary> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.on) query.set("on", params.on);
  const suffix = query.toString() ? `?${query}` : "";
  return apiJson<StatsSummary>(`/stats/summary${suffix}`);
}

export async function fetchTopProducts(params: {
  period?: "day" | "week" | "month";
  on?: string;
  limit?: number;
}): Promise<TopProduct[]> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.on) query.set("on", params.on);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query}` : "";
  return apiJson<TopProduct[]>(`/stats/top-products${suffix}`);
}

export type ClosingCreateBody = {
  closing_date: string;
  opening_cash: string;
  counted_cash: string;
};

export type ClosingOut = {
  id: string;
  closing_date: string;
  opening_cash: string;
  expected_cash: string;
  counted_cash: string;
  difference: string;
  created_at: string;
};

export async function postClosing(
  body: ClosingCreateBody,
): Promise<ClosingOut> {
  return apiJson<ClosingOut>("/closings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
