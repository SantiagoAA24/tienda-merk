import { useState } from "react";

import { useAuth } from "@/auth/context";
import { AppShell, Button, Card, Header } from "@/components";

const ROLE_LABEL = { admin: "Administrador", seller: "Vendedor" } as const;

/** Provisional home until screen 12 (Inicio) is built. */
export function HomePage() {
  const { state, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  if (state.status !== "authenticated") {
    return null;
  }

  async function handleLogout() {
    setLeaving(true);
    await logout();
  }

  return (
    <AppShell active="inicio">
      <main className="tem-auth-screen">
        <Header greeting={`Hola, ${state.user.name}`} title="Inicio" />
        <Card hero overlap className="tem-home">
          <p className="tem-muted">{ROLE_LABEL[state.user.role]}</p>
          {state.offline ? (
            <p role="status">
              Sin conexión. Puedes seguir trabajando; sincronizamos cuando
              vuelva el internet.
            </p>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => void handleLogout()}
            disabled={leaving}
          >
            Cerrar sesión
          </Button>
        </Card>
      </main>
    </AppShell>
  );
}
