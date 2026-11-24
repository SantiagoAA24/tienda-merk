import "fake-indexeddb/auto";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { db } from "@/db/schema";
import type { LocalSale } from "@/sales/types";
import {
  installFetch,
  jsonResponse,
  seller,
  tokenResponse,
} from "@/test/fetchMock";
import { renderApp } from "@/test/renderApp";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setSession(null);
});

function mockSession(handlers?: (path: string, init?: RequestInit) => Response | null) {
  installFetch((path, init) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", seller));
    }
    if (path.startsWith("/sales") && (!init || init.method === undefined || init.method === "GET")) {
      return jsonResponse(200, []);
    }
    const custom = handlers?.(path, init);
    if (custom) return custom;
    return jsonResponse(404, { detail: path });
  });
}

describe("ClosingPage", () => {
  it("computes expected cash and posts closing", async () => {
    const user = userEvent.setup();
    let posted: unknown = null;
    mockSession((path, init) => {
      if (path === "/closings" && init?.method === "POST") {
        posted = JSON.parse(String(init.body));
        return jsonResponse(201, {
          id: "c1",
          closing_date: "2026-11-21",
          opening_cash: "50000",
          expected_cash: "60000",
          counted_cash: "60000",
          difference: "0",
          created_at: "2026-11-21T20:00:00-05:00",
        });
      }
      return null;
    });

    const sale: LocalSale = {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      internalNumber: "V-0002",
      soldAt: new Date().toISOString(),
      lines: [],
      subtotal: 10000,
      tax: 0,
      total: 10000,
      paymentMethod: "cash",
      cashReceivedPesos: 10000,
      changePesos: 0,
      customerMode: "final",
      customer: null,
      invoiceStatus: "accepted",
      syncStatus: "synced",
      invoiceNumber: "FE-0002",
    };
    await db.sales.put(sale);

    await renderApp("/cierre");

    expect(
      await screen.findByRole("heading", { name: "Cierre del día" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/1 venta · \$10\.000 por venta/),
    ).toBeInTheDocument();

    const counted = screen.getByLabelText("Efectivo contado");
    await user.clear(counted);
    await user.type(counted, "60000");

    await user.click(screen.getByRole("button", { name: "Cerrar el día" }));

    await waitFor(() => {
      expect(posted).toMatchObject({
        opening_cash: "50000",
        counted_cash: "60000",
      });
    });
    expect(
      await screen.findByRole("button", { name: "Día cerrado" }),
    ).toBeInTheDocument();
  });
});
