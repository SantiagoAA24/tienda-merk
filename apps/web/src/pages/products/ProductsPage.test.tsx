import "fake-indexeddb/auto";

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { replaceAllProducts } from "@/db/products";
import { db } from "@/db/schema";
import type { Product } from "@/products/types";
import {
  admin,
  installFetch,
  jsonResponse,
  seller,
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
});

function mockSession(
  role: "admin" | "seller",
  products: Product[] = [],
) {
  const user = role === "admin" ? admin : seller;
  installFetch((path) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", user));
    }
    if (path === "/products" || path.startsWith("/products?")) {
      return jsonResponse(200, products);
    }
    return jsonResponse(404, { detail: path });
  });
}

describe("ProductsPage", () => {
  it("shows empty state when there are no products", async () => {
    mockSession("admin", []);
    await replaceAllProducts([]);
    await renderApp("/productos");

    expect(
      await screen.findByRole("heading", { name: "Agrega tu primer producto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Agregar producto/i }),
    ).toBeInTheDocument();
  });

  it("filters Todos / Por peso / Precio fijo", async () => {
    const user = userEvent.setup();
    mockSession("admin", catalog);
    await replaceAllProducts(catalog);
    await renderApp("/productos");

    expect(await screen.findByText("Papa pastusa")).toBeInTheDocument();
    expect(screen.getByText("Huevos AA")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Por peso" }));
    await waitFor(() => {
      const list = screen.getByRole("region", { name: "Lista de productos" });
      expect(within(list).getByText("Papa pastusa")).toBeInTheDocument();
      expect(within(list).queryByText("Huevos AA")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Precio fijo" }));
    await waitFor(() => {
      const list = screen.getByRole("region", { name: "Lista de productos" });
      expect(within(list).getByText("Huevos AA")).toBeInTheDocument();
      expect(within(list).queryByText("Papa pastusa")).not.toBeInTheDocument();
    });
  });
});

describe("ProductFormPage", () => {
  it("hides cost for seller and shows IVA help", async () => {
    mockSession("seller");
    await renderApp("/productos/nuevo");

    expect(
      await screen.findByRole("heading", { name: "Nuevo producto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Si no estás seguro de cuál aplica, pregúntale a tu contador.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Costo/i)).not.toBeInTheDocument();
  });

  it("shows cost for admin and toggles weight unit field", async () => {
    const user = userEvent.setup();
    mockSession("admin");
    await renderApp("/productos/nuevo");

    expect(await screen.findByLabelText(/Costo por kg/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre del producto"), "Papa");
    await user.type(screen.getByLabelText(/Precio por kg/i), "4500");
    expect(
      screen.getByRole("button", { name: /Guardar producto/i }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Precio fijo" }));
    expect(screen.queryByRole("button", { name: "kg" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Por peso" }));
    expect(screen.getByRole("button", { name: "kg" })).toBeInTheDocument();
  });
});
