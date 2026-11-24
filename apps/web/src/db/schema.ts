import Dexie, { type EntityTable } from "dexie";

import type { Product } from "@/products/types";

export type LocalProduct = Product;

export class TemDatabase extends Dexie {
  products!: EntityTable<LocalProduct, "id">;

  constructor() {
    super("tem");
    this.version(1).stores({
      products: "id, name, price_type, active",
    });
  }
}

export const db = new TemDatabase();
