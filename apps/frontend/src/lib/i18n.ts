export type Locale = "en" | "ja";

export const LOCALES: Locale[] = ["en", "ja"];

export interface Dictionary {
  hero: {
    title: string;
    description: string;
    usernameLabel: string;
    loginButton: string;
    endpointsTitle: string;
  };
  howItWorks: {
    title: string;
    steps: { title: string; description: string }[];
    readmeNote: string;
    readmeLinkLabel: string;
  };
  app: {
    title: string;
    loggedInAs: string;
    itemListHeading: string;
    columnName: string;
    columnQuantity: string;
    columnSource: string;
    registerHeading: string;
    namePlaceholder: string;
    quantityPlaceholder: string;
    registerButton: string;
    logoutButton: string;
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
        "Playwright, Specmatic, Microcks, Locust, ...). Log in to register items.",
      usernameLabel: "Username",
      loginButton: "Login",
      endpointsTitle: "Endpoints once running",
    },
    howItWorks: {
      title: "How It Works",
      steps: [
        {
          title: "Start the Stack",
          description:
            "make apps:up — starts MySQL (seeded with sample items), the FastAPI backend " +
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
      title: "Items",
      loggedInAs: "Logged in as",
      itemListHeading: "Item List",
      columnName: "Name",
      columnQuantity: "Quantity",
      columnSource: "Source",
      registerHeading: "Register Item",
      namePlaceholder: "Name",
      quantityPlaceholder: "Quantity",
      registerButton: "Register",
      logoutButton: "Logout",
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
        "検証するためのテスト対象です。ログインするとアイテムを登録できます。",
      usernameLabel: "ユーザー名",
      loginButton: "ログイン",
      endpointsTitle: "起動後のエンドポイント",
    },
    howItWorks: {
      title: "使い方",
      steps: [
        {
          title: "起動する",
          description:
            "make apps:up — MySQL(サンプルデータ入り)、FastAPIバックエンド(REST + GraphQL)、" +
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
      title: "アイテム",
      loggedInAs: "ログイン中:",
      itemListHeading: "アイテム一覧",
      columnName: "名前",
      columnQuantity: "数量",
      columnSource: "登録元",
      registerHeading: "アイテムを登録",
      namePlaceholder: "名前",
      quantityPlaceholder: "数量",
      registerButton: "登録",
      logoutButton: "ログアウト",
    },
    footer: {
      rightsReserved: "All rights reserved.",
      nasebanalStack: "NASEBANAL Stack",
      license: "ライセンス",
    },
  },
};
