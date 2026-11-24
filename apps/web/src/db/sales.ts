import { saleTotals } from "@/lib/pricing";
import type { LocalSale, LocalSaleLine, LocalInvoiceStatus } from "@/sales/types";

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
