import Dexie, { type EntityTable } from "dexie";

import type { Product } from "@/products/types";
import type { CartDraft, CounterRecord, LocalSale } from "@/sales/types";

export type LocalProduct = Product;

export class TemDatabase extends Dexie {
  products!: EntityTable<LocalProduct, "id">;
  cart!: EntityTable<CartDraft, "id">;
  sales!: EntityTable<LocalSale, "id">;
  counters!: EntityTable<CounterRecord, "id">;

  constructor() {
    super("tem");
    this.version(1).stores({
      products: "id, name, price_type, active",
    });
    this.version(2).stores({
      products: "id, name, price_type, active",
      cart: "id",
      sales: "id, soldAt, syncStatus, internalNumber",
      counters: "id",
    });
  }
}

export const db = new TemDatabase();
