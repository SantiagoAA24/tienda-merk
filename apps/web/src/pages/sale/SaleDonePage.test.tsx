import "fake-indexeddb/auto";

import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { addFixedLine, updateCheckoutDraft } from "@/db/cart";
import { createSaleFromCart, markSaleSynced } from "@/db/sales";
import { db } from "@/db/schema";
import {
  admin,
  installFetch,
  jsonResponse,
  tokenResponse,
} from "@/test/fetchMock";
import { renderApp } from "@/test/renderApp";

beforeEach(async () => {
  await db.delete();
  await db.open();
  setSession(null);
  installFetch((path) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", admin));
    }
    return jsonResponse(404, { detail: path });
  });
});

async function seedSale() {
  await addFixedLine({
    productId: "2",
    name: "Huevos AA",
    unitPricePesos: 600,
    iva: "excluido",
  });
  await updateCheckoutDraft({
    paymentMethod: "cash",
    cashReceivedPesos: 2000,
  });
  const result = await createSaleFromCart();
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("sale failed");
  return result.sale;
}

describe("SaleDonePage", () => {
  it("shows the offline saved screen while the sale is pending sync", async () => {
    const sale = await seedSale();
    await renderApp(`/venta/lista/${sale.id}`);

    expect(
      await screen.findByRole("heading", { name: "Venta guardada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sin internet · las ventas se guardan/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Por reenviar")).toBeInTheDocument();
    expect(screen.getByText("Pendientes por enviar")).toBeInTheDocument();
    expect(screen.getByText(sale.internalNumber)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nueva venta" }),
    ).toBeInTheDocument();
  });

  it("shows the registered screen after the sale is synced", async () => {
    const sale = await seedSale();
    await markSaleSynced(sale.id, {
      invoiceNumber: "FE-0233",
      invoiceStatus: "pending",
    });
    await renderApp(`/venta/lista/${sale.id}`);

    expect(
      await screen.findByRole("heading", { name: "Venta registrada" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Factura FE-0233/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin internet/)).not.toBeInTheDocument();
  });

  it("updates when sync completes while the page is open", async () => {
    const sale = await seedSale();
    await renderApp(`/venta/lista/${sale.id}`);
    expect(
      await screen.findByRole("heading", { name: "Venta guardada" }),
    ).toBeInTheDocument();

    await act(async () => {
      await markSaleSynced(sale.id, {
        invoiceNumber: "FE-0099",
        invoiceStatus: "pending",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Venta registrada" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Factura FE-0099/)).toBeInTheDocument();
  });
});
