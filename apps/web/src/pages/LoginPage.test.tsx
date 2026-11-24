import "fake-indexeddb/auto";

import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSession } from "@/auth/api";
import { loadProfile } from "@/auth/profileStore";
import { db } from "@/db/schema";
import type { FetchHandler } from "@/test/fetchMock";
import { installFetch, jsonResponse, tokenResponse } from "@/test/fetchMock";
import { renderApp } from "@/test/renderApp";

const INVALID =
  "Usuario o contraseña incorrectos. Revísalos e intenta de nuevo.";

const emptySummary = {
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
};

function homeApiExtras(path: string): Response | null {
  if (path.startsWith("/sales")) {
    return jsonResponse(200, []);
  }
  if (path.startsWith("/stats/top-products")) {
    return jsonResponse(200, []);
  }
  if (path.startsWith("/stats")) {
    return jsonResponse(200, emptySummary);
  }
  return null;
}

function anonymousApi(onLogin: FetchHandler): FetchHandler {
  return (path, init) => {
    if (path === "/auth/refresh") {
      return jsonResponse(401, { detail: "Tu sesión terminó." });
    }
    if (path === "/auth/login") {
      return onLogin(path, init);
    }
    const home = homeApiExtras(path);
    if (home) return home;
    return jsonResponse(204);
  };
}

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Usuario"), username);
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  return user;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  cleanup();
  setSession(null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("shows screen 10 with labelled fields and one primary action", async () => {
    installFetch(anonymousApi(() => jsonResponse(500)));
    await renderApp("/iniciar-sesion");

    expect(
      screen.getByRole("heading", { name: "Tienda Express Merk" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("checkbox", { name: "Mantener sesión en este celular" }),
    ).toBeChecked();
    expect(
      screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }),
    ).toHaveAttribute("href", "/recuperar-contrasena");
    expect(document.querySelectorAll(".tem-btn--primary")).toHaveLength(1);
  });

  it("logs in, sends keep_session and goes to the protected home", async () => {
    const fetchMock = installFetch(
      anonymousApi(() => jsonResponse(200, tokenResponse())),
    );
    await renderApp("/iniciar-sesion");

    await fillAndSubmit("luisa", "clave-123");

    expect(
      await screen.findByRole("button", { name: /Nueva venta/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ventas de hoy")).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/auth/login"),
    );
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      username: "luisa",
      password: "clave-123",
      keep_session: true,
    });
    expect(loadProfile()?.username).toBe("luisa");
  });

  it("does not keep the profile when the checkbox is unchecked", async () => {
    const fetchMock = installFetch(
      anonymousApi(() => jsonResponse(200, tokenResponse())),
    );
    await renderApp("/iniciar-sesion");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("checkbox", { name: "Mantener sesión en este celular" }),
    );

    await fillAndSubmit("luisa", "clave-123");

    expect(
      await screen.findByRole("button", { name: /Nueva venta/i }),
    ).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/auth/login"),
    );
    expect(JSON.parse(String(loginCall?.[1]?.body)).keep_session).toBe(false);
    expect(loadProfile()).toBeNull();
  });

  it("shows screen 11 when the credentials are wrong", async () => {
    installFetch(
      anonymousApi(() =>
        jsonResponse(401, { detail: "Usuario o contraseña incorrectos." }),
      ),
    );
    await renderApp("/iniciar-sesion");

    await fillAndSubmit("merk", "mala-clave");

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID);
    expect(screen.getByLabelText("Usuario")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Usuario")).toHaveValue("merk");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("asks for both fields before calling the API", async () => {
    const fetchMock = installFetch(anonymousApi(() => jsonResponse(500)));
    await renderApp("/iniciar-sesion");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escribe tu usuario y tu contraseña.",
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith("/auth/login")),
    ).toBe(false);
  });

  it("explains when there is no connection", async () => {
    installFetch(
      anonymousApi(() => {
        throw new TypeError("offline");
      }),
    );
    await renderApp("/iniciar-sesion");

    await fillAndSubmit("luisa", "clave-123");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay conexión",
    );
  });

  it("shows and hides the password", async () => {
    installFetch(anonymousApi(() => jsonResponse(500)));
    await renderApp("/iniciar-sesion");
    const user = userEvent.setup();
    const input = screen.getByLabelText("Contraseña");

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "text");

    await user.click(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "password");
  });

  it("sends anonymous visitors of protected routes to login", async () => {
    installFetch(anonymousApi(() => jsonResponse(500)));
    await renderApp("/");

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("logs out from Más and returns to login", async () => {
    installFetch((path) => {
      if (path === "/auth/refresh") {
        return jsonResponse(200, tokenResponse());
      }
      if (path === "/auth/logout") {
        return jsonResponse(204);
      }
      const home = homeApiExtras(path);
      if (home) return home;
      return jsonResponse(204);
    });
    await renderApp("/mas");
    expect(
      await screen.findByRole("heading", { name: "Más" }),
    ).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Cerrar sesión/i }));

    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
  });
});
