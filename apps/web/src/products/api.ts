import { apiJson } from "@/auth/api";

import type { Product, ProductCreate, ProductUpdate } from "./types";

export type ListProductsParams = {
  priceType?: "fixed" | "weight";
  q?: string;
};

export async function listProducts(
  params: ListProductsParams = {},
): Promise<Product[]> {
  const search = new URLSearchParams();
  if (params.priceType) {
    search.set("price_type", params.priceType);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  const query = search.toString();
  return apiJson<Product[]>(`/products${query ? `?${query}` : ""}`);
}

export async function createProduct(body: ProductCreate): Promise<Product> {
  return apiJson<Product>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProduct(
  id: string,
  body: ProductUpdate,
): Promise<Product> {
  return apiJson<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
