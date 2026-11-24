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

function mockSession(salesRemote: unknown[] = []) {
  installFetch((path) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", seller));
    }
    if (path.startsWith("/sales")) {
      return jsonResponse(200, salesRemote);
    }
    return jsonResponse(404, { detail: path });
  });
}

const localSale: LocalSale = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  internalNumber: "V-0001",
  soldAt: new Date().toISOString(),
  lines: [],
  subtotal: 15000,
  tax: 0,
  total: 15000,
  paymentMethod: "cash",
  cashReceivedPesos: 15000,
  changePesos: 0,
  customerMode: "final",
  customer: null,
  invoiceStatus: "pending",
  syncStatus: "pending",
};

describe("VentasPage", () => {
  it("shows empty state for today", async () => {
    mockSession([]);
    await renderApp("/ventas");

    expect(
      await screen.findByRole("heading", { name: "Ventas" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Aún no hay ventas hoy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nueva venta/i }),
    ).toBeInTheDocument();
  });

  it("lists local pending sales with retry banner", async () => {
    mockSession([]);
    await db.sales.put(localSale);
    await renderApp("/ventas");

    expect(
      await screen.findByText(/V-0001 · \$15\.000/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/1 factura por reenviar/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar" })).toBeInTheDocument();
  });

  it("switches period filters", async () => {
    const user = userEvent.setup();
    mockSession([]);
    await renderApp("/ventas");

    await screen.findByRole("heading", { name: "Aún no hay ventas hoy" });
    await user.click(screen.getByRole("button", { name: "Ayer" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Aún no hay ventas de ayer" }),
      ).toBeInTheDocument();
    });
  });
});
