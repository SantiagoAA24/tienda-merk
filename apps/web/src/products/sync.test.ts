import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { listLocalProducts } from "@/db/products";
import { db } from "@/db/schema";
import { installFetch, jsonResponse, tokenResponse } from "@/test/fetchMock";
import { setSession } from "@/auth/api";

import { syncProducts } from "./sync";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setSession(tokenResponse());
});

describe("syncProducts", () => {
  it("stores API products in IndexedDB", async () => {
    installFetch((path) => {
      if (path === "/products") {
        return jsonResponse(200, [
          {
            id: "p1",
            name: "Arroz",
            price_type: "weight",
            price: "3100",
            unit: "lb",
            iva: "excluido",
            active: true,
          },
        ]);
      }
      return jsonResponse(404, { detail: path });
    });

    const products = await syncProducts();
    expect(products).toHaveLength(1);
    expect(await listLocalProducts()).toEqual(products);
  });
});
