import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import type { SaleOut } from "@/sales/api";

import { db } from "./schema";
import { listLocalSales, upsertRemoteSale } from "./sales";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const remote: SaleOut = {
  id: "11111111-1111-1111-1111-111111111111",
  sold_at: "2026-11-21T19:42:00-05:00",
  internal_number: "V-0007",
  subtotal: "18700",
  tax: "0",
  total: "18700",
  payment_method: "transfer",
  cash_received: null,
  customer_id: null,
  invoice: {
    id: "22222222-2222-2222-2222-222222222222",
    number: "FE-0231",
    status: "accepted",
  },
};

describe("upsertRemoteSale", () => {
  it("inserts a remote sale as synced", async () => {
    await upsertRemoteSale(remote);
    const rows = await listLocalSales();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.invoiceNumber).toBe("FE-0231");
    expect(rows[0]?.invoiceStatus).toBe("accepted");
    expect(rows[0]?.syncStatus).toBe("synced");
    expect(rows[0]?.paymentMethod).toBe("transfer");
  });

  it("keeps pending local sync while updating server invoice fields", async () => {
    await db.sales.put({
      id: remote.id,
      internalNumber: "V-0007",
      soldAt: remote.sold_at,
      lines: [],
      subtotal: 18700,
      tax: 0,
      total: 18700,
      paymentMethod: "transfer",
      cashReceivedPesos: null,
      changePesos: null,
      customerMode: "final",
      customer: null,
      invoiceStatus: "pending",
      syncStatus: "pending",
    });

    await upsertRemoteSale(remote);
    const row = (await listLocalSales())[0];
    expect(row?.syncStatus).toBe("pending");
    expect(row?.invoiceStatus).toBe("pending");
    expect(row?.serverInvoiceStatus).toBe("accepted");
  });
});
