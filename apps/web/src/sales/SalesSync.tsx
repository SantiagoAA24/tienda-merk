import { useEffect } from "react";

import { useAuth } from "@/auth/context";

import {
  getSyncBackoffMs,
  resetSyncBackoff,
  syncPendingSales,
} from "./sync";

/** Pushes pending sales when the session is online; retries with backoff. */
export function SalesSync() {
  const { state } = useAuth();
  const online =
    state.status === "authenticated" && state.offline === false;

  useEffect(() => {
    if (!online) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      void syncPendingSales()
        .catch(() => undefined)
        .finally(() => {
          if (cancelled) return;
          timer = setTimeout(run, getSyncBackoffMs());
        });
    };

    resetSyncBackoff();
    run();

    const handleOnline = () => {
      resetSyncBackoff();
      void syncPendingSales().catch(() => undefined);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, [online]);

  return null;
}
