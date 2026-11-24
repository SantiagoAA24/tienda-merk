import "fake-indexeddb/auto";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { addFixedLine, updateCheckoutDraft } from "@/db/cart";
import { getSaleById, listLocalSales } from "@/db/sales";
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
  await addFixedLine({
    productId: "2",
    name: "Huevos AA",
    unitPricePesos: 600,
    iva: "excluido",
  });
});

describe("CheckoutPage", () => {
  it("charges with cash and shows pending invoice status", async () => {
    const user = userEvent.setup();
    await updateCheckoutDraft({
      paymentMethod: "cash",
      cashReceivedPesos: 2000,
    });
    await renderApp("/venta/cobrar");

    expect(
      await screen.findByRole("heading", { name: "Cobrar" }),
    ).toBeInTheDocument();
    const received = await screen.findByLabelText("Recibido");
    await user.clear(received);
    await user.type(received, "2000");

    await user.click(
      screen.getByRole("button", { name: /Cobrar y facturar/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Venta registrada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Por reenviar")).toBeInTheDocument();
    expect(screen.getByText(/Venta V-0001/)).toBeInTheDocument();

    const sales = await listLocalSales();
    expect(sales).toHaveLength(1);
    const stored = await getSaleById(sales[0]!.id);
    expect(stored?.changePesos).toBe(1400);
    expect(stored?.invoiceStatus).toBe("pending");
  });

  it("charges transfer without cash fields", async () => {
    const user = userEvent.setup();
    await renderApp("/venta/cobrar");

    await user.click(await screen.findByRole("button", { name: "Transferencia" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("Recibido")).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /Cobrar y facturar/i }),
    );
    expect(
      await screen.findByRole("heading", { name: "Venta registrada" }),
    ).toBeInTheDocument();
  });
});
