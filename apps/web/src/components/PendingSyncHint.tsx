import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import { countPendingSales } from "@/db/sales";
import { onPendingSalesChange } from "@/sales/sync";

/** Discrete chip showing how many local sales still need to reach the server. */
export function PendingSyncHint() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsubscribeLive = liveQuery(() => countPendingSales()).subscribe({
      next: (value) => setPending(value),
      error: () => setPending(0),
    });
    const unsubscribeSync = onPendingSalesChange(setPending);
    return () => {
      unsubscribeLive.unsubscribe();
      unsubscribeSync();
    };
  }, []);

  if (pending <= 0) {
    return null;
  }

  const label =
    pending === 1
      ? "1 pendiente de enviar"
      : `${pending} pendientes de enviar`;

  return (
    <p className="tem-pending-sync" role="status">
      {label}
    </p>
  );
}
