import "fake-indexeddb/auto";

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setSession } from "@/auth/api";
import { db } from "@/db/schema";
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

function mockSession() {
  installFetch((path) => {
    if (path === "/auth/refresh") {
      return jsonResponse(200, tokenResponse("tok", seller));
    }
    if (path.startsWith("/sales")) {
      return jsonResponse(200, []);
    }
    if (path.startsWith("/stats/top-products")) {
      return jsonResponse(200, []);
    }
    if (path.startsWith("/stats")) {
      return jsonResponse(200, {
        period: "day",
        from_date: "2026-11-21",
        to_date: "2026-11-21",
        total: "0",
        sale_count: 0,
        average_ticket: "0",
        previous_total: "0",
        invoices_accepted: 0,
        invoices_total: 0,
        daily: [],
      });
    }
    return jsonResponse(404, { detail: path });
  });
}

describe("MorePage", () => {
  it("navigates to day closing", async () => {
    const user = userEvent.setup();
    mockSession();
    await renderApp("/mas");

    expect(
      await screen.findByRole("heading", { name: "Más" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cierre del día/i }));
    expect(
      await screen.findByRole("heading", { name: "Cierre del día" }),
    ).toBeInTheDocument();
  });
});
