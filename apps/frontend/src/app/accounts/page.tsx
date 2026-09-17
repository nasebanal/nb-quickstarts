"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { API_BASE, checkKafkaBridge, checkViaKong, createAccount, UnauthorizedError } from "@/lib/api";
import { useBalances } from "@/lib/useBalances";

// Shared by every "is X actually true right now" status check next to the
// backend URL field (Via Kong, Kafka Bridge, ...) - each is a real,
// verified signal (see checkViaKong/checkKafkaBridge's own comments in
// api.ts), and none of them change without a container restart, so one
// check on mount is enough for any of them - no need to poll the way
// useBalances polls balances.
function useStatusCheck(check: () => Promise<boolean>): boolean | null {
  const [status, setStatus] = useState<boolean | null>(null);
  useEffect(() => {
    check()
      .then(setStatus)
      .catch(() => setStatus(false));
    // Only ever run once, on mount - `check` is a stable top-level
    // function reference (checkViaKong/checkKafkaBridge), not a value
    // that should re-trigger this.
  }, [check]);
  return status;
}

export default function AccountsPage() {
  const { t } = useLocale();
  const { token, initializing, logout } = useAuth();
  const router = useRouter();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { balances, refresh } = useBalances(autoRefresh);
  const [accountName, setAccountName] = useState("");
  const [accountQuantity, setAccountQuantity] = useState("0");
  const [accountError, setAccountError] = useState("");
  const viaKong = useStatusCheck(checkViaKong);
  const kafkaBridge = useStatusCheck(checkKafkaBridge);

  // Transactions post against an existing account, picked from the chart
  // of accounts the balances table itself already represents - not typed
  // free text. Defaults to the first account once the balances poll first
  // resolves; left alone after that so it doesn't fight your own selection
  // on every later poll tick.
  useEffect(() => {
    if (!accountName && balances.length > 0) {
      setAccountName(balances[0].name);
    }
  }, [balances, accountName]);

  // Still no token once AuthProvider has finished trying to restore one
  // from sessionStorage means either a real logout or navigating here
  // directly — send them back to log in rather than showing an empty/broken
  // page. Skipping this while `initializing` is true avoids bouncing a
  // logged-in viewer home on every plain page reload.
  useEffect(() => {
    if (!initializing && !token) {
      router.replace("/");
    }
  }, [initializing, token, router]);

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setAccountError("");
    try {
      await createAccount(token, { name: accountName, quantity: Number(accountQuantity) });
      setAccountName("");
      setAccountQuantity("0");
      // The polling hook picks this up on its own within POLL_INTERVAL_MS
      // anyway - this just makes the table update immediately after your
      // own registration instead of waiting for the next tick.
      await refresh();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // The backend's token store is in-memory only (see auth.py) - if
        // it restarted since you logged in, sessionStorage still has a
        // token the backend no longer recognizes. Explain why, then clear
        // it: the page's own token-guard effect above reacts to that by
        // sending the viewer back home to log in again.
        setAccountError(t.app.sessionExpiredError);
        setTimeout(logout, 1500);
        return;
      }
      setAccountError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!token) {
    return null;
  }

  return (
    <main className="container">
      <div className="nb-content">
        <p className="nb-concept-description" data-testid="concept-description">
          {t.app.conceptDescription}
        </p>
        {/* readOnly, not disabled - selectable/copyable, but the value
            can't be typed into. Not a setting, just visibility into what
            NEXT_PUBLIC_API_BASE currently resolves to (direct backend,
            Kong, a Specmatic stub, a Microcks mock - see AGENTS.md's Kong
            section). Nothing here lets you change it from the UI. */}
        <div className="nb-api-base" data-testid="api-base">
          <label htmlFor="api-base-input">{t.app.apiBaseLabel}</label>
          <input id="api-base-input" type="text" value={API_BASE} readOnly />
          {/* Disabled checkboxes read as non-editable toggles - checked
              once the corresponding check resolves true, otherwise
              unchecked (including while still checking, on mount). Same
              shared style (.nb-status-toggle) for both, so they read as
              one consistent group. */}
          <span className="nb-status-toggle" data-testid="via-kong">
            <label htmlFor="via-kong-input">{t.app.viaKongLabel}</label>
            <input id="via-kong-input" type="checkbox" checked={viaKong ?? false} disabled readOnly />
          </span>
          <span className="nb-status-toggle" data-testid="kafka-bridge">
            <label htmlFor="kafka-bridge-input">{t.app.kafkaBridgeLabel}</label>
            <input id="kafka-bridge-input" type="checkbox" checked={kafkaBridge ?? false} disabled readOnly />
          </span>
        </div>

        <section>
          <div className="nb-section-heading-row">
            <h2>{t.app.balanceHeading}</h2>
            <label className="nb-auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                data-testid="auto-refresh-toggle"
              />
              {t.app.autoRefreshLabel}
            </label>
          </div>
          <table data-testid="balance-table">
            <thead>
              <tr>
                <th>{t.app.columnName}</th>
                <th>{t.app.columnBalance}</th>
                <th>{t.app.columnEventCount}</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => (
                <tr key={balance.name} data-testid={`balance-row-${balance.name}`}>
                  <td>{balance.name}</td>
                  <td>{balance.balance}</td>
                  <td>{balance.eventCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>{t.app.registerHeading}</h2>
          <form data-testid="account-form" onSubmit={onCreateAccount}>
            <select
              name="name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
              disabled={balances.length === 0}
              data-testid="account-select"
            >
              {balances.length === 0 && <option value="">{t.app.noAccountsPlaceholder}</option>}
              {balances.map((balance) => (
                <option key={balance.name} value={balance.name}>
                  {balance.name}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              placeholder={t.app.quantityPlaceholder}
              value={accountQuantity}
              onChange={(event) => setAccountQuantity(event.target.value)}
              required
            />
            <button type="submit" data-testid="account-submit">
              {t.app.registerButton}
            </button>
          </form>
          <p className="error" data-testid="account-error">
            {accountError}
          </p>
        </section>
      </div>
    </main>
  );
}
