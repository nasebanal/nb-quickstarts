"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listBalances, type AccountBalance } from "./api";

const POLL_INTERVAL_MS = 1000;

/** Polls GET /accounts/balances on an interval, so the balances table stays
 * live while a load test (or anyone else) is registering events - no
 * per-event UI updates to render, which is what makes this cheap even
 * during a heavy run: however many events land between two polls, this
 * still only ever re-renders once with their combined effect.
 *
 * `autoRefresh` (default on) gates only the interval, not the initial
 * load - turning it off freezes the table at its current state instead of
 * re-fetching every second, which is what you want when eyeballing a
 * single response (e.g. from Specmatic's stub, which returns a fresh
 * randomly-generated value per request for anything without a matching
 * example - see specmatic/docker-compose.yml - so a live poll against it
 * looks like the screen is constantly changing). */
export function useBalances(autoRefresh = true) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
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
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refresh().catch((err) => {
        console.error("Failed to load balances", err);
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh, autoRefresh]);

  return { balances, refresh };
}
