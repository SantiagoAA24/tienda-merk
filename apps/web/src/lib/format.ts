import type { PriceType, Unit } from "@/products/types";

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Formats integer pesos as `$184.500`. */
export function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "$0";
  }
  // es-CO inserts a narrow/no-break space after `$`; strip it for the design format.
  return moneyFormatter.format(Math.round(amount)).replace(/\$\s*/, "$");
}

export function formatProductPrice(
  price: string | number,
  priceType: PriceType,
  unit: Unit,
): string {
  const money = formatMoney(price);
  if (priceType === "fixed") {
    return `${money} c/u`;
  }
  return `${money} / ${unit}`;
}

/**
 * Formats a quantity with Colombian comma decimals and unit.
 * Accepts either a decimal number (2.5) or millis of the unit (2500 → 2,5).
 */
export function formatQuantity(
  quantity: number,
  unit: Unit,
  options?: { asMillis?: boolean },
): string {
  const value = options?.asMillis ? quantity / 1000 : quantity;
  if (!Number.isFinite(value)) {
    return `0 ${unit}`;
  }
  return `${quantityFormatter.format(value)} ${unit}`;
}

/** Formats time as `7:42 p. m.` (Spanish Colombia). */
export function formatTime(date: Date): string {
  return normalizeAmPm(timeFormatter.format(date));
}

/** Formats short date as `Sáb 21 nov`. */
export function formatShortDate(date: Date): string {
  const parts = shortDateFormatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const cleanWeekday = capitalize(
    weekday.replace(/\.$/, "").replace(/^\w/, (c) => c.toLowerCase()),
  );
  // es-CO often yields "sáb", "21", "nov" — join without commas.
  return `${cleanWeekday} ${day} ${month.replace(/\.$/, "")}`.trim();
}

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Formats long date as `Sábado, 21 de noviembre`. */
export function formatLongDate(date: Date): string {
  const parts = longDateFormatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${capitalize(weekday)}, ${day} de ${month}`;
}

/** Formats invoice consecutive as `FE-0231`. */
export function formatInvoiceNumber(
  consecutive: number | string,
  prefix = "FE",
): string {
  const n =
    typeof consecutive === "number"
      ? consecutive
      : Number.parseInt(String(consecutive).replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 0) {
    return `${prefix}-0000`;
  }
  return `${prefix}-${String(Math.trunc(n)).padStart(4, "0")}`;
}

function normalizeAmPm(value: string): string {
  return value
    .replace(/\u202f|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bam\b/gi, "a. m.")
    .replace(/\bpm\b/gi, "p. m.")
    .trim();
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
