import { describe, expect, it } from "vitest";

import { dayRange } from "@/lib/period";
import type { LocalSale } from "./types";
import {
  filterSalesByRange,
  percentDelta,
  summarizeSales,
  topProducts,
} from "./aggregates";

function sale(partial: Partial<LocalSale> & Pick<LocalSale, "id" | "soldAt" | "total">): LocalSale {
  return {
    internalNumber: "V-0001",
    lines: [],
    subtotal: partial.total,
    tax: 0,
    paymentMethod: "cash",
    cashReceivedPesos: partial.total,
    changePesos: 0,
    customerMode: "final",
    customer: null,
    invoiceStatus: "pending",
    syncStatus: "synced",
    ...partial,
  };
}

describe("sales aggregates", () => {
  it("filters by Bogota day and summarizes payments", () => {
    const rows = [
      sale({
        id: "1",
        soldAt: "2026-11-21T12:00:00-05:00",
        total: 10000,
        paymentMethod: "cash",
        invoiceStatus: "accepted",
      }),
      sale({
        id: "2",
        soldAt: "2026-11-21T13:00:00-05:00",
        total: 5000,
        paymentMethod: "transfer",
        invoiceStatus: "pending",
      }),
      sale({
        id: "3",
        soldAt: "2026-11-20T12:00:00-05:00",
        total: 9000,
      }),
    ];
    const filtered = filterSalesByRange(rows, dayRange("2026-11-21"));
    expect(filtered.map((s) => s.id)).toEqual(["2", "1"]);
    const summary = summarizeSales(filtered);
    expect(summary.total).toBe(15000);
    expect(summary.count).toBe(2);
    expect(summary.byPayment.cash).toBe(10000);
    expect(summary.byPayment.transfer).toBe(5000);
    expect(summary.invoicesAccepted).toBe(1);
    expect(summary.retryCount).toBe(1);
  });

  it("ranks top products by line total", () => {
    const rows = [
      sale({
        id: "1",
        soldAt: "2026-11-21T12:00:00-05:00",
        total: 10000,
        lines: [
          {
            id: "l1",
            productId: "p1",
            name: "Arroz",
            unitPricePesos: 2000,
            quantityMillis: 5000,
            unit: "lb",
            priceType: "weight",
            priceUnit: "lb",
            iva: "excluido",
            lineTotal: 10000,
          },
        ],
      }),
      sale({
        id: "2",
        soldAt: "2026-11-21T13:00:00-05:00",
        total: 4000,
        lines: [
          {
            id: "l2",
            productId: "p2",
            name: "Huevos",
            unitPricePesos: 4000,
            quantityMillis: 1000,
            unit: "und",
            priceType: "fixed",
            priceUnit: "und",
            iva: "excluido",
            lineTotal: 4000,
          },
        ],
      }),
    ];
    const top = topProducts(rows, 2);
    expect(top[0]?.name).toBe("Arroz");
    expect(top[0]?.rank).toBe(1);
    expect(top[1]?.name).toBe("Huevos");
  });

  it("computes percent delta", () => {
    expect(percentDelta(108, 100)).toBe(8);
    expect(percentDelta(50, 0)).toBe(100);
    expect(percentDelta(0, 0)).toBeNull();
  });
});
