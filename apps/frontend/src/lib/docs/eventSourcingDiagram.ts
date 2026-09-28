import type { Locale } from "@/lib/i18n";

// The real seed data (app/seed.py's _SAMPLE_EVENTS) for the one name with
// more than one event - Cash - so the diagram shows an actual, verifiable
// GROUP BY/SUM, not invented numbers. ids match the seed's own insert order
// (Rent Expense is id 2, Sales Revenue is id 4, interleaved between these).
export const EVENT_SOURCING_TRANSACTIONS = [
  { id: 1, name: "Cash", quantity: 100000, source: "seed" },
  { id: 3, name: "Cash", quantity: -30000, source: "seed" },
  { id: 5, name: "Cash", quantity: 50000, source: "seed" },
];

// account_service.get_balances's actual output for the same rows: balance
// is the SUM, eventCount is how many rows contributed to it - matches
// test_accounts.py's own test_list_accounts_sums_transactions_per_name.
export const EVENT_SOURCING_ACCOUNT = { name: "Cash", balance: 120000, eventCount: 3 };

export const EVENT_SOURCING_TEXT: Record<
  Locale,
  {
    label: string;
    transactionsHeading: string;
    transactionsSummary: string;
    accountsHeading: string;
    accountsSummary: string;
    operation: string;
    columns: { id: string; name: string; quantity: string; source: string; balance: string; eventCount: string };
  }
> = {
  en: {
    label: "Diagram: how Account and Transaction relate",
    transactionsHeading: "/transactions",
    transactionsSummary: "per transaction - one signed entry against an account",
    accountsHeading: "/accounts",
    accountsSummary: "per account - the transaction total (balance) for that account",
    operation: "GROUP BY name, SUM(quantity)",
    columns: { id: "id", name: "name", quantity: "quantity", source: "source", balance: "balance", eventCount: "eventCount" },
  },
  ja: {
    label: "図: AccountとTransactionの関係",
    transactionsHeading: "/transactions",
    transactionsSummary: "取引単位の記帳イベント(勘定科目への1件の増減)",
    accountsHeading: "/accounts",
    accountsSummary: "勘定科目単位の取引集計値(勘定科目ごとの残高)",
    operation: "name でGROUP BY、quantity をSUM",
    columns: { id: "id", name: "name", quantity: "quantity", source: "source", balance: "balance", eventCount: "eventCount" },
  },
};
