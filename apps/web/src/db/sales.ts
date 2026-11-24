import { saleTotals } from "@/lib/pricing";
import type { SaleLineApi, SaleOut } from "@/sales/api";
import type {
  LocalSale,
  LocalSaleLine,
  LocalInvoiceStatus,
  PaymentMethod,
} from "@/sales/types";
import type { Iva, Unit } from "@/products/types";

import { clearCart, getCart } from "./cart";
import { db } from "./schema";

function formatInternalNumber(value: number): string {
  return `V-${String(value).padStart(4, "0")}`;
}

export async function nextInternalNumber(): Promise<string> {
  return db.transaction("rw", db.counters, async () => {
    const current = await db.counters.get("internalNumber");
    const value = (current?.value ?? 0) + 1;
    await db.counters.put({ id: "internalNumber", value });
    return formatInternalNumber(value);
  });
}

export async function getSaleById(id: string): Promise<LocalSale | undefined> {
  return db.sales.get(id);
}

export async function listLocalSales(): Promise<LocalSale[]> {
  return db.sales.orderBy("soldAt").reverse().toArray();
}

export async function listPendingSales(): Promise<LocalSale[]> {
  return db.sales
    .where("syncStatus")
    .anyOf(["pending", "error"])
    .sortBy("soldAt");
}

export async function countPendingSales(): Promise<number> {
  return db.sales.where("syncStatus").anyOf(["pending", "error"]).count();
}

export async function markSaleSynced(
  id: string,
  patch: {
    invoiceNumber: string | null;
    invoiceStatus: LocalInvoiceStatus;
  },
): Promise<void> {
  const sale = await db.sales.get(id);
  if (!sale) return;
  await db.sales.put({
    ...sale,
    syncStatus: "synced",
    invoiceNumber: patch.invoiceNumber,
    invoiceStatus: patch.invoiceStatus,
    serverInvoiceStatus: patch.invoiceStatus,
  });
}

export async function markSaleSyncError(id: string): Promise<void> {
  const sale = await db.sales.get(id);
  if (!sale) return;
  await db.sales.put({
    ...sale,
    syncStatus: "error",
  });
}

export type CreateSaleResult =
  | { ok: true; sale: LocalSale }
  | { ok: false; error: string };

export async function createSaleFromCart(): Promise<CreateSaleResult> {
  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { ok: false, error: "La venta está vacía." };
  }

  if (cart.paymentMethod === "cash") {
    const received = cart.cashReceivedPesos;
    const totals = saleTotals(cart.lines);
    if (received === null || received < totals.total) {
      return {
        ok: false,
        error: "El efectivo recibido debe cubrir el total.",
      };
    }
  }

  const totals = saleTotals(cart.lines);
  const internalNumber = await nextInternalNumber();
  const lines: LocalSaleLine[] = cart.lines.map((line) => ({ ...line }));
  const cashReceived =
    cart.paymentMethod === "cash" ? cart.cashReceivedPesos : null;
  const changePesos =
    cashReceived !== null ? Math.max(0, cashReceived - totals.total) : null;

  const sale: LocalSale = {
    id: crypto.randomUUID(),
    internalNumber,
    soldAt: new Date().toISOString(),
    lines,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paymentMethod: cart.paymentMethod,
    cashReceivedPesos: cashReceived,
    changePesos,
    customerMode: cart.customerMode,
    customer: cart.customerMode === "named" ? cart.customer : null,
    invoiceStatus: "pending",
    syncStatus: "pending",
  };

  await db.transaction("rw", db.sales, db.cart, async () => {
    await db.sales.put(sale);
    await clearCart();
  });

  return { ok: true, sale };
}

function moneyToPesos(value: string): number {
  return Math.round(Number(value));
}

function mapRemoteLines(lines: SaleLineApi[] | undefined): LocalSaleLine[] {
  if (!lines || lines.length === 0) return [];
  return lines.map((line, index) => {
    const quantity = Number(line.quantity);
    return {
      id: `${line.product_id ?? "line"}-${index}`,
      productId: line.product_id ?? "",
      name: line.product_name,
      unitPricePesos: moneyToPesos(line.unit_price),
      quantityMillis: Math.round(quantity * 1000),
      unit: line.unit as Unit,
      priceType: "fixed",
      priceUnit: line.unit as Unit,
      iva: line.iva as Iva,
      lineTotal: moneyToPesos(line.line_total),
    };
  });
}

function asPaymentMethod(value: string): PaymentMethod {
  if (value === "transfer" || value === "card" || value === "cash") {
    return value;
  }
  return "cash";
}

/**
 * Merges a server sale into IndexedDB.
 * Pending local rows are only updated with invoice metadata after sync.
 * Remote-only sales are inserted as synced.
 */
export async function upsertRemoteSale(remote: SaleOut): Promise<void> {
  const existing = await db.sales.get(remote.id);
  const invoiceStatus: LocalInvoiceStatus =
    remote.invoice?.status ?? existing?.invoiceStatus ?? "pending";
  const invoiceNumber =
    remote.invoice?.number ?? existing?.invoiceNumber ?? null;
  const remoteLines = mapRemoteLines(remote.lines);

  if (existing) {
    const keepPending =
      existing.syncStatus === "pending" || existing.syncStatus === "error";
    await db.sales.put({
      ...existing,
      soldAt: remote.sold_at || existing.soldAt,
      subtotal: moneyToPesos(remote.subtotal),
      tax: moneyToPesos(remote.tax),
      total: moneyToPesos(remote.total),
      paymentMethod: asPaymentMethod(remote.payment_method),
      cashReceivedPesos:
        remote.cash_received === null
          ? existing.cashReceivedPesos
          : moneyToPesos(remote.cash_received),
      invoiceNumber,
      invoiceStatus: keepPending ? existing.invoiceStatus : invoiceStatus,
      serverInvoiceStatus: invoiceStatus,
      syncStatus: keepPending ? existing.syncStatus : "synced",
      lines:
        remoteLines.length > 0
          ? remoteLines
          : existing.lines.length > 0
            ? existing.lines
            : [],
    });
    return;
  }

  const sale: LocalSale = {
    id: remote.id,
    internalNumber: remote.internal_number,
    soldAt: remote.sold_at,
    lines: remoteLines,
    subtotal: moneyToPesos(remote.subtotal),
    tax: moneyToPesos(remote.tax),
    total: moneyToPesos(remote.total),
    paymentMethod: asPaymentMethod(remote.payment_method),
    cashReceivedPesos:
      remote.cash_received === null
        ? null
        : moneyToPesos(remote.cash_received),
    changePesos: null,
    customerMode: remote.customer_id ? "named" : "final",
    customer: null,
    invoiceStatus,
    syncStatus: "synced",
    invoiceNumber,
    serverInvoiceStatus: invoiceStatus,
  };
  await db.sales.put(sale);
}

/** Invoices that still need to reach the DIAN (pending/sent or unsynced). */
export async function countRetryInvoices(): Promise<number> {
  const sales = await listLocalSales();
  return sales.filter(needsRetry).length;
}

export function needsRetry(sale: LocalSale): boolean {
  if (sale.syncStatus === "pending" || sale.syncStatus === "error") {
    return true;
  }
  const status = sale.serverInvoiceStatus ?? sale.invoiceStatus;
  return status === "pending" || status === "sent";
}

export function displayInvoiceStatus(
  sale: LocalSale,
): "accepted" | "pending" | "rejected" {
  if (sale.syncStatus === "pending" || sale.syncStatus === "error") {
    return "pending";
  }
  const status = sale.serverInvoiceStatus ?? sale.invoiceStatus;
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  return "pending";
}
