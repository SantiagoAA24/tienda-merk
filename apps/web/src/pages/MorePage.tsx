import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/context";
import { AppShell, BackHeader, Card } from "@/components";
import { IconChevron } from "@/components/icons";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  action: "closing" | "soon" | "logout";
};

const MENU: MenuItem[] = [
  {
    id: "business",
    title: "Mi negocio",
    subtitle: "Datos, NIT y numeración",
    action: "soon",
  },
  {
    id: "stats",
    title: "Estadísticas",
    subtitle: "Semana y mes",
    action: "soon",
  },
  {
    id: "closing",
    title: "Cierre del día",
    subtitle: "Cuadra el efectivo y revisa las facturas",
    action: "closing",
  },
  {
    id: "users",
    title: "Usuarios",
    subtitle: "Quién puede entrar a la app",
    action: "soon",
  },
];

export function MorePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  async function handleLogout() {
    setLeaving(true);
    await logout();
  }

  function handleItem(item: MenuItem) {
    if (item.action === "closing") {
      navigate("/cierre");
    }
  }

  return (
    <AppShell active="mas">
      <BackHeader title="Más" to="/" />
      <main className="tem-mas">
        <Card className="tem-mas__list">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tem-mas__item"
              onClick={() => handleItem(item)}
              disabled={item.action === "soon"}
              aria-disabled={item.action === "soon"}
            >
              <span>
                <span style={{ display: "block" }}>{item.title}</span>
                <span className="tem-mas__hint">{item.subtitle}</span>
              </span>
              {item.action === "soon" ? (
                <span className="tem-mas__hint">Pronto</span>
              ) : (
                <IconChevron />
              )}
            </button>
          ))}
        </Card>

        <Card className="tem-mas__list">
          <button
            type="button"
            className="tem-mas__item tem-mas__item--danger"
            onClick={() => void handleLogout()}
            disabled={leaving}
          >
            <span>
              <span style={{ display: "block" }}>Cerrar sesión</span>
              <span className="tem-mas__hint">Sales de este celular</span>
            </span>
          </button>
        </Card>

        <p className="tem-mas__version">Tienda Express Merk · versión 0.0.1</p>
      </main>
    </AppShell>
  );
}
