import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { BottomNav, type BottomNavTab } from "./BottomNav";
import { cx } from "./cx";
import { PendingSyncHint } from "./PendingSyncHint";

const TAB_PATH: Partial<Record<BottomNavTab, string>> = {
  inicio: "/",
  productos: "/productos",
};

export type AppShellProps = {
  active: BottomNavTab;
  children: ReactNode;
  className?: string;
};

export function AppShell({ active, children, className }: AppShellProps) {
  const navigate = useNavigate();

  return (
    <div className={cx("tem-app", "tem-shell", className)}>
      <PendingSyncHint />
      <div className="tem-shell__body">{children}</div>
      <BottomNav
        active={active}
        onChange={(tab) => {
          const path = TAB_PATH[tab];
          if (path) {
            navigate(path);
          }
        }}
      />
    </div>
  );
}
