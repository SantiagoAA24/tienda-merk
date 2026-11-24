import { lineTotalPesos } from "@/lib/pricing";
import type { Iva, PriceType, Unit } from "@/products/types";
import {
  EMPTY_CART,
  type CartDraft,
  type CartLine,
  type PaymentMethod,
  type SaleCustomer,
} from "@/sales/types";

import { db } from "./schema";

export async function getCart(): Promise<CartDraft> {
  const cart = await db.cart.get("current");
  return cart ?? { ...EMPTY_CART, lines: [] };
}

export async function setCart(cart: CartDraft): Promise<void> {
  await db.cart.put({
    ...cart,
    id: "current",
    updatedAt: new Date().toISOString(),
  });
}

export async function clearCart(): Promise<void> {
  await db.cart.put({
    ...EMPTY_CART,
    lines: [],
    updatedAt: new Date().toISOString(),
  });
}

type AddFixedInput = {
  productId: string;
  name: string;
  unitPricePesos: number;
  iva: Iva;
};

export async function addFixedLine(input: AddFixedInput): Promise<CartDraft> {
  const cart = await getCart();
  const existing = cart.lines.find(
    (line) => line.productId === input.productId && line.priceType === "fixed",
  );

  let lines: CartLine[];
  if (existing) {
    const quantityMillis = existing.quantityMillis + 1000;
    lines = cart.lines.map((line) =>
      line.id === existing.id
        ? {
            ...line,
            quantityMillis,
            lineTotal: lineTotalPesos({
              unitPricePesos: line.unitPricePesos,
              quantityMillis,
              quantityUnit: "und",
              priceUnit: "und",
              priceType: "fixed",
            }),
          }
        : line,
    );
  } else {
    const quantityMillis = 1000;
    const line: CartLine = {
      id: crypto.randomUUID(),
      productId: input.productId,
      name: input.name,
      unitPricePesos: input.unitPricePesos,
      quantityMillis,
      unit: "und",
      priceType: "fixed",
      priceUnit: "und",
      iva: input.iva,
      lineTotal: lineTotalPesos({
        unitPricePesos: input.unitPricePesos,
        quantityMillis,
        quantityUnit: "und",
        priceUnit: "und",
        priceType: "fixed",
      }),
    };
    lines = [...cart.lines, line];
  }

  const next = { ...cart, lines };
  await setCart(next);
  return next;
}

type AddWeightInput = {
  productId: string;
  name: string;
  unitPricePesos: number;
  quantityMillis: number;
  unit: Exclude<Unit, "und">;
  priceUnit: Exclude<Unit, "und">;
  priceType: PriceType;
  iva: Iva;
};

export async function addWeightLine(input: AddWeightInput): Promise<CartDraft> {
  const cart = await getCart();
  const lineTotal = lineTotalPesos({
    unitPricePesos: input.unitPricePesos,
    quantityMillis: input.quantityMillis,
    quantityUnit: input.unit,
    priceUnit: input.priceUnit,
    priceType: "weight",
  });
  const line: CartLine = {
    id: crypto.randomUUID(),
    productId: input.productId,
    name: input.name,
    unitPricePesos: input.unitPricePesos,
    quantityMillis: input.quantityMillis,
    unit: input.unit,
    priceType: "weight",
    priceUnit: input.priceUnit,
    iva: input.iva,
    lineTotal,
  };
  const next = { ...cart, lines: [...cart.lines, line] };
  await setCart(next);
  return next;
}

export async function removeLine(lineId: string): Promise<CartDraft> {
  const cart = await getCart();
  const next = {
    ...cart,
    lines: cart.lines.filter((line) => line.id !== lineId),
  };
  await setCart(next);
  return next;
}

export async function updateCheckoutDraft(patch: {
  customerMode?: "final" | "named";
  customer?: SaleCustomer | null;
  paymentMethod?: PaymentMethod;
  cashReceivedPesos?: number | null;
}): Promise<CartDraft> {
  const cart = await getCart();
  const next: CartDraft = {
    ...cart,
    ...patch,
    customer:
      patch.customerMode === "final"
        ? null
        : (patch.customer !== undefined ? patch.customer : cart.customer),
  };
  await setCart(next);
  return next;
}
