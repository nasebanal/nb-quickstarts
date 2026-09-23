import type { LocalizedDocsPage } from "./types";

export const scenarioKeycloak: LocalizedDocsPage = {
  en: {
    title: "Scenario 4: Use Keycloak",
    description:
      "POST /accounts is protected by app/auth.py's get_current_username - until now, only " +
      "satisfiable with a mock token from POST /auth/login. This scenario has the backend accept a " +
      "real OIDC login from Keycloak on that exact same route instead of a separate demo endpoint.",
    sections: [
      {
        heading: "1. Start Keycloak and trust its realm",
        body: [
          "keycloak:up imports a fixed realm (nasebanal) with a demo user (keycloak-demo / " +
            "nasebanal-demo) on every start. KEYCLOAK_ISSUER must point at Keycloak's in-network " +
            "hostname:port, not the host-published KEYCLOAK_PORT - the backend resolves it from inside " +
            "apps-network.",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make keycloak:up\n" +
              "# .env: KEYCLOAK_ISSUER=http://keycloak:8080/realms/nasebanal\n" +
              "make apps:restart   # backend needs recreating to pick it up",
          },
        ],
      },
      {
        heading: "2. Verify it worked",
        code: [{ code: "make keycloak:verify-apps" }],
        body: [
          "This gets a real access token for the demo user and POSTs it straight to POST /accounts - " +
            "the exact same route the mock login's token already protects. A 201 back means the " +
            "backend validated the token's signature against Keycloak's live JWKS and let the request " +
            "through - the real, single check that KEYCLOAK_ISSUER actually took effect.",
        ],
        terminal: {
          lines: [
            { text: "$ make keycloak:verify-apps", tone: "muted" },
            { text: "1. Getting a real access token from Keycloak (realm nasebanal, user keycloak-demo)..." },
            { text: "   Got token (truncated): eyJhbGciOiJSUzI1NiIsInR5..." },
            { text: "" },
            { text: "2. Calling the real backend's protected POST /accounts with it..." },
            { text: "   HTTP 201", tone: "success" },
            {
              text: '   {"id":747884,"name":"Keycloak Demo","quantity":1,"source":"api","createdAt":"2026-09-23T04:46:34"}',
            },
            { text: "" },
            { text: "   apps/backend accepted a real Keycloak-issued JWT on its own auth dependency", tone: "success" },
            { text: "   (app/auth.py's get_current_username) - same route the mock /auth/login token uses.", tone: "success" },
          ],
        },
        note:
          "make keycloak:login alone just prints a token, for trying it by hand with curl. Until " +
          "KEYCLOAK_ISSUER is set and apps:restart has run, verify-apps gets a real token but the " +
          "backend still 401s it - that's expected on a fresh checkout, and the command says so.",
      },
      {
        heading: "Why requesting the token from inside apps-network matters",
        body: [
          "keycloak:login/verify-apps both request the token from a throwaway container on " +
            "apps-network, not from the host at localhost:$KEYCLOAK_PORT. Keycloak's issued iss claim " +
            "reflects whatever Host header the token request itself used - a token requested from the " +
            "host would carry a localhost:8180 issuer that the backend (validating against " +
            "http://keycloak:8080/realms/nasebanal) would correctly reject as untrusted. Issuing and " +
            "validating against the exact same origin sidesteps the mismatch entirely.",
        ],
      },
      {
        heading: "Returning to mock-login-only",
        code: [
          { label: ".env:", code: "KEYCLOAK_ISSUER=" },
          { code: "make apps:restart" },
          { code: "make keycloak:down" },
        ],
        note: "No other behavior changes - every route works exactly as it did before Keycloak existed.",
      },
    ],
  },
  ja: {
    title: "シナリオ4: Keycloakの利用",
    description:
      "POST /accountsは、app/auth.pyのget_current_usernameによって保護されています — これまでは" +
      "POST /auth/loginが発行するモックトークンでしか満たせませんでした。このシナリオでは、別のデモ用" +
      "エンドポイントではなく、まさにこのルートで、Keycloakによる本物のOIDCログインをbackendに受け入れ" +
      "させます。",
    sections: [
      {
        heading: "1. Keycloakを起動し、そのレルムを信頼する",
        body: [
          "keycloak:upは、起動のたびに固定のレルム(nasebanal)とデモユーザー(keycloak-demo / " +
            "nasebanal-demo)をインポートします。KEYCLOAK_ISSUERは、ホスト公開用のKEYCLOAK_PORTではなく、" +
            "Keycloakのapps-network内でのホスト名:ポートを指す必要があります — backendはapps-networkの" +
            "内側からそれを解決するためです。",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make keycloak:up\n" +
              "# .env: KEYCLOAK_ISSUER=http://keycloak:8080/realms/nasebanal\n" +
              "make apps:restart   # backendを再作成して反映",
          },
        ],
      },
      {
        heading: "2. 反映されたことを確認する",
        code: [{ code: "make keycloak:verify-apps" }],
        body: [
          "デモユーザーの本物のアクセストークンを取得し、そのままPOST /accountsに送ります — モック" +
            "ログインのトークンがすでに保護しているのと、まったく同じルートです。HTTP 201が返れば、" +
            "backendがKeycloakの生JWKSに対してトークンの署名を検証し、リクエストを通したということ" +
            "— KEYCLOAK_ISSUERが実際に反映されたことの、唯一の本当の確認方法です。",
        ],
        terminal: {
          lines: [
            { text: "$ make keycloak:verify-apps", tone: "muted" },
            { text: "1. Getting a real access token from Keycloak (realm nasebanal, user keycloak-demo)..." },
            { text: "   Got token (truncated): eyJhbGciOiJSUzI1NiIsInR5..." },
            { text: "" },
            { text: "2. Calling the real backend's protected POST /accounts with it..." },
            { text: "   HTTP 201", tone: "success" },
            {
              text: '   {"id":747884,"name":"Keycloak Demo","quantity":1,"source":"api","createdAt":"2026-09-23T04:46:34"}',
            },
            { text: "" },
            { text: "   apps/backend accepted a real Keycloak-issued JWT on its own auth dependency", tone: "success" },
            { text: "   (app/auth.py's get_current_username) - same route the mock /auth/login token uses.", tone: "success" },
          ],
        },
        note:
          "make keycloak:login単体では、curlで手動で試すためのトークンを表示するだけです。" +
          "KEYCLOAK_ISSUERを設定してapps:restartするまでは、verify-appsは本物のトークンを取得できても" +
          "backend側が401を返します — 初期状態では想定通りの挙動で、コマンド自体もそう表示します。",
      },
      {
        heading: "なぜapps-network内からトークンを取得するのか",
        body: [
          "keycloak:login/verify-appsはどちらも、ホストのlocalhost:$KEYCLOAK_PORTからではなく、" +
            "apps-network上の使い捨てコンテナからトークンをリクエストします。Keycloakが発行するiss" +
            "クレームは、トークンリクエストが実際に使ったHostヘッダーをそのまま反映します — ホストから" +
            "リクエストするとlocalhost:8180というissuerを持つトークンになり、" +
            "http://keycloak:8080/realms/nasebanalに対して検証するbackendはそれを正しく信頼できないと" +
            "して拒否します。発行と検証を同じoriginに対して行うことで、このズレ自体を避けています。",
        ],
      },
      {
        heading: "モックログインのみに戻す",
        code: [
          { label: ".env:", code: "KEYCLOAK_ISSUER=" },
          { code: "make apps:restart" },
          { code: "make keycloak:down" },
        ],
        note: "他の挙動は一切変わりません — どのルートもKeycloak導入前とまったく同じように動作します。",
      },
    ],
  },
};
