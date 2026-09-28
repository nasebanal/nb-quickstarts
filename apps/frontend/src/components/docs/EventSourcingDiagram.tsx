"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  EVENT_SOURCING_ACCOUNT,
  EVENT_SOURCING_TEXT,
  EVENT_SOURCING_TRANSACTIONS,
} from "@/lib/docs/eventSourcingDiagram";

// Same visual language as ErDiagram.tsx (plain HTML tables as entity cards,
// reusing its .nb-docs-er* classes) rather than a second drawing style -
// this is the same kind of "here's a table's actual rows" diagram, just at
// the API's resource boundary instead of the raw MySQL schema: several
// /transactions rows (the real seed data for Cash - app/seed.py) rolling up
// into the one /accounts row GET /accounts actually returns for it.
export function EventSourcingDiagram() {
  const { locale } = useLocale();
  const text = EVENT_SOURCING_TEXT[locale];
  return (
    <div className="nb-docs-diagram" data-testid="event-sourcing-diagram" role="group" aria-label={text.label}>
      <div className="nb-docs-er">
        <div className="nb-docs-er-entity" data-testid="event-sourcing-transactions">
          <div className="nb-docs-er-head">
            <strong>{text.transactionsHeading}</strong>
            <span>{text.transactionsSummary}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>{text.columns.id}</th>
                <th>{text.columns.name}</th>
                <th>{text.columns.quantity}</th>
                <th>{text.columns.source}</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_SOURCING_TRANSACTIONS.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <code>{transaction.id}</code>
                  </td>
                  <td>{transaction.name}</td>
                  <td>{transaction.quantity}</td>
                  <td>{transaction.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nb-docs-flow-arrow">↓ {text.operation} ↓</p>
        <div className="nb-docs-er-entity" data-testid="event-sourcing-accounts">
          <div className="nb-docs-er-head">
            <strong>{text.accountsHeading}</strong>
            <span>{text.accountsSummary}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>{text.columns.name}</th>
                <th>{text.columns.balance}</th>
                <th>{text.columns.eventCount}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{EVENT_SOURCING_ACCOUNT.name}</td>
                <td>{EVENT_SOURCING_ACCOUNT.balance}</td>
                <td>{EVENT_SOURCING_ACCOUNT.eventCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
