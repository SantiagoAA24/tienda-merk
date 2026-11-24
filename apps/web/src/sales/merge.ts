import { upsertRemoteSale } from "@/db/sales";
import { NetworkError } from "@/auth/api";

import { fetchSales } from "./api";

/**
 * Pulls server sales for a date range and merges them into IndexedDB.
 * Preserves local lines and pending sync rows; updates invoice metadata.
 */
export async function pullAndMergeSales(
  from: string,
  to: string,
): Promise<number> {
  let remote;
  try {
    remote = await fetchSales({ from, to });
  } catch (error) {
    if (error instanceof NetworkError) {
      return 0;
    }
    throw error;
  }

  if (!Array.isArray(remote)) {
    return 0;
  }

  for (const row of remote) {
    await upsertRemoteSale(row);
  }
  return remote.length;
}
