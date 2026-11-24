import {
  countPendingSales,
  listPendingSales,
  markSaleSyncError,
  markSaleSynced,
} from "@/db/sales";
import { ApiError, NetworkError } from "@/auth/api";

import { postSale } from "./api";

const INITIAL_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;

let syncInFlight: Promise<number> | null = null;
let backoffMs = INITIAL_DELAY_MS;
const listeners = new Set<(pending: number) => void>();

export function getSyncBackoffMs(): number {
  return backoffMs;
}

export function resetSyncBackoff(): void {
  backoffMs = INITIAL_DELAY_MS;
}

export function onPendingSalesChange(
  listener: (pending: number) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function notifyPending(): Promise<number> {
  const pending = await countPendingSales();
  listeners.forEach((listener) => listener(pending));
  return pending;
}

function bumpBackoff(): void {
  backoffMs = Math.min(MAX_DELAY_MS, backoffMs * 2);
}

/**
 * Pushes pending local sales to the API one by one.
 * Returns how many were synced in this run.
 */
export async function syncPendingSales(): Promise<number> {
  if (!syncInFlight) {
    syncInFlight = (async () => {
      const pending = await listPendingSales();
      let synced = 0;
      for (const sale of pending) {
        try {
          const remote = await postSale(sale);
          await markSaleSynced(sale.id, {
            invoiceNumber: remote.invoice?.number ?? null,
            invoiceStatus: remote.invoice?.status ?? "pending",
          });
          synced += 1;
          resetSyncBackoff();
        } catch (error) {
          if (
            error instanceof NetworkError ||
            (error instanceof ApiError &&
              (error.status >= 500 ||
                error.status === 401 ||
                error.status === 403))
          ) {
            bumpBackoff();
            break;
          }
          // Validation / conflict: keep visible as pending-to-fix and retry later.
          await markSaleSyncError(sale.id);
          bumpBackoff();
          break;
        }
      }
      await notifyPending();
      return synced;
    })().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}
