import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import type { Role } from "./api";
import { useAuth } from "./context";

export const LOGIN_PATH = "/iniciar-sesion";

export type LocationState = { from?: string } | null;

function Loading() {
  return (
    <main className="tem-app tem-auth-loading" aria-busy="true">
      <p className="tem-muted">Cargando…</p>
    </main>
  );
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "anonymous") {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={LOGIN_PATH} replace state={{ from }} />;
  }
  return children ?? <Outlet />;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children?: ReactNode;
}) {
  const { state } = useAuth();

  if (state.status !== "authenticated" || !roles.includes(state.user.role)) {
    return <Navigate to="/" replace />;
  }
  return children ?? <Outlet />;
}
