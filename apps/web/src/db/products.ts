import { db, type LocalProduct } from "./schema";

export async function replaceAllProducts(
  products: LocalProduct[],
): Promise<void> {
  await db.transaction("rw", db.products, async () => {
    await db.products.clear();
    if (products.length > 0) {
      await db.products.bulkPut(products);
    }
  });
}

export async function upsertProduct(product: LocalProduct): Promise<void> {
  await db.products.put(product);
}

export async function getProductById(
  id: string,
): Promise<LocalProduct | undefined> {
  return db.products.get(id);
}

export type ListLocalOptions = {
  priceType?: "fixed" | "weight" | "all";
  query?: string;
  activeOnly?: boolean;
};

export async function listLocalProducts(
  options: ListLocalOptions = {},
): Promise<LocalProduct[]> {
  const { priceType = "all", query = "", activeOnly = true } = options;
  const needle = query.trim().toLocaleLowerCase("es-CO");
  const rows = await db.products.orderBy("name").toArray();

  return rows.filter((product) => {
    if (activeOnly && !product.active) {
      return false;
    }
    if (priceType !== "all" && product.price_type !== priceType) {
      return false;
    }
    if (needle && !product.name.toLocaleLowerCase("es-CO").includes(needle)) {
      return false;
    }
    return true;
  });
}

export async function clearProducts(): Promise<void> {
  await db.products.clear();
}
