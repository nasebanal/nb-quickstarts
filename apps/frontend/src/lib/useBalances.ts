"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listAccounts, UnauthorizedError, type AccountBalance } from "./api";

const POLL_INTERVAL_MS = 1000;

/** Polls GET /accounts on an interval, so the balances table stays
 * live while a load test (or anyone else) is registering events - no
 * per-event UI updates to render, which is what makes this cheap even
 * during a heavy run: however many events land between two polls, this
 * still only ever re-renders once with their combined effect.
 *
 * `autoRefresh` (default on) gates only the interval, not the initial
 * load - turning it off freezes the table at its current state instead of
 * re-fetching every second, which is what you want when eyeballing a
 * single response (e.g. from Specmatic's mock, which returns a fresh
 * randomly-generated value per request for anything without a matching
 * example - see specmatic/docker-compose.yml - so a live poll against it
 * looks like the screen is constantly changing). */
export function useBalances(token: string | null, autoRefresh = true, onUnauthorized?: () => void) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  // Avoids overlapping requests if one poll is still in flight when the
  // next interval tick fires (e.g. a slow response during heavy load).
  const inFlight = useRef(false);
  // Kept in a ref: the caller passes a fresh function every render, and that must not restart the poll.
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const refresh = useCallback(async () => {
    // Every route needs a token now; without one (not logged in yet) there is nothing to poll.
    if (!token || inFlight.current) return;
    inFlight.current = true;
    try {
      setBalances(await listAccounts(token));
    } catch (err) {
      // An expired or rejected token: let the page send the user back to log in instead of polling a 401 forever.
      if (err instanceof UnauthorizedError && onUnauthorizedRef.current) onUnauthorizedRef.current();
      else throw err;
    } finally {
      inFlight.current = false;
    }
  }, [token]);

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
