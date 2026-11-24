import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { addFixedLine, addWeightLine, getCart, updateCheckoutDraft } from "./cart";
import { createSaleFromCart, getSaleById, nextInternalNumber } from "./sales";
import { db } from "./schema";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("sales", () => {
  it("assigns sequential internal numbers", async () => {
    expect(await nextInternalNumber()).toBe("V-0001");
    expect(await nextInternalNumber()).toBe("V-0002");
  });

  it("creates a sale from the cart and clears it", async () => {
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
    await addFixedLine({
      productId: "p1",
      name: "Huevos AA",
      unitPricePesos: 600,
      iva: "excluido",
    });
    await updateCheckoutDraft({
      paymentMethod: "cash",
      cashReceivedPesos: 20000,
    });

    const result = await createSaleFromCart();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.sale.internalNumber).toBe("V-0001");
    expect(result.sale.total).toBe(8600);
    expect(result.sale.changePesos).toBe(11400);
    expect(result.sale.invoiceStatus).toBe("pending");
    expect(result.sale.syncStatus).toBe("pending");
    expect(result.sale.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const stored = await getSaleById(result.sale.id);
    expect(stored?.lines).toHaveLength(2);
    expect((await getCart()).lines).toHaveLength(0);
  });

  it("rejects cash below total", async () => {
    await addFixedLine({
      productId: "p1",
      name: "Huevos AA",
      unitPricePesos: 600,
      iva: "excluido",
    });
    await updateCheckoutDraft({
      paymentMethod: "cash",
      cashReceivedPesos: 100,
    });
    const result = await createSaleFromCart();
    expect(result.ok).toBe(false);
  });
});
