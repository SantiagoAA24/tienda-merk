import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { AuthState } from "./context";
import { AuthContext } from "./context";
import type { LocationState } from "./RequireAuth";
import { LOGIN_PATH, RequireAuth, RequireRole } from "./RequireAuth";
import { admin, seller } from "@/test/fetchMock";

function LoginProbe() {
  const state = useLocation().state as LocationState;
  return <p>Pantalla de ingreso desde {state?.from}</p>;
}

function renderAt(path: string, state: AuthState) {
  return render(
    <AuthContext.Provider value={{ state, login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={LOGIN_PATH} element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>Inicio</p>} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/usuarios" element={<p>Usuarios</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("RequireAuth", () => {
  it("shows a loading state while the session is restored", () => {
    renderAt("/", { status: "loading" });

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("redirects to login and remembers where the user was going", () => {
    renderAt("/usuarios?x=1", { status: "anonymous" });

    expect(
      screen.getByText("Pantalla de ingreso desde /usuarios?x=1"),
    ).toBeInTheDocument();
  });

  it("lets an authenticated user in", () => {
    renderAt("/", { status: "authenticated", user: seller, offline: false });

    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });

  it("allows admins into admin routes", () => {
    renderAt("/usuarios", {
      status: "authenticated",
      user: admin,
      offline: false,
    });

    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("sends sellers away from admin routes", () => {
    renderAt("/usuarios", {
      status: "authenticated",
      user: seller,
      offline: false,
    });

    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });
});
