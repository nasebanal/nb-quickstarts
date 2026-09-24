import { useSyncExternalStore } from "react";

// Which backend instance answered the most recent API call, read from the
// response headers: X-Served-By is added by every backend instance (its
// INSTANCE_ID); X-Resolved-Via (direct | consul) and X-Upstream (the address
// that answered) are added by the frontend server's /api/backend proxy, so
// they are only there when the browser goes through it. api.ts records every
// response here, and the accounts page shows it.
export interface Served {
  servedBy: string | null;
  resolvedVia: string | null;
  upstream: string | null;
}

let last: Served | null = null;
const listeners = new Set<() => void>();

export function recordServed(headers: Headers | undefined): void {
  const servedBy = headers?.get("x-served-by");
  if (!servedBy) return; // e.g. a mock or gateway response that isn't from a backend instance
  const next: Served = { servedBy, resolvedVia: headers?.get("x-resolved-via") ?? null, upstream: headers?.get("x-upstream") ?? null };
  if (last && last.servedBy === next.servedBy && last.resolvedVia === next.resolvedVia && last.upstream === next.upstream) return;
  last = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useServed(): Served | null {
  return useSyncExternalStore(subscribe, () => last, () => null);
}
