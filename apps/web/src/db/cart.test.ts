import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  addFixedLine,
  addWeightLine,
  clearCart,
  getCart,
  updateCheckoutDraft,
} from "./cart";
import { db } from "./schema";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("cart", () => {
  it("increments fixed lines for the same product", async () => {
    await addFixedLine({
      productId: "p1",
      name: "Huevos AA",
      unitPricePesos: 600,
      iva: "excluido",
    });
    await addFixedLine({
      productId: "p1",
      name: "Huevos AA",
      unitPricePesos: 600,
      iva: "excluido",
    });
    const cart = await getCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantityMillis).toBe(2000);
    expect(cart.lines[0]?.lineTotal).toBe(1200);
  });

  it("adds weight lines and updates checkout draft", async () => {
    await addWeightLine({
      productId: "p2",
      name: "Papa pastusa",
      unitPricePesos: 3200,
      quantityMillis: 2500,
      unit: "kg",
      priceUnit: "kg",
      priceType: "weight",
      iva: "excluido",
    });
    await updateCheckoutDraft({
      paymentMethod: "transfer",
      customerMode: "named",
      customer: {
        docType: "cc",
        document: "123",
        name: "Ana",
        email: "ana@example.com",
      },
    });
    const cart = await getCart();
    expect(cart.lines[0]?.lineTotal).toBe(8000);
    expect(cart.paymentMethod).toBe("transfer");
    expect(cart.customer?.name).toBe("Ana");
  });

  it("clears the cart", async () => {
    await addFixedLine({
      productId: "p1",
      name: "Huevos AA",
      unitPricePesos: 600,
      iva: "excluido",
    });
    await clearCart();
    const cart = await getCart();
    expect(cart.lines).toHaveLength(0);
  });
});
