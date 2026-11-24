import type { ReactNode } from "react";

import { cx } from "./cx";
import { IconHome, IconMore, IconProducts, IconSales } from "./icons";

export type BottomNavTab = "inicio" | "productos" | "ventas" | "mas";

export type BottomNavProps = {
  active: BottomNavTab;
  onChange?: (tab: BottomNavTab) => void;
  className?: string;
};

type TabConfig = {
  id: BottomNavTab;
  label: string;
  icon: ReactNode;
};

const tabs: TabConfig[] = [
  { id: "inicio", label: "Inicio", icon: <IconHome /> },
  { id: "productos", label: "Productos", icon: <IconProducts /> },
  { id: "ventas", label: "Ventas", icon: <IconSales /> },
  { id: "mas", label: "Más", icon: <IconMore /> },
];

export function BottomNav({ active, onChange, className }: BottomNavProps) {
  return (
    <nav
      className={cx("tem-nav", className)}
      aria-label="Navegación principal"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            className={cx("tem-nav__item", isActive && "is-active")}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange?.(tab.id)}
          >
            <span className="tem-nav__pill">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
