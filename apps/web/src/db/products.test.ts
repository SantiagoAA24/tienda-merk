import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import type { Product } from "@/products/types";

import {
  clearProducts,
  getProductById,
  listLocalProducts,
  replaceAllProducts,
  upsertProduct,
} from "./products";
import { db } from "./schema";

const papa: Product = {
  id: "p1",
  name: "Papa pastusa",
  price_type: "weight",
  price: "3200",
  unit: "kg",
  iva: "excluido",
  active: true,
};

const huevos: Product = {
  id: "p2",
  name: "Huevos AA",
  price_type: "fixed",
  price: "600",
  unit: "und",
  iva: "excluido",
  active: true,
};

const viejo: Product = {
  id: "p3",
  name: "Viejo",
  price_type: "fixed",
  price: "100",
  unit: "und",
  iva: "excluido",
  active: false,
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("local products store", () => {
  it("replaces and filters the catalog", async () => {
    await replaceAllProducts([papa, huevos, viejo]);

    expect(await listLocalProducts()).toEqual([huevos, papa]);
    expect(await listLocalProducts({ priceType: "weight" })).toEqual([papa]);
    expect(await listLocalProducts({ query: "hue" })).toEqual([huevos]);
  });

  it("upserts a single product", async () => {
    await upsertProduct(papa);
    expect(await getProductById("p1")).toEqual(papa);
    await clearProducts();
    expect(await listLocalProducts()).toEqual([]);
  });
});
