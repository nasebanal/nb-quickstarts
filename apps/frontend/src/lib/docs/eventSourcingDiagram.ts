import type { Locale } from "@/lib/i18n";

// The real seed data, in full (app/seed.py's _SAMPLE_EVENTS, ids in insert
// order) - not just Cash's three rows: Rent Expense and Sales Revenue each
// have exactly one, so the diagram also shows that GROUP BY/SUM applies
// per name regardless of how many rows a given one has, not just the
// three-rows-into-one case. Real, verifiable numbers throughout, not
// invented ones. `source` (always "seed" here) is left out of the diagram -
// every row already comes from the seed, so the column would say the same
// thing five times without illustrating anything about the Account/
// Transaction relationship itself.
export const EVENT_SOURCING_TRANSACTIONS = [
  { id: 1, name: "Cash", quantity: 100000 },
  { id: 2, name: "Rent Expense", quantity: 30000 },
  { id: 3, name: "Cash", quantity: -30000 },
  { id: 4, name: "Sales Revenue", quantity: 50000 },
  { id: 5, name: "Cash", quantity: 50000 },
];

// account_service.get_balances's actual output for the same rows: balance
// is the SUM per name, eventCount is how many rows contributed to it -
// matches test_accounts.py's own test_list_accounts_sums_transactions_per_name.
export const EVENT_SOURCING_ACCOUNTS = [
  { name: "Cash", balance: 120000, eventCount: 3 },
  { name: "Rent Expense", balance: 30000, eventCount: 1 },
  { name: "Sales Revenue", balance: 50000, eventCount: 1 },
];

export const EVENT_SOURCING_TEXT: Record<
  Locale,
  {
    label: string;
    transactionsHeading: string;
    transactionsSummary: string;
    accountsHeading: string;
    accountsSummary: string;
    operation: string;
    columns: { id: string; name: string; quantity: string; balance: string; eventCount: string };
  }
> = {
  en: {
    label: "Diagram: how Account and Transaction relate",
    transactionsHeading: "/transactions",
    transactionsSummary: "per transaction - one signed entry against an account",
    accountsHeading: "/accounts",
    accountsSummary: "per account - the transaction total (balance) for that account",
    operation: "GROUP BY name, SUM(quantity)",
    columns: { id: "id", name: "name", quantity: "quantity", balance: "balance", eventCount: "eventCount" },
  },
  ja: {
    label: "図: AccountとTransactionの関係",
    transactionsHeading: "/transactions",
    transactionsSummary: "取引単位の記帳イベント(勘定科目への1件の増減)",
    accountsHeading: "/accounts",
    accountsSummary: "勘定科目単位の取引集計値(勘定科目ごとの残高)",
    operation: "name でGROUP BY、quantity をSUM",
    columns: { id: "id", name: "name", quantity: "quantity", balance: "balance", eventCount: "eventCount" },
  },
};
