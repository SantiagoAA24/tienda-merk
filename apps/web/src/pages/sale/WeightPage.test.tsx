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

const papa: Product = {
  id: "1",
  name: "Papa pastusa",
  price_type: "weight",
  price: "3200",
  unit: "kg",
  iva: "excluido",
  active: true,
};

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
  await replaceAllProducts([papa]);
});

describe("WeightPage", () => {
  it("adds weighed product with shortcut", async () => {
    const user = userEvent.setup();
    await renderApp("/venta/peso/1");

    expect(await screen.findByText("Papa pastusa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "1 kg" }));
    expect(screen.getByText("$3.200")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Agregar a la venta/i }),
    );

    await waitFor(async () => {
      const cart = await getCart();
      expect(cart.lines).toHaveLength(1);
      expect(cart.lines[0]?.lineTotal).toBe(3200);
      expect(cart.lines[0]?.quantityMillis).toBe(1000);
    });

    expect(
      await screen.findByRole("heading", { name: "Nueva venta" }),
    ).toBeInTheDocument();
  });
});
