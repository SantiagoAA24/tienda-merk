import { vi } from "vitest";

import type { AuthUser, TokenResponse } from "@/auth/api";

export type FetchHandler = (
  path: string,
  init: RequestInit,
) => Response | Promise<Response>;

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const seller: AuthUser = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Luisa",
  username: "luisa",
  role: "seller",
  active: true,
};

export const admin: AuthUser = {
  ...seller,
  name: "Merk",
  username: "merk",
  role: "admin",
};

export function tokenResponse(
  token = "access-1",
  user: AuthUser = seller,
): TokenResponse {
  return { access_token: token, token_type: "bearer", expires_in: 900, user };
}

/** Replaces global fetch; the handler receives the path without the API prefix. */
export function installFetch(handler: FetchHandler) {
  const mock = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : input.toString();
      return handler(url.replace(/^\/api/, ""), init);
    },
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function authHeader(init: RequestInit): string | null {
  return new Headers(init.headers).get("Authorization");
}
