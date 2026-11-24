import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { authHeader, installFetch, jsonResponse, tokenResponse } from "@/test/fetchMock";

import { createProduct, listProducts, updateProduct } from "./api";

beforeEach(() => {
  setSession(tokenResponse("tok"));
});

describe("products api", () => {
  it("lists with filters and mutates products", async () => {
    const fetchMock = installFetch((path, init) => {
      expect(authHeader(init)).toBe("Bearer tok");
      if (path === "/products?price_type=weight" && !init.method) {
        return jsonResponse(200, []);
      }
      if (path === "/products" && init.method === "POST") {
        const body = JSON.parse(String(init.body)) as { name: string };
        return jsonResponse(201, {
          id: "new",
          name: body.name,
          price_type: "fixed",
          price: "600",
          unit: "und",
          iva: "excluido",
          active: true,
        });
      }
      if (path === "/products/new" && init.method === "PATCH") {
        return jsonResponse(200, {
          id: "new",
          name: "Huevos",
          price_type: "fixed",
          price: "650",
          unit: "und",
          iva: "excluido",
          active: false,
        });
      }
      return jsonResponse(404, { detail: path });
    });

    await listProducts({ priceType: "weight" });
    const created = await createProduct({
      name: "Huevos",
      price_type: "fixed",
      price: "600",
      iva: "excluido",
    });
    expect(created.id).toBe("new");
    const updated = await updateProduct("new", { active: false, price: "650" });
    expect(updated.active).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });
});
