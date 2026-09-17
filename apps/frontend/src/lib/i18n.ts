export type Locale = "en" | "ja";

export const LOCALES: Locale[] = ["en", "ja"];

export interface Dictionary {
  hero: {
    title: string;
    description: string;
    usernameLabel: string;
    loginButton: string;
    endpointsTitle: string;
    apiReferenceLabel: string;
  };
  howItWorks: {
    title: string;
    steps: { title: string; description: string }[];
    readmeNote: string;
    readmeLinkLabel: string;
  };
  app: {
    conceptDescription: string;
    balanceHeading: string;
    columnName: string;
    columnBalance: string;
    columnEventCount: string;
    registerHeading: string;
    noAccountsPlaceholder: string;
    quantityPlaceholder: string;
    registerButton: string;
    logoutButton: string;
    userMenuLabel: string;
    sessionExpiredError: string;
    apiBaseLabel: string;
    viaKongLabel: string;
    kafkaBridgeLabel: string;
  };
  footer: {
    rightsReserved: string;
    nasebanalStack: string;
    license: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    hero: {
      title: "NASEBANAL Quickstarts",
      description:
        "A minimal REST + GraphQL backend (FastAPI, MySQL) fronted by this Next.js app — " +
        "the test target nb-quickstarts uses to verify the NASEBANAL Stack (vitest, pytest, " +
        "Playwright, Specmatic, Microcks, Locust, ...). Log in to post transactions against " +
        "an accounting ledger.",
      usernameLabel: "Username",
      loginButton: "Login",
      endpointsTitle: "Endpoints once running",
      apiReferenceLabel: "API Reference",
    },
    howItWorks: {
      title: "How It Works",
      steps: [
        {
          title: "Start the Stack",
          description:
            "make apps:up — starts MySQL (seeded with a small chart of accounts), the FastAPI backend " +
            "(REST + GraphQL), and this frontend, all on the shared apps-network.",
        },
        {
          title: "Verify It",
          description:
            "make vitest:test / pytest:test / playwright:test / specmatic:test / " +
            "microcks:up / locust:up — unit tests, browser E2E, a contract test, a mock " +
            "server, and a load test, all against this same running stack.",
        },
        {
          title: "Tear It Down",
          description:
            "make apps:down — stops and removes the containers cleanly. Run apps:up again " +
            "anytime to start fresh.",
        },
      ],
      readmeNote: "Full command reference, env vars, and per-module details:",
      readmeLinkLabel: "README",
    },
    app: {
      conceptDescription:
        "This demo models a simple accounting ledger: every transaction below is a signed " +
        "entry (a debit or credit) posted against an account, never an edit to the account " +
        "itself — the same append-only pattern real bookkeeping and event-sourced financial " +
        "systems use. Each account's balance is just the running total of its own entries.",
      balanceHeading: "Account Balances",
      columnName: "Account",
      columnBalance: "Balance",
      columnEventCount: "Transactions",
      registerHeading: "Record a Transaction",
      noAccountsPlaceholder: "No accounts yet",
      quantityPlaceholder: "Amount (+/-)",
      registerButton: "Record",
      logoutButton: "Logout",
      userMenuLabel: "User menu",
      sessionExpiredError: "Your session has expired (the backend restarted since you logged in) — logging you out.",
      apiBaseLabel: "Connected backend",
      viaKongLabel: "Via Kong",
      kafkaBridgeLabel: "Kafka Bridge",
    },
    footer: {
      rightsReserved: "All rights reserved.",
      nasebanalStack: "NASEBANAL Stack",
      license: "License",
    },
  },
  ja: {
    hero: {
      title: "NASEBANAL Quickstarts",
      description:
        "FastAPI + MySQLの最小限のREST/GraphQLバックエンドを、このNext.jsアプリがフロントエンドとして提供します。" +
        "nb-quickstartsがNASEBANAL Stack(vitest・pytest・Playwright・Specmatic・Microcks・Locustなど)を" +
        "検証するためのテスト対象です。ログインすると会計台帳に取引を記帳できます。",
      usernameLabel: "ユーザー名",
      loginButton: "ログイン",
      endpointsTitle: "起動後のエンドポイント",
      apiReferenceLabel: "APIリファレンス",
    },
    howItWorks: {
      title: "使い方",
      steps: [
        {
          title: "起動する",
          description:
            "make apps:up — MySQL(勘定科目のサンプルデータ入り)、FastAPIバックエンド(REST + GraphQL)、" +
            "このフロントエンドをapps-network上にまとめて起動します。",
        },
        {
          title: "動作確認する",
          description:
            "make vitest:test / pytest:test / playwright:test / specmatic:test / " +
            "microcks:up / locust:up — ユニットテスト・ブラウザE2E・契約テスト・モックサーバー・" +
            "負荷テストを、同じ起動中のスタックに対して実行します。",
        },
        {
          title: "停止する",
          description:
            "make apps:down — コンテナをきれいに停止・削除します。またapps:upすればいつでも再開できます。",
        },
      ],
      readmeNote: "コマンド一覧・環境変数・各モジュールの詳細は:",
      readmeLinkLabel: "README",
    },
    app: {
      conceptDescription:
        "このデモは簡易的な会計台帳を模しています。以下の取引はどれも勘定科目そのものを書き換えるのではなく、" +
        "その勘定科目に対して記帳される符号付きの仕訳(借方/貸方)です — 実際の簿記やイベントソーシング型の" +
        "金融システムと同じ「追記のみ」の考え方です。各勘定科目の残高は、その仕訳を積み上げた合計にすぎません。",
      balanceHeading: "勘定科目残高",
      columnName: "勘定科目",
      columnBalance: "残高",
      columnEventCount: "取引件数",
      registerHeading: "取引を記帳",
      noAccountsPlaceholder: "勘定科目がまだありません",
      quantityPlaceholder: "金額(+/-)",
      registerButton: "記帳",
      logoutButton: "ログアウト",
      userMenuLabel: "ユーザーメニュー",
      sessionExpiredError: "セッションの有効期限が切れました(ログイン後にbackendが再起動されました) — ログアウトします。",
      apiBaseLabel: "接続先Backend",
      viaKongLabel: "Kong経由",
      kafkaBridgeLabel: "Kafka Bridge",
    },
    footer: {
      rightsReserved: "All rights reserved.",
      nasebanalStack: "NASEBANAL Stack",
      license: "ライセンス",
    },
  },
};
