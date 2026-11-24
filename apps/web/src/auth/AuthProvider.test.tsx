import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setSession } from "./api";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./context";
import { loadProfile, saveProfile } from "./profileStore";
import {
  installFetch,
  jsonResponse,
  seller,
  tokenResponse,
} from "@/test/fetchMock";

function Probe() {
  const { state, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="status">
        {state.status}
        {state.status === "authenticated" && state.offline ? " offline" : ""}
      </p>
      {state.status === "authenticated" ? <p>{state.user.name}</p> : null}
      <button
        type="button"
        onClick={() => void login("luisa", "clave-123", true)}
      >
        entrar
      </button>
      <button type="button" onClick={() => void logout()}>
        salir
      </button>
    </div>
  );
}

async function renderProvider() {
  await act(async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}

afterEach(() => {
  cleanup();
  setSession(null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AuthProvider", () => {
  it("restores the session when the app opens", async () => {
    installFetch(() => jsonResponse(200, tokenResponse()));

    await renderProvider();

    expect(await screen.findByText("Luisa")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
  });

  it("is anonymous when the refresh cookie is no longer valid", async () => {
    saveProfile(seller);
    installFetch(() => jsonResponse(401, { detail: "Tu sesión terminó." }));

    await renderProvider();

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
    expect(loadProfile()).toBeNull();
  });

  it("opens offline with the saved profile when there is no internet", async () => {
    saveProfile(seller);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await renderProvider();

    expect(
      await screen.findByText("authenticated offline"),
    ).toBeInTheDocument();
    expect(screen.getByText("Luisa")).toBeInTheDocument();
  });

  it("goes back online when the connection returns", async () => {
    saveProfile(seller);
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    await renderProvider();
    expect(
      await screen.findByText("authenticated offline"),
    ).toBeInTheDocument();

    fetchMock.mockResolvedValue(jsonResponse(200, tokenResponse()));
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(await screen.findByText("authenticated")).toBeInTheDocument();
  });

  it("is anonymous offline without a saved profile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await renderProvider();

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
  });

  it("login with keep session saves the profile and logout clears it", async () => {
    const user = userEvent.setup();
    installFetch((path) => {
      if (path === "/auth/refresh") {
        return jsonResponse(401);
      }
      if (path === "/auth/login") {
        return jsonResponse(200, tokenResponse());
      }
      return jsonResponse(204);
    });
    await renderProvider();
    expect(await screen.findByText("anonymous")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "entrar" }));
    expect(await screen.findByText("Luisa")).toBeInTheDocument();
    expect(loadProfile()).toEqual(seller);

    await user.click(screen.getByRole("button", { name: "salir" }));
    expect(await screen.findByText("anonymous")).toBeInTheDocument();
    expect(loadProfile()).toBeNull();
  });
});
