"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { createItem, UnauthorizedError } from "@/lib/api";
import { useBalances } from "@/lib/useBalances";

export default function ItemsPage() {
  const { t } = useLocale();
  const { token, initializing, logout } = useAuth();
  const router = useRouter();
  const { balances, refresh } = useBalances();
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("0");
  const [itemError, setItemError] = useState("");

  // Transactions post against an existing account, picked from the chart
  // of accounts the balances table itself already represents - not typed
  // free text. Defaults to the first account once the balances poll first
  // resolves; left alone after that so it doesn't fight your own selection
  // on every later poll tick.
  useEffect(() => {
    if (!itemName && balances.length > 0) {
      setItemName(balances[0].name);
    }
  }, [balances, itemName]);

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

  const onCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setItemError("");
    try {
      await createItem(token, { name: itemName, quantity: Number(itemQuantity) });
      setItemName("");
      setItemQuantity("0");
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
        setItemError(t.app.sessionExpiredError);
        setTimeout(logout, 1500);
        return;
      }
      setItemError(err instanceof Error ? err.message : String(err));
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

        <section>
          <h2>{t.app.balanceHeading}</h2>
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
          <form data-testid="item-form" onSubmit={onCreateItem}>
            <select
              name="name"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              required
              disabled={balances.length === 0}
              data-testid="item-account-select"
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
              value={itemQuantity}
              onChange={(event) => setItemQuantity(event.target.value)}
              required
            />
            <button type="submit" data-testid="item-submit">
              {t.app.registerButton}
            </button>
          </form>
          <p className="error" data-testid="item-error">
            {itemError}
          </p>
        </section>
      </div>
    </main>
  );
}
