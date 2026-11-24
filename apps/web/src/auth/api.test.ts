import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  ApiError,
  getAccessToken,
  login,
  logout,
  NetworkError,
  onSessionChange,
  refreshSession,
  requestPasswordReset,
  setSession,
} from "./api";
import {
  authHeader,
  installFetch,
  jsonResponse,
  tokenResponse,
} from "@/test/fetchMock";

afterEach(() => {
  setSession(null);
  vi.unstubAllGlobals();
});

describe("auth api", () => {
  it("login sends credentials, keep_session and stores the token", async () => {
    const fetchMock = installFetch(() => jsonResponse(200, tokenResponse()));

    const session = await login("luisa", "clave-123", true);

    expect(session.user.username).toBe("luisa");
    expect(getAccessToken()).toBe("access-1");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "luisa",
      password: "clave-123",
      keep_session: true,
    });
  });

  it("login failure raises ApiError with the server message", async () => {
    installFetch(() =>
      jsonResponse(401, { detail: "Usuario o contraseña incorrectos." }),
    );

    await expect(login("luisa", "mala", false)).rejects.toMatchObject({
      status: 401,
      message: "Usuario o contraseña incorrectos.",
    });
    expect(getAccessToken()).toBeNull();
  });

  it("network failures become NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(login("luisa", "clave", false)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("apiFetch refreshes once on 401 and retries with the new token", async () => {
    setSession(tokenResponse("vencido"));
    const fetchMock = installFetch((path, init) => {
      if (path === "/auth/refresh") {
        return jsonResponse(200, tokenResponse("nuevo"));
      }
      return authHeader(init) === "Bearer nuevo"
        ? jsonResponse(200, [])
        : jsonResponse(401, { detail: "Tu sesión terminó." });
    });

    const response = await apiFetch("/users");

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/users",
      "/api/auth/refresh",
      "/api/users",
    ]);
    expect(getAccessToken()).toBe("nuevo");
  });

  it("concurrent 401s share a single refresh", async () => {
    setSession(tokenResponse("vencido"));
    const fetchMock = installFetch((path, init) => {
      if (path === "/auth/refresh") {
        return jsonResponse(200, tokenResponse("nuevo"));
      }
      return authHeader(init) === "Bearer nuevo"
        ? jsonResponse(200, [])
        : jsonResponse(401);
    });

    await Promise.all([
      apiFetch("/users"),
      apiFetch("/users"),
      refreshSession(),
    ]);

    const refreshes = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/auth/refresh"),
    );
    expect(refreshes).toHaveLength(1);
  });

  it("a rejected refresh ends the session", async () => {
    setSession(tokenResponse("vencido"));
    const listener = vi.fn();
    const unsubscribe = onSessionChange(listener);
    installFetch(() => jsonResponse(401, { detail: "Tu sesión terminó." }));

    await expect(apiFetch("/users")).rejects.toBeInstanceOf(ApiError);

    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null);
    unsubscribe();
  });

  it("logout sends the bearer token and clears the session offline too", async () => {
    setSession(tokenResponse("activo"));
    const fetchMock = installFetch(() => jsonResponse(204));

    await logout();

    expect(authHeader(fetchMock.mock.calls[0][1] ?? {})).toBe("Bearer activo");
    expect(getAccessToken()).toBeNull();

    setSession(tokenResponse("activo"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(logout()).resolves.toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });

  it("requestPasswordReset posts the username", async () => {
    const fetchMock = installFetch(() => jsonResponse(202));

    await requestPasswordReset("luisa");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/password-reset-requests");
    expect(JSON.parse(String(init?.body))).toEqual({ username: "luisa" });
  });
});
