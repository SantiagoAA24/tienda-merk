import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setSession } from "@/auth/api";
import type { FetchHandler } from "@/test/fetchMock";
import { installFetch, jsonResponse } from "@/test/fetchMock";
import { renderApp } from "@/test/renderApp";

function api(onReset: FetchHandler): FetchHandler {
  return (path, init) =>
    path === "/auth/password-reset-requests"
      ? onReset(path, init)
      : jsonResponse(401);
}

afterEach(() => {
  cleanup();
  setSession(null);
  vi.unstubAllGlobals();
});

describe("RecoverPasswordPage", () => {
  it("shows screen 22 with a back link to login", async () => {
    installFetch(api(() => jsonResponse(202)));
    await renderApp("/recuperar-contrasena");

    expect(
      screen.getByRole("heading", { name: "Recuperar contraseña" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/iniciar-sesion",
    );
    expect(
      screen.getByText(
        "Si eres quien administra, escríbele a soporte desde el correo de la tienda.",
      ),
    ).toBeInTheDocument();
  });

  it("sends the request and confirms", async () => {
    const fetchMock = installFetch(api(() => jsonResponse(202)));
    await renderApp("/recuperar-contrasena");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Usuario"), " luisa ");
    await user.click(
      screen.getByRole("button", { name: "Pedir contraseña nueva" }),
    );

    expect(
      await screen.findByText(/Le avisamos a quien administra/),
    ).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/auth/password-reset-requests"),
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ username: "luisa" });
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toHaveAttribute("href", "/iniciar-sesion");
  });

  it("asks for the username first", async () => {
    installFetch(api(() => jsonResponse(202)));
    await renderApp("/recuperar-contrasena");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Pedir contraseña nueva" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe tu usuario.");
  });

  it("explains when there is no connection", async () => {
    installFetch(
      api(() => {
        throw new TypeError("offline");
      }),
    );
    await renderApp("/recuperar-contrasena");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Usuario"), "luisa");
    await user.click(
      screen.getByRole("button", { name: "Pedir contraseña nueva" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay conexión",
    );
  });
});
