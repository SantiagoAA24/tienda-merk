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
