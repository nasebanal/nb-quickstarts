import type { LocalizedDocsPage } from "./types";

export const scenarioKeycloak: LocalizedDocsPage = {
  en: {
    title: "Scenario 5: Use Keycloak",
    description:
      "POST /transactions is protected by app/auth.py's get_current_username - until now, only " +
      "satisfiable with the token from POST /auth/login. This scenario turns on a real login: the " +
      "login page gains a Keycloak option (with sign-up), you authenticate at Keycloak like you would " +
      "with \"Sign in with Google\", and the backend accepts the token Keycloak issued on that exact " +
      "same route.",
    sections: [
      {
        heading: "Why Keycloak",
        body: [
          "The Kafka bridge (Scenario 4) logs in to the backend with the demo password like any other client; the backend accepts that token or a Keycloak one on the same protected routes.",
        ],
        bullets: [
          "Standard OIDC/OAuth 2.0: login, token issuing and SSO are handled by a proven identity provider instead of hand-rolled auth code.",
          "The backend only verifies signed JWTs against Keycloak's public keys - it never sees or stores passwords.",
          "Users, roles and social/enterprise login federation are managed in one place, and the same IdP can serve every app.",
        ],
      },
      {
        heading: "How it works: from login to a validated request",
        body: [
          "It is the same idea as \"Sign in with Google\": the user proves who they are to the identity " +
            "provider (Keycloak), not to this app, and the app gets a signed token it can trust. The " +
            "Frontend sends the user to Keycloak (Authorization Code flow with PKCE), receives the " +
            "token, and then calls the Backend's REST API with it as a Bearer token. The Backend checks " +
            "the signature itself against Keycloak's public keys - it never sees the password and does " +
            "not call Keycloak for each request.",
        ],
        sequence: {
          summary:
            "Sequence diagram: the Frontend redirects the user to Keycloak to log in, exchanges the returned code for a JWT, calls the Backend's REST API with it, and the Backend verifies it against Keycloak's public keys",
          participants: [
            { id: "fe", label: "Frontend", sub: "browser" },
            { id: "kc", label: "Keycloak", sub: "identity provider" },
            { id: "app", label: "Backend", sub: "REST API" },
          ],
          steps: [
            {
              kind: "message",
              from: "fe",
              to: "kc",
              text: "Send the user to log in (or sign up)",
              detail: "redirect: /auth?client_id=apps-demo&code_challenge=...&redirect_uri=/auth/callback",
            },
            { kind: "note", at: "kc", text: "The user signs in here - the app never sees the password" },
            {
              kind: "message",
              from: "kc",
              to: "fe",
              text: "Redirect back with a one-time code",
              detail: "/auth/callback?code=...",
              dashed: true,
            },
            {
              kind: "message",
              from: "fe",
              to: "kc",
              text: "Exchange the code for tokens",
              detail: "POST /token  (code + code_verifier)",
            },
            {
              kind: "message",
              from: "kc",
              to: "fe",
              text: "Access token (JWT)",
              detail: "iss = http://localhost:8180/realms/nasebanal, preferred_username, exp",
              dashed: true,
            },
            {
              kind: "message",
              from: "fe",
              to: "app",
              text: "Call the REST API",
              detail: "POST /transactions  -  Authorization: Bearer <JWT>",
            },
            {
              kind: "message",
              from: "app",
              to: "kc",
              text: "Fetch the public keys (JWKS)",
              detail: "GET /certs",
            },
            { kind: "message", from: "kc", to: "app", text: "Public keys", dashed: true },
            { kind: "note", at: "app", text: "Verifies signature, issuer and expiry" },
            {
              kind: "message",
              from: "app",
              to: "fe",
              text: "201 Created",
              detail: "(401 if the token fails - the backend's own token check is tried first)",
              dashed: true,
            },
          ],
          frames: [{ from: 6, to: 7, label: "only on the first request, or after a key rotation - keys are cached" }],
        },
        closing: [
          "From the second request on, the key fetch is skipped: the backend's PyJWKClient caches the key set and only " +
          "re-fetches on a cache miss (a key rotation). The audience claim isn't checked - this demo " +
          "realm has one public client, apps-demo. The Frontend's part is written out by hand in " +
          "src/lib/oidc.ts (a redirect out, a code back, one fetch) - no OIDC library.",
        ],
        noteTitle: "PyJWT: verifying a token against a JWKS endpoint",
        noteHref: "https://pyjwt.readthedocs.io/en/stable/usage.html#retrieve-rsa-signing-keys-from-a-jwks-endpoint",
        note:
          "The backend's signature check uses PyJWT's PyJWKClient: it fetches Keycloak's public keys from the " +
          "realm's JWKS endpoint, caches the key set, and picks the key whose kid matches the token's header.",
      },
      {
        heading: "1. Start Keycloak and turn it on",
        body: [
          "Starting Keycloak is not enough: the login page offers Keycloak, and the backend accepts its tokens, " +
            "only when KEYCLOAK_ISSUER is set in .env. That one variable is how the apps learn that Keycloak " +
            "exists - until it is set, the login dialog shows only the demo login, even with Keycloak running. " +
            "So there are three steps: start Keycloak, add the line to .env, recreate the apps.",
          "keycloak:up imports a fixed realm (nasebanal) on every start: a demo user (keycloak-demo / " +
            "nasebanal-demo), the apps-demo client, and sign-up enabled. KEYCLOAK_ISSUER is the address " +
            "the browser logs in at - it is also the iss every token carries (keycloak/docker-compose.yml " +
            "pins it). It turns on both halves: the backend starts accepting Keycloak tokens (fetching the " +
            "signing keys from Keycloak's in-network address, KEYCLOAK_JWKS_URL), and the login page starts " +
            "offering Keycloak.",
        ],
        code: [
          { label: "1. Start Keycloak", code: "make apps:up\nmake keycloak:up" },
          {
            label: "2. In .env, uncomment this line (remove the leading \"# \"; it is commented out in .env.example) - this is what makes the login page show Keycloak",
            code: "KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal",
          },
          { label: "3. Recreate the backend and frontend so they pick it up", code: "make apps:restart" },
        ],
        closing: [
          "No Demo login / Keycloak toggle in the login dialog? KEYCLOAK_ISSUER is missing from .env (or " +
          "commented out with a #), or apps:restart has not run since you set it. Check what the frontend " +
          "received: docker exec nb-frontend printenv NEXT_PUBLIC_KEYCLOAK_ISSUER prints the issuer when it is on, " +
          "and nothing when it is off.",
        ],
        noteTitle: "Keycloak: realm import at startup",
        noteHref: "https://www.keycloak.org/server/importExport",
        note:
          "keycloak/docker-compose.yml starts Keycloak with start-dev --import-realm and mounts keycloak/realm/ as " +
          "its import directory, so nasebanal-realm.json is loaded on every start. That is why the realm, the " +
          "apps-demo client and the demo user exist without any manual setup; a realm that already exists is " +
          "skipped, not overwritten.",
      },
      {
        heading: "2. Log in with Keycloak",
        bullets: [
          "Open http://localhost:5173 and click Login. The dialog now has a Demo login / Keycloak toggle " +
            "(it isn't there when KEYCLOAK_ISSUER is not set in .env - see step 1).",
          "Pick Keycloak and click \"Log in with Keycloak\". The browser goes to Keycloak's own login page " +
            "(localhost:8180) - note the URL: this is where the password is typed, not in the app.",
          "Sign in as keycloak-demo / nasebanal-demo. Keycloak sends you back to /auth/callback, the app " +
            "trades the code for a token, and you land on the accounts page.",
          "Open the user menu (top right): your name and a Keycloak badge show it was a Keycloak login. " +
            "Record a transaction - it succeeds, which means the backend accepted the Keycloak-issued " +
            "JWT on POST /transactions.",
          "Logout ends the Keycloak session too, so the next \"Log in with Keycloak\" asks for credentials " +
            "again instead of signing you straight back in.",
        ],
        images: [
          {
            src: "/docs/screenshots/keycloak-login-modal.png",
            alt: "The app's login dialog with a Demo login / Keycloak toggle, the Keycloak tab selected, showing Log in with Keycloak and Sign up buttons",
            caption: "Step 2's toggle: shown only when KEYCLOAK_ISSUER is set. Keycloak is one click away; Demo login stays the default.",
          },
          {
            src: "/docs/screenshots/keycloak-login-page.png",
            alt: "Keycloak's own Sign in to your account page at localhost:8180, with a New user? Register link",
            caption: "Where \"Log in with Keycloak\" lands: Keycloak's own page (localhost:8180) - the password is typed here, not in the app. \"Register\" is the sign-up.",
          },
        ],
        imagesLayout: "stack",
        closing: [
          "Tokens are valid for 30 minutes (the realm's access token lifespan). After that, recording a " +
          "transaction gets a 401 and the app logs you out - log in again.",
        ],
      },
      {
        heading: "3. Sign up a new user",
        bullets: [
          "Log out, then Login -> Keycloak -> Sign up. The registration form is Keycloak's, not the " +
            "app's: username, email, name, password.",
          "Submitting it creates the user in Keycloak and logs you straight in, landing on the accounts " +
            "page as the new user.",
          "make keycloak:open (admin / admin) -> the nasebanal realm -> Users shows the new user. The " +
            "backend never learned about them beforehand - it only checks the token's signature.",
        ],
      },
      {
        heading: "4. Prove the backend is really checking",
        code: [{ code: "make keycloak:verify-apps" }],
        body: [
          "The same thing without a browser: this gets a token for the demo user straight from Keycloak " +
            "(the password grant, which the demo client also allows) and POSTs it to POST /transactions. Then " +
            "try the same call without a token, and with a token whose signature was altered:",
        ],
        terminal: {
          lines: [
            { text: "$ make keycloak:verify-apps", tone: "muted" },
            { text: "1. Getting a real access token from Keycloak (realm nasebanal, user keycloak-demo)..." },
            { text: "   Got token (truncated): eyJhbGciOiJSUzI1NiIsInR5..." },
            { text: "2. Calling the real backend's protected POST /transactions with it..." },
            { text: "   HTTP 201", tone: "success" },
            { text: "" },
            { text: "$ curl -X POST localhost:8080/transactions ...            # no token", tone: "muted" },
            { text: "401", tone: "error" },
            { text: "$ curl ... -H \"Authorization: Bearer <token, last character changed>\"", tone: "muted" },
            { text: '{"detail":"invalid or missing token"}  401', tone: "error" },
            { text: "$ curl ... -H \"Authorization: Bearer <genuine token>\"", tone: "muted" },
            { text: "201", tone: "success" },
          ],
        },
        closing: [
          "Real output. The tampered token is rejected because its signature no longer matches Keycloak's " +
          "public key - the backend trusts the signature, not the token's contents. The token from the " +
          "Demo login tab keeps working alongside: the backend tries its own token check first (a local " +
          "signature check) and falls back to the Keycloak check.",
        ],
      },
      {
        heading: "5. Use it for an MCP client's login",
        body: [
          "The same Keycloak login works when an MCP client logs in. Claude Code's " +
            "Authenticate opens the frontend's /mcp-authorize page, which has the same Demo login / Keycloak " +
            "toggle. Pick Keycloak, sign in as keycloak-demo, and you come back to that page (not to /accounts) " +
            "to press Allow - then get_me answers with the Keycloak user's profile. The backend verifies the " +
            "Keycloak JWT as it does everywhere, then issues the MCP client the ordinary demo token for that " +
            "username. The same flow with the demo login is in Getting Started: \"How the /mcp login works\".",
        ],
        sequence: {
          summary:
            "Sequence diagram: Claude Code gets a 401 from /mcp and sends the user to the frontend login; the user picks Keycloak, signs in there and returns to /mcp-authorize, where Allow trades the authorization code for a token that every tool call then carries.",
          participants: [
            { id: "cc", label: "Claude Code", sub: "MCP client" },
            { id: "fe", label: "Frontend", sub: "browser" },
            { id: "kc", label: "Keycloak", sub: "identity provider" },
            { id: "be", label: "Backend", sub: "/mcp + /oauth" },
          ],
          steps: [
            { kind: "message", from: "cc", to: "be", text: "POST /mcp with no token" },
            { kind: "message", from: "be", to: "cc", text: "401", detail: "WWW-Authenticate: Bearer resource_metadata=...", dashed: true },
            { kind: "message", from: "cc", to: "be", text: "Register this client", detail: "POST /oauth/register" },
            { kind: "message", from: "cc", to: "fe", text: "Open the browser", detail: "/mcp-authorize?client_id=...&code_challenge=..." },
            { kind: "message", from: "fe", to: "kc", text: "Pick Keycloak: redirect to its login", detail: "OIDC code + PKCE" },
            { kind: "message", from: "kc", to: "fe", text: "Back with a code, token redeemed", detail: "/auth/callback -> returns to /mcp-authorize" },
            { kind: "note", at: "fe", text: "Signed in as keycloak-demo - then Allow" },
            { kind: "message", from: "fe", to: "be", text: "Ask for the authorization code", detail: "POST /oauth/authorize + Bearer <Keycloak JWT>" },
            { kind: "note", at: "be", text: "Verifies the JWT against Keycloak's keys" },
            { kind: "message", from: "fe", to: "cc", text: "Redirect with the code", detail: "http://localhost:<port>/callback?code=..." },
            { kind: "message", from: "cc", to: "be", text: "Trade the code for a token", detail: "POST /oauth/token + PKCE verifier" },
            { kind: "message", from: "cc", to: "be", text: "Every call from now on", detail: "Authorization: Bearer <demo token for keycloak-demo>" },
          ],
        },
      },
      {
        heading: "Cleanup",
        code: [
          { label: ".env (comment the line out again):", code: "# KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal" },
          { code: "make apps:restart" },
          { code: "make keycloak:down" },
        ],
        closing: [
          "The Keycloak option disappears from the login page and every route works exactly as it did before " +
          "Keycloak existed.",
        ],
      },
    ],
  },
  ja: {
    title: "シナリオ5: Keycloakの利用",
    description:
      "POST /transactionsは、app/auth.pyのget_current_usernameによって保護されています — これまでは" +
      "POST /auth/loginが発行するトークンでしか満たせませんでした。このシナリオでは本物のログインを" +
      "有効にします: ログイン画面にKeycloakの選択肢(サインアップ付き)が加わり、「Googleでログイン」と同じ" +
      "ように、Keycloak側で認証し、まさにこのルートでKeycloakが発行したトークンをbackendが受け入れます。",
    sections: [
      {
        heading: "Keycloakを使うメリット",
        body: [
          "Kafkaブリッジ(シナリオ4)は、他のクライアントと同じようにデモのパスワードでbackendへログインします。backendは、同じ保護されたルートで、そのトークンもKeycloakのトークンも受け付けます。",
        ],
        bullets: [
          "標準のOIDC/OAuth 2.0: ログイン・トークン発行・SSOを実績あるIDプロバイダーに任せられ、認証コードを自前で書く必要がありません。",
          "backendはKeycloakの公開鍵で署名付きJWTを検証するだけで、パスワードを扱ったり保存したりすることが一切ありません。",
          "ユーザー・ロール・外部/企業IDとの連携を1か所で管理でき、同じIdPを複数のアプリで共用できます。",
        ],
      },
      {
        heading: "仕組み: ログインからリクエスト検証まで",
        body: [
          "「Googleでログイン」と同じ考え方です: ユーザーは、このアプリではなくIDプロバイダー(Keycloak)に対して" +
            "自分が誰かを証明し、アプリは信頼できる署名付きトークンを受け取ります。Frontendがユーザーを" +
            "Keycloakへ送り(PKCE付きの認可コードフロー)、トークンを受け取り、それをBearerトークンとして" +
            "BackendのREST APIを呼びます。Backendは署名をKeycloakの公開鍵で自分で検証するだけで、" +
            "パスワードを目にすることはなく、リクエストごとにKeycloakへ問い合わせることもありません。",
        ],
        sequence: {
          summary:
            "シーケンス図: FrontendがユーザーをログインのためにKeycloakへリダイレクトし、戻ってきたコードをJWTに交換して、それを付けてBackendのREST APIを呼び、BackendがKeycloakの公開鍵で検証する流れ",
          participants: [
            { id: "fe", label: "Frontend", sub: "ブラウザ" },
            { id: "kc", label: "Keycloak", sub: "IDプロバイダー" },
            { id: "app", label: "Backend", sub: "REST API" },
          ],
          steps: [
            {
              kind: "message",
              from: "fe",
              to: "kc",
              text: "ユーザーをログイン(またはサインアップ)へ送る",
              detail: "リダイレクト: /auth?client_id=apps-demo&code_challenge=...&redirect_uri=/auth/callback",
            },
            { kind: "note", at: "kc", text: "ユーザーはここでサインインする — アプリはパスワードを見ない" },
            {
              kind: "message",
              from: "kc",
              to: "fe",
              text: "使い捨てのコードを付けて戻す",
              detail: "/auth/callback?code=...",
              dashed: true,
            },
            {
              kind: "message",
              from: "fe",
              to: "kc",
              text: "コードをトークンに交換",
              detail: "POST /token  (code + code_verifier)",
            },
            {
              kind: "message",
              from: "kc",
              to: "fe",
              text: "アクセストークン(JWT)",
              detail: "iss = http://localhost:8180/realms/nasebanal、preferred_username、exp",
              dashed: true,
            },
            {
              kind: "message",
              from: "fe",
              to: "app",
              text: "REST APIを呼ぶ",
              detail: "POST /transactions  -  Authorization: Bearer <JWT>",
            },
            {
              kind: "message",
              from: "app",
              to: "kc",
              text: "公開鍵(JWKS)を取得",
              detail: "GET /certs",
            },
            { kind: "message", from: "kc", to: "app", text: "公開鍵", dashed: true },
            { kind: "note", at: "app", text: "署名・issuer・有効期限を検証" },
            {
              kind: "message",
              from: "app",
              to: "fe",
              text: "201 Created",
              detail: "(トークンが不正なら401 — その前にbackend自身のトークン検証を試す)",
              dashed: true,
            },
          ],
          frames: [{ from: 6, to: 7, label: "初回リクエスト時、または鍵のローテーション後のみ — 鍵はキャッシュされる" }],
        },
        closing: [
          "2回目以降のリクエストは鍵の取得を飛ばします: backendのPyJWKClientが鍵セットをキャッシュし、" +
          "キャッシュミス(鍵のローテーション)のときだけ再取得します。audience(aud)クレームは検証しません — " +
          "このデモ用レルムにはapps-demoという公開クライアントが1つあるだけだからです。Frontend側の処理は" +
          "src/lib/oidc.tsに手書きしています(リダイレクトで出て、コードで戻り、fetchを1回) — OIDCライブラリは" +
          "使っていません。",
        ],
        noteTitle: "PyJWT: JWKSエンドポイントでのトークン検証",
        noteHref: "https://pyjwt.readthedocs.io/en/stable/usage.html#retrieve-rsa-signing-keys-from-a-jwks-endpoint",
        note:
          "backendの署名検証はPyJWTのPyJWKClientを使っています。realmのJWKSエンドポイントからKeycloakの公開鍵を取得してキーセットをキャッシュし、トークンのヘッダーのkidに一致する鍵を選びます。",
      },
      {
        heading: "1. Keycloakを起動して有効化する",
        body: [
          "Keycloakを起動しただけでは足りません: ログイン画面にKeycloakが出て、backendがそのトークンを受け付けるのは、" +
            ".envにKEYCLOAK_ISSUERを設定したときだけです。この1つの変数が、アプリにKeycloakの存在を伝える手段です" +
            " — 設定するまでは、Keycloakが動いていてもログインのダイアログにはデモログインしか出ません。" +
            "手順は3つです: Keycloakを起動し、.envに1行を足し、アプリを再作成します。",
          "keycloak:upは起動のたびに固定のレルム(nasebanal)をインポートします: デモユーザー(keycloak-demo / " +
            "nasebanal-demo)、apps-demoクライアント、そしてサインアップが有効な状態です。KEYCLOAK_ISSUERは" +
            "ブラウザがログインするアドレスで、すべてのトークンのissでもあります(keycloak/docker-compose.ymlで" +
            "固定しています)。これで両側が有効になります: backendがKeycloakのトークンを受け付け始め" +
            "(署名鍵はKeycloakのネットワーク内アドレス、KEYCLOAK_JWKS_URLから取得)、ログイン画面が" +
            "Keycloakを選べるようになります。",
        ],
        code: [
          { label: "1. Keycloakを起動する", code: "make apps:up\nmake keycloak:up" },
          {
            label: "2. .envの次の行のコメントを外す(先頭の「# 」を消します。.env.exampleではコメントアウトされています) — ログイン画面にKeycloakを出すのはこの行です",
            code: "KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal",
          },
          { label: "3. backendとfrontendを再作成して反映する", code: "make apps:restart" },
        ],
        closing: [
          "ログインのダイアログに「デモログイン / Keycloak」の切り替えが出ませんか? .envにKEYCLOAK_ISSUERが無い" +
          "(または先頭の#でコメントアウトされている)か、設定したあとにapps:restartを実行していません。" +
          "frontendが受け取った値は、docker exec nb-frontend printenv NEXT_PUBLIC_KEYCLOAK_ISSUERで確認できます" +
          "(有効なら発行元が表示され、無効なら何も表示されません)。",
        ],
        noteTitle: "Keycloak: 起動時のrealmインポート",
        noteHref: "https://www.keycloak.org/server/importExport",
        note:
          "keycloak/docker-compose.ymlはKeycloakをstart-dev " +
          "--import-realmで起動し、keycloak/realm/をインポート用ディレクトリとしてマウントしているため、起動のたびにnasebanal-realm.jsonが読み込まれます。realm・apps-demoクライアント・デモユーザーが手作業なしで用意されているのはこのためで、すでに存在するrealmはスキップされ、上書きされません。",
      },
      {
        heading: "2. Keycloakでログインする",
        bullets: [
          "http://localhost:5173を開いてLoginをクリックします。ダイアログに「デモログイン / Keycloak」の" +
            "トグルが現れます(.envにKEYCLOAK_ISSUERを設定していないと表示されません — 手順1を見てください)。",
          "Keycloakを選んで「Keycloakでログイン」をクリックします。ブラウザはKeycloak自身のログイン画面" +
            "(localhost:8180)へ移動します — URLに注目してください: パスワードを入力する場所はアプリではなく" +
            "ここです。",
          "keycloak-demo / nasebanal-demoでサインインします。Keycloakが/auth/callbackへ戻し、アプリが" +
            "コードをトークンに交換して、口座ページに着きます。",
          "右上のユーザーメニューを開くと、名前とKeycloakバッジが表示され、Keycloakでのログインだった" +
            "ことがわかります。取引を記帳してください — 成功すれば、backendがPOST /transactionsで" +
            "Keycloak発行のJWTを受け入れたということです。",
          "ログアウトはKeycloak側のセッションも終了するため、次に「Keycloakでログイン」すると、そのまま" +
            "ログインされるのではなく、再び認証情報を聞かれます。",
        ],
        images: [
          {
            src: "/docs/screenshots/keycloak-login-modal.png",
            alt: "アプリのログインダイアログ。デモログイン / Keycloakのトグルで、Keycloakのタブが選ばれ、Log in with KeycloakとSign upのボタンが表示されている",
            caption: "手順2のトグル: KEYCLOAK_ISSUERが設定されているときだけ表示されます。Keycloakはワンクリックで選べ、デモログインが既定のままです。",
          },
          {
            src: "/docs/screenshots/keycloak-login-page.png",
            alt: "localhost:8180にあるKeycloak自身のSign in to your accountページ。New user? Registerのリンクがある",
            caption: "「Keycloakでログイン」の遷移先: Keycloak自身のページ(localhost:8180)で、パスワードはアプリではなくここで入力します。「Register」がサインアップです。",
          },
        ],
        imagesLayout: "stack",
        closing: [
          "トークンの有効期間は30分です(レルムのアクセストークン有効期間)。それを過ぎると、取引の記帳は" +
          "401になり、アプリがログアウトします — 再度ログインしてください。",
        ],
      },
      {
        heading: "3. 新しいユーザーをサインアップする",
        bullets: [
          "ログアウトして、Login -> Keycloak -> サインアップ。登録フォームはアプリではなくKeycloakのもの" +
            "で、ユーザー名・メール・氏名・パスワードを入力します。",
          "送信するとKeycloakにユーザーが作られ、そのままログインされて、新しいユーザーとして口座ページに" +
            "着きます。",
          "make keycloak:open(admin / admin)-> nasebanalレルム -> Usersに、新しいユーザーが表示されます。" +
            "backendは事前にそのユーザーのことを何も知りません — トークンの署名を確認しているだけです。",
        ],
      },
      {
        heading: "4. backendが本当に検証していることを確かめる",
        code: [{ code: "make keycloak:verify-apps" }],
        body: [
          "ブラウザなしでの同じ確認です: デモユーザーのトークンをKeycloakから直接取得し(デモ用クライアント" +
            "はパスワードグラントも許可しています)、POST /transactionsへPOSTします。続けて、同じ呼び出しを" +
            "トークンなしと、署名を書き換えたトークンで試します:",
        ],
        terminal: {
          lines: [
            { text: "$ make keycloak:verify-apps", tone: "muted" },
            { text: "1. Getting a real access token from Keycloak (realm nasebanal, user keycloak-demo)..." },
            { text: "   Got token (truncated): eyJhbGciOiJSUzI1NiIsInR5..." },
            { text: "2. Calling the real backend's protected POST /transactions with it..." },
            { text: "   HTTP 201", tone: "success" },
            { text: "" },
            { text: "$ curl -X POST localhost:8080/transactions ...            # トークンなし", tone: "muted" },
            { text: "401", tone: "error" },
            { text: "$ curl ... -H \"Authorization: Bearer <最後の1文字を書き換えたトークン>\"", tone: "muted" },
            { text: '{"detail":"invalid or missing token"}  401', tone: "error" },
            { text: "$ curl ... -H \"Authorization: Bearer <正規のトークン>\"", tone: "muted" },
            { text: "201", tone: "success" },
          ],
        },
        closing: [
          "実際の出力です。書き換えたトークンが拒否されるのは、署名がKeycloakの公開鍵と一致しなくなる" +
          "ためです — backendが信頼するのはトークンの中身ではなく署名です。デモログインのタブで得られる" +
          "デモログインのタブで得られるトークンも並行して使えます: backendはまず自前のトークン検証(ローカルでの署名" +
          "検証)を試し、失敗したらKeycloakとしての検証にフォールバックします。",
        ],
      },
      {
        heading: "5. MCPクライアントのログインに使う",
        body: [
          "MCPクライアントのログインでも同じKeycloakログインが使えます。" +
            "Claude CodeのAuthenticateはfrontendの/mcp-authorizeを開き、そこにも同じデモログイン / Keycloakの" +
            "切り替えがあります。Keycloakを選んでkeycloak-demoでサインインすると、/accountsではなくこのページに" +
            "戻るので、Allowを押します — するとget_meがKeycloakユーザーのプロフィールで答えます。backendは" +
            "いつもどおりKeycloakのJWTを検証し、そのユーザー名に対する通常のデモトークンをMCPクライアントへ" +
            "発行します。デモログインでの同じ流れはGetting Startedの「/mcpのログインの仕組み」にあります。",
        ],
        sequence: {
          summary:
            "シーケンス図: Claude Codeは/mcpで401を受けてユーザーをfrontendのログインへ送り、ユーザーはKeycloakを選んでサインインして/mcp-authorizeに戻り、Allowで認可コードをトークンに交換して、以後のすべてのツール呼び出しに付けます。",
          participants: [
            { id: "cc", label: "Claude Code", sub: "MCP client" },
            { id: "fe", label: "Frontend", sub: "browser" },
            { id: "kc", label: "Keycloak", sub: "IdP" },
            { id: "be", label: "Backend", sub: "/mcp + /oauth" },
          ],
          steps: [
            { kind: "message", from: "cc", to: "be", text: "トークンなしでPOST /mcp" },
            { kind: "message", from: "be", to: "cc", text: "401", detail: "WWW-Authenticate: Bearer resource_metadata=...", dashed: true },
            { kind: "message", from: "cc", to: "be", text: "クライアントを登録", detail: "POST /oauth/register" },
            { kind: "message", from: "cc", to: "fe", text: "ブラウザを開く", detail: "/mcp-authorize?client_id=...&code_challenge=..." },
            { kind: "message", from: "fe", to: "kc", text: "Keycloakを選び、ログインへリダイレクト", detail: "OIDC code + PKCE" },
            { kind: "message", from: "kc", to: "fe", text: "codeを持って戻り、トークンに交換", detail: "/auth/callback -> /mcp-authorizeに戻る" },
            { kind: "note", at: "fe", text: "keycloak-demoでサインインしてAllow" },
            { kind: "message", from: "fe", to: "be", text: "認可コードを要求", detail: "POST /oauth/authorize + Bearer <Keycloak JWT>" },
            { kind: "note", at: "be", text: "JWTをKeycloakの鍵で検証" },
            { kind: "message", from: "fe", to: "cc", text: "codeを付けてリダイレクト", detail: "http://localhost:<port>/callback?code=..." },
            { kind: "message", from: "cc", to: "be", text: "codeをトークンに交換", detail: "POST /oauth/token + PKCE verifier" },
            { kind: "message", from: "cc", to: "be", text: "以後のすべての呼び出し", detail: "Authorization: Bearer <keycloak-demoのデモトークン>" },
          ],
        },
      },
      {
        heading: "環境のクリーンアップ",
        code: [
          { label: ".env(行をもう一度コメントアウトする):", code: "# KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal" },
          { code: "make apps:restart" },
          { code: "make keycloak:down" },
        ],
        closing: [
          "ログイン画面からKeycloakの選択肢が消え、すべてのルートはKeycloakが存在する前と全く同じように" +
          "動作します。",
        ],
      },
    ],
  },
};
