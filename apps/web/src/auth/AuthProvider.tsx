import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  login as apiLogin,
  logout as apiLogout,
  NetworkError,
  onSessionChange,
  refreshSession,
} from "./api";
import type { AuthState } from "./context";
import { AuthContext } from "./context";
import { clearProfile, loadProfile, saveProfile } from "./profileStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const restore = useCallback(async () => {
    try {
      const session = await refreshSession();
      if (loadProfile()) {
        saveProfile(session.user);
      }
      setState({ status: "authenticated", user: session.user, offline: false });
    } catch (error) {
      const profile = error instanceof NetworkError ? loadProfile() : null;
      if (profile) {
        setState({ status: "authenticated", user: profile, offline: true });
      } else {
        if (!(error instanceof NetworkError)) {
          clearProfile();
        }
        setState({ status: "anonymous" });
      }
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(
    () =>
      onSessionChange((session) => {
        if (session) {
          setState({
            status: "authenticated",
            user: session.user,
            offline: false,
          });
        } else {
          clearProfile();
          setState({ status: "anonymous" });
        }
      }),
    [],
  );

  const offline = state.status === "authenticated" && state.offline;
  useEffect(() => {
    if (!offline) {
      return;
    }
    const handleOnline = () => void restore();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [offline, restore]);

  const login = useCallback(
    async (username: string, password: string, keepSession: boolean) => {
      const session = await apiLogin(username, password, keepSession);
      if (keepSession) {
        saveProfile(session.user);
      } else {
        clearProfile();
      }
      return session.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    clearProfile();
  }, []);

  const value = useMemo(
    () => ({ state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
