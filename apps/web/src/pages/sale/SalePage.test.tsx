import "fake-indexeddb/auto";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { getCart } from "@/db/cart";
import { replaceAllProducts } from "@/db/products";
import { db } from "@/db/schema";
import type { Product } from "@/products/types";
import {
  admin,
  installFetch,
  jsonResponse,
  tokenResponse,
} from "@/test/fetchMock";
import { renderApp } from "@/test/renderApp";

const catalog: Product[] = [
  {
    id: "1",
    name: "Papa pastusa",
    price_type: "weight",
    price: "3200",
    unit: "kg",
    iva: "excluido",
    active: true,
  },
  {
    id: "2",
    name: "Huevos AA",
    price_type: "fixed",
    price: "600",
    unit: "und",
    iva: "excluido",
    active: true,
  },
];

beforeEach(async () => {
  await db.delete();
  await db.open();
  setSession(null);
  installFetch((path) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", admin));
    }
    if (path === "/products" || path.startsWith("/products?")) {
      return jsonResponse(200, catalog);
    }
    return jsonResponse(404, { detail: path });
  });
  await replaceAllProducts(catalog);
});

describe("SalePage", () => {
  it("adds fixed products and keeps cart after reload", async () => {
    const user = userEvent.setup();
    await renderApp("/venta");

    expect(
      await screen.findByRole("heading", { name: "Nueva venta" }),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Huevos AA/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cobrar" })).toBeEnabled();
    });
    expect(screen.getByText(/1 und/)).toBeInTheDocument();

    const cart = await getCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.lineTotal).toBe(600);
  });

  it("opens weight keypad for weight products", async () => {
    const user = userEvent.setup();
    await renderApp("/venta");

    await user.click(
      await screen.findByRole("button", { name: /Papa pastusa/i }),
    );
    expect(
      await screen.findByRole("button", { name: /Agregar a la venta/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("$8.000")).toBeInTheDocument();
  });
});
