import type { Iva, PriceType, Unit } from "@/products/types";

export type PaymentMethod = "cash" | "transfer" | "card";

export type SyncStatus = "pending" | "synced" | "error";

export type LocalInvoiceStatus = "pending" | "sent" | "accepted" | "rejected";

export type CustomerDocType = "cc" | "nit" | "other";

export type SaleCustomer = {
  docType: CustomerDocType;
  document: string;
  name: string;
  email: string;
};

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  unitPricePesos: number;
  /** Quantity in thousandths of `unit`. */
  quantityMillis: number;
  unit: Unit;
  priceType: PriceType;
  priceUnit: Unit;
  iva: Iva;
  lineTotal: number;
};

export type CartDraft = {
  id: "current";
  lines: CartLine[];
  customerMode: "final" | "named";
  customer: SaleCustomer | null;
  paymentMethod: PaymentMethod;
  cashReceivedPesos: number | null;
  updatedAt: string;
};

export type LocalSaleLine = {
  id: string;
  productId: string;
  name: string;
  unitPricePesos: number;
  quantityMillis: number;
  unit: Unit;
  priceType: PriceType;
  priceUnit: Unit;
  iva: Iva;
  lineTotal: number;
};

export type LocalSale = {
  id: string;
  internalNumber: string;
  soldAt: string;
  lines: LocalSaleLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceivedPesos: number | null;
  changePesos: number | null;
  customerMode: "final" | "named";
  customer: SaleCustomer | null;
  invoiceStatus: LocalInvoiceStatus;
  syncStatus: SyncStatus;
  /** Assigned by the server after a successful sync (e.g. FE-0232). */
  invoiceNumber?: string | null;
  serverInvoiceStatus?: LocalInvoiceStatus | null;
};

export type CounterRecord = {
  id: "internalNumber";
  value: number;
};

export const EMPTY_CART: CartDraft = {
  id: "current",
  lines: [],
  customerMode: "final",
  customer: null,
  paymentMethod: "cash",
  cashReceivedPesos: null,
  updatedAt: new Date(0).toISOString(),
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

export const DOC_TYPE_LABELS: Record<CustomerDocType, string> = {
  cc: "Cédula",
  nit: "NIT",
  other: "Otro",
};
