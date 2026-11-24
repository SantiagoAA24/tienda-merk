import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { setSession } from "@/auth/api";
import { addFixedLine, updateCheckoutDraft } from "@/db/cart";
import {
  countPendingSales,
  createSaleFromCart,
  getSaleById,
} from "@/db/sales";
import { db } from "@/db/schema";
import {
  installFetch,
  jsonResponse,
  tokenResponse,
} from "@/test/fetchMock";

import {
  getSyncBackoffMs,
  resetSyncBackoff,
  syncPendingSales,
} from "./sync";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setSession(tokenResponse());
  resetSyncBackoff();
  vi.unstubAllGlobals();
});

async function seedPendingSale() {
  await addFixedLine({
    productId: "p1",
    name: "Huevos AA",
    unitPricePesos: 600,
    iva: "excluido",
  });
  await updateCheckoutDraft({
    paymentMethod: "cash",
    cashReceivedPesos: 1000,
  });
  const result = await createSaleFromCart();
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("sale failed");
  return result.sale;
}

describe("syncPendingSales", () => {
  it("posts pending sales and marks them synced", async () => {
    const sale = await seedPendingSale();
    installFetch((path, init) => {
      if (path === "/sales" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { id: string };
        return jsonResponse(201, {
          id: body.id,
          sold_at: sale.soldAt,
          internal_number: sale.internalNumber,
          subtotal: "600",
          tax: "0",
          total: "600",
          payment_method: "cash",
          cash_received: "1000",
          customer_id: null,
          invoice: {
            id: "inv-1",
            number: "FE-0001",
            status: "pending",
          },
          lines: [],
        });
      }
      return jsonResponse(404, { detail: path });
    });

    const synced = await syncPendingSales();
    expect(synced).toBe(1);
    expect(await countPendingSales()).toBe(0);

    const stored = await getSaleById(sale.id);
    expect(stored?.syncStatus).toBe("synced");
    expect(stored?.invoiceNumber).toBe("FE-0001");
    expect(stored?.invoiceStatus).toBe("pending");
  });

  it("stops and increases backoff on network errors", async () => {
    await seedPendingSale();
    installFetch(() => {
      throw new TypeError("offline");
    });

    const before = getSyncBackoffMs();
    const synced = await syncPendingSales();
    expect(synced).toBe(0);
    expect(await countPendingSales()).toBe(1);
    expect(getSyncBackoffMs()).toBe(before * 2);
  });

  it("is idempotent when the server returns 200", async () => {
    const sale = await seedPendingSale();
    let posts = 0;
    installFetch((path, init) => {
      if (path === "/sales" && init?.method === "POST") {
        posts += 1;
        return jsonResponse(200, {
          id: sale.id,
          sold_at: sale.soldAt,
          internal_number: sale.internalNumber,
          subtotal: "600",
          tax: "0",
          total: "600",
          payment_method: "cash",
          cash_received: "1000",
          customer_id: null,
          invoice: {
            id: "inv-1",
            number: "FE-0001",
            status: "pending",
          },
          lines: [],
        });
      }
      return jsonResponse(404, { detail: path });
    });

    expect(await syncPendingSales()).toBe(1);
    expect(await syncPendingSales()).toBe(0);
    expect(posts).toBe(1);
  });
});
