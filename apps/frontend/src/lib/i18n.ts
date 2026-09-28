export type Locale = "en" | "ja";

export const LOCALES: Locale[] = ["en", "ja"];
export const DEFAULT_LOCALE: Locale = "en";

// A leading /en or /ja path segment is how a URL specifies its language
// (see next.config.ts's rewrite, which makes e.g. /ja/accounts transparently
// serve the existing /accounts route - LocaleProvider.tsx reads it back out
// via this same helper). Anything that branches on the pathname itself
// (AppChrome's chrome-hiding check, Header's inDocs check, DocsSidebar's
// active-link check) needs to strip it first, or a /ja/docs/... URL would
// no longer match a plain "/docs" prefix check.
export function stripLocalePrefix(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const segments = pathname.split("/");
  const first = segments[1] ?? "";
  if (!(LOCALES as string[]).includes(first)) return pathname;
  const rest = segments.slice(2).join("/");
  return `/${rest}`;
}

export interface Dictionary {
  hero: {
    title: string;
    description: string;
    usernameLabel: string;
    passwordLabel: string;
    loginButton: string;
    endpointsTitle: string;
    apiReferenceLabel: string;
    docsLabel: string;
    sourceCodeLabel: string;
    opensInNewWindow: string;
  };
  login: {
    modeMock: string;
    modeKeycloak: string;
    mockHint: string;
    demoCredentialsHint: string;
    keycloakDescription: string;
    keycloakButton: string;
    signupButton: string;
    demoUserHint: string;
    keycloakBadge: string;
    callbackWorking: string;
    callbackError: string;
    backToHome: string;
  };
  profile: {
    title: string;
    menuLabel: string;
    username: string;
    email: string;
    emailDescription: string;
    displayName: string;
    displayNamePlaceholder: string;
    language: string;
    languageJa: string;
    languageEn: string;
    signedInVia: string;
    providerDemo: string;
    providerKeycloak: string;
    save: string;
    updateSuccess: string;
    updateFailed: string;
    loading: string;
  };
  howItWorks: {
    title: string;
    steps: { title: string; description: string }[];
    // One sentence in three parts, so the link can sit on the word
    // "NASEBANAL Stack" itself in either language's word order (the GitHub
    // source-code pointer this used to share the shape with moved to the
    // header's "Source Code" link).
    stackNote: string;
    stackLinkLabel: string;
    stackNoteAfter: string;
  };
  app: {
    conceptDescription: string;
    balanceHeading: string;
    columnName: string;
    columnBalance: string;
    columnEventCount: string;
    registerHeading: string;
    autoRefreshLabel: string;
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
    license: string;
    operatedBy: string;
    contact: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    hero: {
      title: "NASEBANAL Quickstarts",
      description:
        "A minimal REST + GraphQL backend (FastAPI, MySQL) fronted by this Next.js app — " +
        "the test target nb-quickstarts uses to verify the NASEBANAL Stack (vitest, pytest, " +
        "Playwright, Specmatic, Locust, ...). Log in to post transactions against " +
        "an accounting ledger.",
      usernameLabel: "Username",
      passwordLabel: "Password",
      loginButton: "Login",
      endpointsTitle: "Endpoints once running",
      apiReferenceLabel: "API Reference",
      docsLabel: "Docs",
      sourceCodeLabel: "Source Code",
      opensInNewWindow: "opens in a new window",
    },
    login: {
      modeMock: "Demo login",
      modeKeycloak: "Keycloak",
      mockHint: "The built-in demo login, checked against the users table in MySQL.",
      demoCredentialsHint: "Demo user: demo / demo.",
      keycloakDescription:
        "You'll be sent to Keycloak to sign in - this app never sees your password - and sent back " +
        "with a token the backend verifies against Keycloak's public keys.",
      keycloakButton: "Log in with Keycloak",
      signupButton: "Sign up",
      demoUserHint: "Demo user: keycloak-demo / nasebanal-demo - or sign up for a new one.",
      keycloakBadge: "Keycloak",
      callbackWorking: "Completing login...",
      callbackError: "Login failed",
      backToHome: "Back",
    },
    profile: {
      title: "Profile",
      menuLabel: "Profile",
      username: "Username",
      email: "Email Address",
      emailDescription: "Cannot be changed",
      displayName: "Display Name",
      displayNamePlaceholder: "Enter display name",
      language: "Language",
      languageJa: "日本語",
      languageEn: "English",
      signedInVia: "Signed in via",
      providerDemo: "Demo login",
      providerKeycloak: "Keycloak",
      save: "Save",
      updateSuccess: "Profile updated successfully",
      updateFailed: "Failed to update profile",
      loading: "Loading...",
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
            "locust:up — unit tests, browser E2E, a contract test, " +
            "and a load test, all against this same running stack.",
        },
        {
          title: "Tear It Down",
          description:
            "make apps:down — stops and removes the containers cleanly. Run apps:up again " +
            "anytime to start fresh.",
        },
      ],
      stackNote: "Quickstarts verifies the",
      stackLinkLabel: "NASEBANAL Stack",
      stackNoteAfter: "— the proven open-source technologies NASEBANAL's own products build on.",
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
      autoRefreshLabel: "Auto-refresh (every 1s)",
      noAccountsPlaceholder: "No accounts yet",
      quantityPlaceholder: "Amount (+/-)",
      registerButton: "Record",
      logoutButton: "Logout",
      userMenuLabel: "User menu",
      sessionExpiredError: "Your session has expired (the backend restarted since you logged in) — logging you out.",
      apiBaseLabel: "API endpoint",
      viaKongLabel: "Via Kong",
      kafkaBridgeLabel: "Kafka Bridge",
    },
    footer: {
      rightsReserved: "All rights reserved.",
      license: "License",
      operatedBy: "About Us",
      contact: "Contact",
    },
  },
  ja: {
    hero: {
      title: "NASEBANAL Quickstarts",
      description:
        "FastAPI + MySQLの最小限のREST/GraphQLバックエンドを、このNext.jsアプリがフロントエンドとして提供します。" +
        "nb-quickstartsがNASEBANAL Stack(vitest・pytest・Playwright・Specmatic・Locustなど)を" +
        "検証するためのテスト対象です。ログインすると会計台帳に取引を記帳できます。",
      usernameLabel: "ユーザー名",
      passwordLabel: "パスワード",
      loginButton: "ログイン",
      endpointsTitle: "起動後のエンドポイント",
      apiReferenceLabel: "APIリファレンス",
      docsLabel: "ドキュメント",
      sourceCodeLabel: "ソースコード",
      opensInNewWindow: "別ウィンドウで開きます",
    },
    login: {
      modeMock: "デモログイン",
      modeKeycloak: "Keycloak",
      mockHint: "組み込みのデモログインです。MySQLのusersテーブルと照合します。",
      demoCredentialsHint: "デモユーザー: demo / demo",
      keycloakDescription:
        "Keycloakのログイン画面に移動してサインインします(このアプリがパスワードを目にすることはありません)。" +
        "戻ってくると、backendがKeycloakの公開鍵で検証するトークンを持った状態になります。",
      keycloakButton: "Keycloakでログイン",
      signupButton: "サインアップ",
      demoUserHint: "デモユーザー: keycloak-demo / nasebanal-demo — またはサインアップで新規作成できます。",
      keycloakBadge: "Keycloak",
      callbackWorking: "ログインを完了しています...",
      callbackError: "ログインに失敗しました",
      backToHome: "戻る",
    },
    profile: {
      title: "プロフィール",
      menuLabel: "プロフィール",
      username: "ユーザー名",
      email: "メールアドレス",
      emailDescription: "変更できません",
      displayName: "表示名",
      displayNamePlaceholder: "表示名を入力",
      language: "言語",
      languageJa: "日本語",
      languageEn: "English",
      signedInVia: "ログイン方法",
      providerDemo: "デモログイン",
      providerKeycloak: "Keycloak",
      save: "保存",
      updateSuccess: "プロフィールを更新しました",
      updateFailed: "プロフィールの更新に失敗しました",
      loading: "読み込み中...",
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
            "locust:up — ユニットテスト・ブラウザE2E・契約テスト・" +
            "負荷テストを、同じ起動中のスタックに対して実行します。",
        },
        {
          title: "停止する",
          description:
            "make apps:down — コンテナをきれいに停止・削除します。またapps:upすればいつでも再開できます。",
        },
      ],
      stackNote: "Quickstartsは",
      stackLinkLabel: "NASEBANAL Stack",
      stackNoteAfter: "―NASEBANALの各プロダクトが基盤とする、実績あるOSS技術群―の動作を検証します。",
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
      autoRefreshLabel: "自動更新(1秒ごと)",
      noAccountsPlaceholder: "勘定科目がまだありません",
      quantityPlaceholder: "金額(+/-)",
      registerButton: "記帳",
      logoutButton: "ログアウト",
      userMenuLabel: "ユーザーメニュー",
      sessionExpiredError: "セッションの有効期限が切れました(ログイン後にbackendが再起動されました) — ログアウトします。",
      apiBaseLabel: "呼び出し先API",
      viaKongLabel: "Kong経由",
      kafkaBridgeLabel: "Kafka Bridge",
    },
    footer: {
      rightsReserved: "All rights reserved.",
      license: "ライセンス",
      operatedBy: "運営会社",
      contact: "お問い合わせ",
    },
  },
};
