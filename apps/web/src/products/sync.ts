import { replaceAllProducts } from "@/db/products";

import { listProducts } from "./api";
import type { Product } from "./types";

let syncInFlight: Promise<Product[]> | null = null;

/** Pulls the catalog from the API into IndexedDB. */
export async function syncProducts(): Promise<Product[]> {
  if (!syncInFlight) {
    syncInFlight = (async () => {
      const products = await listProducts();
      await replaceAllProducts(products);
      return products;
    })().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}
