import type { PriceType, Unit } from "@/products/types";

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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
