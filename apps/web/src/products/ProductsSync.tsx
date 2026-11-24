import { useEffect } from "react";

import { useAuth } from "@/auth/context";

import { syncProducts } from "./sync";

/** Syncs the product catalog when the session is online. */
export function ProductsSync() {
  const { state } = useAuth();
  const online =
    state.status === "authenticated" && state.offline === false;

  useEffect(() => {
    if (!online) {
      return;
    }
    void syncProducts().catch(() => {
      // Keep the last local catalog if the sync fails.
    });

    const handleOnline = () => {
      void syncProducts().catch(() => undefined);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [online]);

  return null;
}
