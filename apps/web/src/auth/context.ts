import { createContext, useContext } from "react";

import type { AuthUser } from "./api";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser; offline: boolean };

export type AuthContextValue = {
  state: AuthState;
  login: (
    username: string,
    password: string,
    keepSession: boolean,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return value;
}
