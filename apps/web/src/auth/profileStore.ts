import type { AuthUser } from "./api";

/** Non-secret profile kept only with "Mantener sesión" so the app opens offline. */
const KEY = "tem.profile";

export function saveProfile(user: AuthUser): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // Storage full or blocked: offline start just won't be available.
  }
}

export function loadProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
