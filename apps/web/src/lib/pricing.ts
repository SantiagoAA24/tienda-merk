import type { PriceType, Unit } from "@/products/types";

/**
 * TODO(contador): confirmar equivalencia de libra para facturación.
 * Usamos libra comercial de tienda: 1 lb = 500 g.
 */
export const MG_PER_UNIT: Record<Exclude<Unit, "und">, number> = {
  g: 1_000,
  kg: 1_000_000,
  lb: 500_000,
};

export type LinePriceInput = {
  unitPricePesos: number;
  /** Quantity in thousandths of `quantityUnit` (2,5 → 2500). */
  quantityMillis: number;
  quantityUnit: Unit;
  priceUnit: Unit;
  priceType: PriceType;
};

export type PricedLine = {
  lineTotal: number;
};

export type SaleTotals = {
  subtotal: number;
  /** TODO(contador): calcular desglose de IVA; por ahora 0. */
  tax: number;
  total: number;
};

/** Converts quantity millis of a weight unit into milligrams. */
export function quantityMillisToMg(
  quantityMillis: number,
  unit: Exclude<Unit, "und">,
): number {
  return (quantityMillis * MG_PER_UNIT[unit]) / 1000;
}

/**
 * Line total in integer pesos.
 * Fixed: unitPrice × (quantityMillis / 1000), rounded.
 * Weight: convert quantity to the price unit via mg, then multiply.
 */
export function lineTotalPesos(input: LinePriceInput): number {
  const { unitPricePesos, quantityMillis, quantityUnit, priceUnit, priceType } =
    input;

  if (
    !Number.isFinite(unitPricePesos) ||
    !Number.isFinite(quantityMillis) ||
    quantityMillis <= 0 ||
    unitPricePesos < 0
  ) {
    return 0;
  }

  if (priceType === "fixed") {
    return Math.round((unitPricePesos * quantityMillis) / 1000);
  }

  if (quantityUnit === "und" || priceUnit === "und") {
    return 0;
  }

  const qtyMg = quantityMillisToMg(quantityMillis, quantityUnit);
  const mgPerPriceUnit = MG_PER_UNIT[priceUnit];
  // (unitPrice * qtyMg) / mgPerPriceUnit, rounded to nearest peso.
  return Math.round((unitPricePesos * qtyMg) / mgPerPriceUnit);
}

export function saleTotals(lines: readonly PricedLine[]): SaleTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { subtotal, tax: 0, total: subtotal };
}

/** Parses a decimal display string ("2,5" or "2.5") into quantity millis. */
export function parseQuantityToMillis(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || normalized === ".") {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 1000);
}

/** Formats quantity millis back to a keypad-friendly string with comma. */
export function millisToQuantityInput(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) {
    return "";
  }
  const whole = Math.trunc(millis / 1000);
  const frac = millis % 1000;
  if (frac === 0) {
    return String(whole);
  }
  const fracStr = String(frac).padStart(3, "0").replace(/0+$/, "");
  return `${whole},${fracStr}`;
}
