import type { Iva, PriceType, Unit } from "./types";
import { WEIGHT_UNITS } from "./types";

export type ProductFormValues = {
  name: string;
  priceType: PriceType;
  price: string;
  unit: Unit;
  iva: Iva;
  cost: string;
};

export type ProductFormErrors = Partial<
  Record<"name" | "price" | "unit" | "cost", string>
>;

export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) {
    return null;
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value);
}

export function validateProductForm(
  values: ProductFormValues,
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Escribe el nombre del producto.";
  }
  const price = parseMoneyInput(values.price);
  if (price === null) {
    errors.price = "Ingresa un precio válido.";
  }
  if (values.priceType === "weight" && !WEIGHT_UNITS.includes(values.unit)) {
    errors.unit = "Elige g, kg o lb.";
  }
  if (values.cost.trim()) {
    const cost = parseMoneyInput(values.cost);
    if (cost === null) {
      errors.cost = "Ingresa un costo válido.";
    }
  }
  return errors;
}

export function formToCreateBody(
  values: ProductFormValues,
  includeCost: boolean,
) {
  const price = parseMoneyInput(values.price);
  if (price === null) {
    throw new Error("Precio inválido");
  }
  const body: {
    name: string;
    price_type: PriceType;
    price: string;
    unit?: Unit;
    iva: Iva;
    cost?: string;
  } = {
    name: values.name.trim(),
    price_type: values.priceType,
    price: String(price),
    iva: values.iva,
  };
  if (values.priceType === "weight") {
    body.unit = values.unit;
  }
  if (includeCost && values.cost.trim()) {
    const cost = parseMoneyInput(values.cost);
    if (cost !== null) {
      body.cost = String(cost);
    }
  }
  return body;
}
