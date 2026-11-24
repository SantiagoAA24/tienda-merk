export type Role = "admin" | "seller";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Sin conexión");
    this.name = "NetworkError";
  }
}

export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api";

const REFRESH_LOCK = "tem-auth-refresh";

let accessToken: string | null = null;
let refreshInFlight: Promise<TokenResponse> | null = null;
const listeners = new Set<(session: TokenResponse | null) => void>();

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new NetworkError();
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  let message = response.statusText;
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      message = body.detail;
    }
  } catch {
    // Body without JSON: keep the status text.
  }
  return new ApiError(response.status, message);
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return (await response.json()) as T;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setSession(session: TokenResponse | null): void {
  accessToken = session?.access_token ?? null;
  listeners.forEach((listener) => listener(session));
}

export function onSessionChange(
  listener: (session: TokenResponse | null) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function login(
  username: string,
  password: string,
  keepSession: boolean,
): Promise<TokenResponse> {
  const session = await json<TokenResponse>(
    await send("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        keep_session: keepSession,
      }),
    }),
  );
  setSession(session);
  return session;
}

async function doRefresh(): Promise<TokenResponse> {
  const response = await send("/auth/refresh", { method: "POST" });
  if (response.status === 401) {
    setSession(null);
  }
  const session = await json<TokenResponse>(response);
  setSession(session);
  return session;
}

/**
 * Refresh tokens rotate and reusing an old one revokes the session, so
 * concurrent refreshes (same tab or other tabs) must run one at a time.
 */
export function refreshSession(): Promise<TokenResponse> {
  if (!refreshInFlight) {
    const locks =
      typeof navigator !== "undefined" ? navigator.locks : undefined;
    const run = locks
      ? locks.request(REFRESH_LOCK, () => doRefresh())
      : doRefresh();
    refreshInFlight = run.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function logout(): Promise<void> {
  const token = accessToken;
  setSession(null);
  try {
    await send("/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (error) {
    if (!(error instanceof NetworkError)) {
      throw error;
    }
  }
}

export async function requestPasswordReset(username: string): Promise<void> {
  const response = await send("/auth/password-reset-requests", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    throw await errorFrom(response);
  }
}

/** Authenticated request: on 401 refreshes once and retries. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const withToken = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return { ...init, headers };
  };

  const response = await send(path, withToken(accessToken));
  if (response.status !== 401) {
    return response;
  }
  const session = await refreshSession();
  return send(path, withToken(session.access_token));
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return json<T>(await apiFetch(path, init));
}
