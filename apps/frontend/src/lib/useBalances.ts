"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listBalances, type ItemBalance } from "./api";

const POLL_INTERVAL_MS = 1000;

/** Polls GET /items/balances on an interval, so the balances table stays
 * live while a load test (or anyone else) is registering events - no
 * per-event UI updates to render, which is what makes this cheap even
 * during a heavy run: however many events land between two polls, this
 * still only ever re-renders once with their combined effect. */
export function useBalances() {
  const [balances, setBalances] = useState<ItemBalance[]>([]);
  // Avoids overlapping requests if one poll is still in flight when the
  // next interval tick fires (e.g. a slow response during heavy load).
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setBalances(await listBalances());
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      console.error("Failed to load balances", err);
    });
    const interval = setInterval(() => {
      refresh().catch((err) => {
        console.error("Failed to load balances", err);
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { balances, refresh };
}
