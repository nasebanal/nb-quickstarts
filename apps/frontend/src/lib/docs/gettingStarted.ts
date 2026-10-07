import type { LocalizedDocsPage } from "./types";

export const gettingStarted: LocalizedDocsPage = {
  en: {
    title: "Getting Started",
    description:
      "A step-by-step walkthrough for checking the basic features first. It takes you from starting " +
      "the apps stack through to confirming it works, which every scenario needs before you begin. " +
      "Commands are plain make targets run from the repository root, and each module also prints " +
      "its own help - run make apps, make kong, and so on with no action.",
    sections: [
      {
        heading: "Quick demo",
        body: ["A short video of NASEBANAL Quickstarts running, before you start it yourself."],
        video: { id: "Yf3kcHc-vGQ", title: "NASEBANAL Quickstarts - Quick Demo" },
      },
      {
        heading: "Start / stop the apps stack",
        body: [
          "apps:up starts MySQL (seeded with a small chart of accounts), the backend and this " +
            "frontend, all on the shared apps-network. apps:down stops and removes them, but leaves " +
            "the MySQL data volume alone - a normal restart doesn't lose anything you've recorded.",
        ],
        code: [
          {
            code: "make apps:up      # start MySQL + backend + frontend\nmake apps:down    # stop and remove the containers",
          },
          {
            label: "After changing a compose env var (KEYCLOAK_ISSUER, VAULT_ADDR, ...):",
            code: "make apps:restart # down then up - picks up new env vars, keeps MySQL data",
          },
          {
            label: "For a genuinely clean slate (wipes the MySQL volume too):",
            code: "make apps:reset",
          },
        ],
      },
      {
        heading: "Where things end up",
        table: {
          headers: ["Service", "URL"],
          rows: [
            ["Frontend", "http://localhost:5173"],
            ["API docs (Scalar)", "http://localhost:5173/api-specs"],
            ["This documentation", "http://localhost:5173/docs"],
            ["Backend REST", "http://localhost:8080"],
            ["Backend GraphQL", "http://localhost:8080/graphql"],
            ["MCP server", "http://localhost:8080/mcp"],
            ["MCP Inspector (make apps:mcp)", "http://localhost:6274"],
            ["MySQL", "localhost:3306 (database demo)"],
            ["SQL client (phpMyAdmin, no login needed)", "http://localhost:8081"],
          ],
        },
      },
      {
        heading: "Log in",
        body: [
          "The login checks a username and password against the users table in MySQL. One user is " +
            "seeded - demo, with the password demo. After logging in, the header's user menu leads to " +
            "the Profile page, where the email is shown (recorded, not editable) and the display name and " +
            "language can be changed and saved.",
        ],
        table: {
          headers: ["Username", "Password", "Language", "Display name"],
          rows: [
            ["demo", "demo", "en", "Demo User"],
          ],
        },
        closing: [
          "These are seed data for a local demo (apps/backend/app/seed.py), not credentials to protect. " +
          "Only a hash of the password is stored. Every test tool (Playwright, Locust, kafka-bridge, " +
          "Specmatic) logs in as demo.",
        ],
      },
      {
        heading: "Record a transaction",
        body: [
          "The frontend is an event-sourced ledger: every transaction is a signed entry appended against an " +
            "account, and an account's balance is just the running total of its entries. Log in at " +
            "http://localhost:5173 as demo / demo (make apps:open) and you land on the accounts page.",
        ],
        bullets: [
          "Under Record a Transaction, pick an account (say Cash), enter a signed quantity (1000) and press Record.",
          "The balance table refreshes by itself: that account's Balance goes up by 1000 and its Transactions count by 1.",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/app-record.png",
            alt: "The accounts page with Cash selected and 1000 entered in the Record a Transaction form",
            caption: "Before: Cash 120000 with 3 transactions - Cash and 1000 filled in, about to press Record.",
          },
          {
            src: "/docs/screenshots/app-recorded.png",
            alt: "The accounts page after recording: Cash now shows 121000 and 4 transactions",
            caption: "After: Cash 121000 with 4 transactions - the new entry is counted.",
          },
        ],
        closing: ["Starting numbers are those of a freshly reset stack (make all:reset); if you have already run the test tools they differ - what matters is the +1000 and the +1."],
      },
      {
        heading: "Look inside MySQL",
        body: [
          "The entry you just recorded is now a row in MySQL. The easiest way to see it is the SQL client: " +
            "make apps:sql opens phpMyAdmin already logged in to " +
            "demo (no password prompt - it connects as root for this local demo), with the two tables, " +
            "transactions and users, in the left-hand list. It also lets you click through the rows, and " +
            "shows mysql.user, where the users Vault creates in Scenario 5 appear.",
          "In the transactions table the new row is at the bottom - Cash, 1000, source api (recorded through " +
            "the REST API; the first five rows are seed data). From the terminal, make apps:mysql opens a mysql " +
            "shell, or runs one statement:",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mysql-transactions.png",
            alt: "phpMyAdmin showing the transactions table, the last row being the just-recorded Cash 1000 entry with source api",
            caption: "make apps:sql - the transactions table; the last row is the entry recorded above.",
          },
        ],
        code: [
          { code: "make apps:sql      # phpMyAdmin, already logged in" },
          { code: "make apps:mysql    # an interactive mysql shell on demo" },
          { code: "make apps:mysql SQL=\"SHOW TABLES\"" },
        ],
        terminal: {
          lines: [
            { text: "$ make apps:mysql SQL=\"SELECT id, name, quantity, source FROM transactions ORDER BY id DESC LIMIT 3\"", tone: "muted" },
            { text: "+----+---------------+----------+--------+" },
            { text: "| id | name          | quantity | source |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "|  6 | Cash          |     1000 | api    |" },
            { text: "|  5 | Cash          |    50000 | seed   |" },
            { text: "|  4 | Sales Revenue |    50000 | seed   |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "" },
            { text: "$ make apps:mysql SQL=\"SELECT username, email, display_name, language, provider FROM users WHERE provider = 'demo'\"", tone: "muted" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| username | email              | display_name | language | provider |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| demo     | demo@nasebanal.com | Demo User    | en       | demo     |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
          ],
        },
        closing: [
          "Real output. Try it in step with the app: record a transaction and a new transactions row appears; " +
          "save a new display name on the Profile page and the users row changes; log in through Keycloak " +
          "once (Scenario 4) and a keycloak row is created for you. A balance is the SUM of an account's " +
          "rows: SELECT name, SUM(quantity) FROM transactions GROUP BY name. The Overview page's ER diagram " +
          "shows every column.",
        ],
      },
      {
        heading: "One-shot test tools and their reports",
        body: [
          "pytest and vitest are self-contained (no apps:up needed - they swap in an in-memory " +
            "database / mock fetch respectively). playwright and specmatic:test exercise " +
            "the real, running apps, so start it first. specmatic:test checks the backend against " +
            "openapi.yaml - see [Scenario 1](/docs/scenario-testing).",
        ],
        code: [
          {
            code:
              "make apps:up                # needed by playwright/specmatic, not pytest/vitest\n\n" +
              "make pytest:test             # backend unit tests\n" +
              "make vitest:test             # frontend unit tests\n" +
              "make playwright:test         # E2E against the running frontend\n" +
              "make specmatic:test          # provider contract test against openapi.yaml",
          },
        ],
        closing: [
          "Every make <module>:test run leaves a browsable HTML report behind under <module>/report/ " +
          "(and make locust:load, the headless load run, under locust/logs/<timestamp>/) - all gitignored, regenerated on every run. " +
          "[Scenario 1](/docs/scenario-testing) covers every one of them: how to check the results, real " +
          "screenshots, and the evaluation of the results from this repository.",
        ],
      },
      {
        heading: "Try the backend's MCP server",
        code: [{ code: "make apps:mcp   # opens MCP Inspector at http://localhost:6274" }],
        body: [
          "The backend serves MCP natively at /mcp, and MCP Inspector (started with apps:up) is the quickest " +
            "way to try it. Its server list is fixed to two endpoints: apps-backend (this one) and agentgateway " +
            "(Scenario 6, which only connects while make agentgateway:up is running).",
        ],
        bullets: [
          "Flip the switch on the apps-backend card to connect - it turns green and shows Connected.",
          "Open the Tools tab, pick list_accounts_accounts_get (it takes no arguments) and press Execute Tool - the Results panel shows the same data GET /accounts returns.",
          "Every tool except health, login and the JWKS needs a token, and they all work here: pick get_me_me_get and Execute Tool - it returns the demo user's profile.",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mcp-inspector-servers.png",
            alt: "MCP Inspector's Servers screen with two disconnected servers, apps-backend and agentgateway",
            caption: "make apps:mcp - both MCP endpoints are listed, disconnected.",
          },
          {
            src: "/docs/screenshots/mcp-inspector-connected.png",
            alt: "MCP Inspector with apps-backend connected (green), after the initialize handshake shown in the message log",
            caption: "apps-backend connected - the right-hand log shows the initialize / tools/list handshake.",
          },
          {
            src: "/docs/screenshots/mcp-inspector-tools.png",
            alt: "MCP Inspector's Tools tab with list_accounts_accounts_get selected and an Execute Tool button",
            caption: "The backend's tool list, with list_accounts_accounts_get selected.",
          },
          {
            src: "/docs/screenshots/mcp-inspector-result.png",
            alt: "MCP Inspector's Results panel showing the JSON list of accounts",
            caption: "The result of the call - live data from the running backend.",
          },
        ],
        noteTitle: "Authentication token settings in MCP Inspector",
        noteHref: "https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/configuration#catalog-file-format",
        note:
          "/mcp requires a login, and there is nothing to sign in to in the Inspector: its server list is the read-only " +
          "apps/mcp-inspector/config.json (started with --config), and that file gives apps-backend and agentgateway an " +
          "Authorization header carrying the demo token, which the Inspector sends with every request. Without it /mcp answers " +
          "401 and the apps-backend card cannot connect, and get_me_me_get answers invalid or missing token. " +
          "The per-server headers field is the Inspector's own config format - see its documentation.",
      },
      {
        heading: "Checking with MCP clients other than Inspector",
        body: [
          "MCP Inspector is only one client - any MCP client that speaks Streamable HTTP can use the same " +
            "endpoint (agentgateway's own is registered in Scenario 6). Here is how the two Claude clients differ:",
        ],
        subsections: [
          {
            heading: "Claude Code vs. Claude Desktop",
            table: {
              headers: ["", "Claude Code", "Claude Desktop"],
              rows: [
                ["How it connects", "Directly - Streamable HTTP is supported as is", "Through the mcp-remote bridge (a local http:// address can't be a custom connector, which needs a public https URL)"],
                ["How to add", "claude mcp add --transport http <name> <url>", "Add an mcpServers entry to claude_desktop_config.json"],
                ["Then", "Restart Claude Code, or reconnect with /mcp - a running session doesn't pick up a newly added server", "Restart Claude Desktop"],
                ["Check", "/mcp lists the servers and their tools", "The servers' tools show up in a new chat"],
              ],
              nowrapColumns: [0],
            },
          },
          {
            heading: "Claude Code",
            code: [
              {
                code:
                  "claude mcp add --transport http apps-backend http://localhost:8080/mcp\n" +
                  "claude mcp list",
              },
            ],
            closing: [
              "claude mcp list shows Connected once the server is reachable, but a Claude Code session that was " +
              "already running doesn't load its tools yet - restart Claude Code, or reconnect with /mcp, before " +
              "asking for anything. Without a scope option the server is added to the current project only; add " +
              "-s user to use it from any directory.",
            ],
            bullets: [
              "/mcp is behind a login (every tool except health, login and the JWKS needs a token, and this is how an MCP " +
                "client gets one), so after restarting: open /mcp, pick apps-backend (it says needs authentication) and Authenticate.",
              "The browser opens the frontend's /mcp-authorize page - the app's own login: sign in with the Demo login " +
                "(demo / demo). Logging in with Keycloak instead is covered in [Scenario 4](/docs/scenario-keycloak).",
              "Press Allow (Deny tells the client access_denied). The browser lands on Claude Code's own " +
                "\"Authentication successful\" page - close the tab, then ask for get_me.",
              "Claude Code keeps the token, so the browser should open again only after claude mcp remove or when " +
                "the token expires (a day) or the backend's signing key changes. APPS_MCP_AUTH_REQUIRED=false in .env (+ make apps:restart) leaves /mcp open instead.",
            ],
            imagesLayout: "stack",
            images: [
              {
                src: "/docs/screenshots/mcp-authorize-login.png",
                alt: "The frontend's /mcp-authorize page with the login dialog open on Demo login, demo / demo filled in",
                caption: "Authenticate opens /mcp-authorize - the app's own login (Demo login).",
              },
              {
                src: "/docs/screenshots/mcp-authorize-allow.png",
                alt: "The /mcp-authorize page saying Claude Code (apps-backend) wants to use the MCP tools, signed in as demo, with Allow and Deny buttons",
                caption: "Signed in - press Allow to hand the login back to Claude Code.",
              },
            ],
          },
          {
            heading: "Claude Desktop (claude_desktop_config.json)",
            code: [
              {
                code:
                  "{\n" +
                  '  "mcpServers": {\n' +
                  '    "apps-backend": {\n' +
                  '      "command": "npx",\n' +
                  '      "args": ["-y", "mcp-remote", "http://localhost:8080/mcp"]\n' +
                  "    }\n" +
                  "  }\n" +
                  "}",
              },
            ],
            closing: [
              "Then ask something like \"list the accounts and their balances\" - Claude calls " +
              "list_accounts_accounts_get, asking you to approve the call first. mcp-remote runs the same browser " +
              "login on its own when /mcp asks for it - not tried here. Remove the Claude Code entries afterwards " +
              "with claude mcp remove <name>.",
            ],
          },
        ],
      },
      {
        heading: "How the /mcp login works",
        body: [
          "/mcp answers 401 until the client has logged in through the browser (the steps are under Claude Code " +
            "above); the token it ends up with is sent along with every tool call.",
        ],
        sequence: {
          summary:
            "Sequence diagram: Claude Code gets a 401 from /mcp, registers itself, sends the user to the frontend login, and trades the authorization code for a token that every tool call then carries.",
          participants: [
            { id: "cc", label: "Claude Code", sub: "MCP client" },
            { id: "fe", label: "Frontend", sub: "browser" },
            { id: "be", label: "Backend", sub: "/mcp + /oauth" },
          ],
          steps: [
            { kind: "message", from: "cc", to: "be", text: "POST /mcp with no token" },
            { kind: "message", from: "be", to: "cc", text: "401", detail: "WWW-Authenticate: Bearer resource_metadata=...", dashed: true },
            { kind: "message", from: "cc", to: "be", text: "Register this client", detail: "POST /oauth/register" },
            { kind: "message", from: "cc", to: "fe", text: "Open the browser", detail: "/mcp-authorize?client_id=...&code_challenge=..." },
            { kind: "note", at: "fe", text: "Sign in with the demo login - then Allow" },
            { kind: "message", from: "fe", to: "be", text: "Ask for the authorization code", detail: "POST /oauth/authorize + Bearer <demo login token>" },
            { kind: "message", from: "fe", to: "cc", text: "Redirect with the code", detail: "http://localhost:<port>/callback?code=..." },
            { kind: "message", from: "cc", to: "be", text: "Trade the code for a token", detail: "POST /oauth/token + PKCE verifier" },
            { kind: "message", from: "cc", to: "be", text: "Every call from now on", detail: "Authorization: Bearer <token> -> forwarded to the REST route" },
          ],
        },
        subsections: [
          {
            heading: "Good to know",
            bullets: [
              "The backend is the authorization server (app/mcp_oauth.py): protected-resource and " +
                "authorization-server metadata, dynamic client registration, authorization code + PKCE (S256). The " +
                "login itself is the frontend's, so a Keycloak login works with no extra code too (Scenario 4) - and the access " +
                "token that comes out is the ordinary demo token.",
              "client_id and the code are signed and self-contained (no store, any backend instance verifies " +
                "them); the code lives 60 seconds. Registration accepts only loopback http:// redirect URIs and " +
                "claude.ai / claude.com callbacks. The OAuth routes are tagged mcp-oauth and left out of the tool list.",
              "MCP Inspector is let in by the demo token in its config; any other client without a token gets 401. " +
                "agentgateway is unaffected (it calls the REST routes, never /mcp - see Scenario 6).",
              "Editing backend code while an MCP client is connected makes uvicorn's reload hang on the open " +
                "GET /mcp stream - use docker restart nb-backend. Turn the login off with " +
                "APPS_MCP_AUTH_REQUIRED=false in .env and make apps:restart.",
            ],
          },
        ],
        noteTitle: "fastapi-mcp: an MCP server from FastAPI routes",
        noteHref: "https://fastapi-mcp.tadata.com/getting-started/quickstart",
        note:
          "The backend's /mcp endpoint is mounted by fastapi-mcp (FastApiMCP(app).mount_http() in app/main.py). It " +
          "turns the REST routes into MCP tools and forwards each tool call's Authorization header to the route, " +
          "which is how the login's token reaches get_me and the others.",
      },
      {
        heading: "Reset everything",
        body: [
          "To undo what you changed while trying things out - recorded transactions, Kong's configuration, Kafka " +
            "topics, metrics and traces - run make all:reset. It stops every service, wipes the stored data of " +
            "apps, Kong, Kafka and observability, and clears each test tool's generated reports and logs. " +
            "Nothing is started afterwards: bring back what you need with make all:up (or a module's own up).",
        ],
        code: [{ code: "make all:reset   # stop everything and wipe stored data and generated reports" }],
        closing: [
          "Settings you edited in .env (for example APPS_API_BASE or APPS_MCP_AUTH_REQUIRED) are not touched - " +
            "put them back by hand. Each module also has its own reset (make apps:reset, make kong:reset, ...) " +
            "if you only want to start over with one of them.",
        ],
      },
      {
        heading: "Next: the eight scenarios",
        body: [
          "Each scenario below builds on apps:up and is independent of the others - run them in any " +
            "order, or skip straight to the one you're interested in. Every scenario ends the same way: " +
            "make <module>:down to tear its own piece back down, leaving apps itself running.",
        ],
      },
    ],
  },
  ja: {
    title: "Getting Started",
    description:
      "まずは基本機能を確認するための手順をまとめたページです。どのシナリオに入る前にも必要になる、" +
      "appsスタックの起動から動作確認までを順に進めます。コマンドはすべてリポジトリルートで実行する" +
      "普通のmakeターゲットで、各モジュールはアクションなしで(make apps、make kongのように)実行すると" +
      "自分自身のヘルプも表示します。",
    sections: [
      {
        heading: "クイックデモ",
        body: ["実際に起動する前に、NASEBANAL Quickstartsが動いている様子を短い動画で確認できます。"],
        video: { id: "Yf3kcHc-vGQ", title: "NASEBANAL Quickstarts - Quick Demo" },
      },
      {
        heading: "appsスタックの起動・停止",
        body: [
          "apps:upはMySQL(勘定科目のサンプルデータ入り)・backend・このfrontendを、共有の" +
            "apps-network上にまとめて起動します。apps:downはそれらを停止・削除しますが、MySQLの" +
            "データボリュームはそのまま残すため、通常の再起動で記帳した内容が消えることはありません。",
        ],
        code: [
          {
            code: "make apps:up      # MySQL + backend + frontendを起動\nmake apps:down    # コンテナを停止・削除",
          },
          {
            label: "compose環境変数(KEYCLOAK_ISSUER・VAULT_ADDRなど)を変更した後は:",
            code: "make apps:restart # down してから up — 新しい環境変数を反映し、MySQLデータは維持",
          },
          {
            label: "本当にまっさらな状態にしたい場合(MySQLボリュームも削除):",
            code: "make apps:reset",
          },
        ],
      },
      {
        heading: "起動後の各エンドポイント",
        table: {
          headers: ["サービス", "URL"],
          rows: [
            ["Frontend", "http://localhost:5173"],
            ["APIドキュメント(Scalar)", "http://localhost:5173/api-specs"],
            ["このドキュメント", "http://localhost:5173/docs"],
            ["Backend REST", "http://localhost:8080"],
            ["Backend GraphQL", "http://localhost:8080/graphql"],
            ["MCPサーバー", "http://localhost:8080/mcp"],
            ["MCP Inspector(make apps:mcp)", "http://localhost:6274"],
            ["MySQL", "localhost:3306(データベース demo)"],
            ["SQLクライアント(phpMyAdmin、ログイン不要)", "http://localhost:8081"],
          ],
        },
      },
      {
        heading: "ログインする",
        body: [
          "ログインは、ユーザー名とパスワードをMySQLのusersテーブルと照合します。デモ用のユーザー1人(demo、パスワードもdemo)が" +
            "シードされています。ログイン後、ヘッダーのユーザーメニューからプロフィール画面に" +
            "進むと、メールアドレス(記録のみで編集不可)が表示され、表示名と言語を変更して保存できます。",
        ],
        table: {
          headers: ["ユーザー名", "パスワード", "言語", "表示名"],
          rows: [
            ["demo", "demo", "en", "Demo User"],
          ],
        },
        closing: [
          "これらはローカルデモ用のシードデータ(apps/backend/app/seed.py)で、守るべき認証情報ではありません。" +
          "保存されているのはパスワードのハッシュだけです。すべてのテストツール(Playwright・Locust・" +
          "kafka-bridge・Specmatic)は、demoでログインします。",
        ],
      },
      {
        heading: "取引を記帳する",
        body: [
          "フロントエンドはイベントソーシングの帳簿です。取引はどれも、勘定科目に対して追記される符号付きのエントリで、" +
            "勘定科目の残高は、そのエントリの累計にすぎません。http://localhost:5173(make apps:open)に" +
            "demo / demoでログインすると、勘定科目のページが開きます。",
        ],
        bullets: [
          "Record a Transactionで勘定科目(例: Cash)を選び、符号付きの数量(1000)を入れてRecordを押します。",
          "残高の表は自動で更新され、その勘定科目のBalanceが1000、Transactionsの件数が1増えます。",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/app-record.png",
            alt: "勘定科目のページ。Record a TransactionフォームでCashを選び、1000を入力した状態",
            caption: "記帳前: Cashは120000で取引3件 — Cashと1000を入力し、Recordを押す直前。",
          },
          {
            src: "/docs/screenshots/app-recorded.png",
            alt: "記帳後の勘定科目のページ。Cashが121000、取引4件になっている",
            caption: "記帳後: Cashは121000で取引4件 — 新しいエントリが反映されている。",
          },
        ],
        closing: ["開始時の数値は、リセット直後(make all:reset)のスタックのものです。テストツールを実行済みだと違いますが、見るのは+1000と+1です。"],
      },
      {
        heading: "MySQLの中身を確認する",
        body: [
          "いま記帳したエントリは、MySQLの1行になっています。いちばん手軽に見る方法はSQLクライアントです: make apps:sqlでphpMyAdminが、demoにログイン済みの状態で" +
            "開きます(パスワード入力は不要 — このローカルデモではrootで接続します)。左の一覧に2つのテーブル、" +
            "transactionsとusersが並び、行をクリックして辿れます。シナリオ5でVaultが作るユーザーが現れる" +
            "mysql.userも見られます。",
          "transactionsテーブルでは、新しい行が末尾に入っています — Cash、1000、sourceはapi(REST API経由で記帳したため。" +
            "最初の5行はシードデータです)。ターミナルからは、make apps:mysqlでmysqlシェルを開くか、SQLを1文だけ実行できます:",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mysql-transactions.png",
            alt: "phpMyAdminのtransactionsテーブル。末尾の行が、いま記帳したCash 1000(sourceはapi)",
            caption: "make apps:sql — transactionsテーブル。末尾の行が上で記帳したエントリ。",
          },
        ],
        code: [
          { code: "make apps:sql      # phpMyAdmin(ログイン済み)" },
          { code: "make apps:mysql    # demoへの対話的なmysqlシェル" },
          { code: "make apps:mysql SQL=\"SHOW TABLES\"" },
        ],
        terminal: {
          lines: [
            { text: "$ make apps:mysql SQL=\"SELECT id, name, quantity, source FROM transactions ORDER BY id DESC LIMIT 3\"", tone: "muted" },
            { text: "+----+---------------+----------+--------+" },
            { text: "| id | name          | quantity | source |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "|  6 | Cash          |     1000 | api    |" },
            { text: "|  5 | Cash          |    50000 | seed   |" },
            { text: "|  4 | Sales Revenue |    50000 | seed   |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "" },
            { text: "$ make apps:mysql SQL=\"SELECT username, email, display_name, language, provider FROM users WHERE provider = 'demo'\"", tone: "muted" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| username | email              | display_name | language | provider |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| demo     | demo@nasebanal.com | Demo User    | en       | demo     |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
          ],
        },
        closing: [
          "実際の出力です。アプリの操作と並べて試してみてください: 取引を記帳するとtransactionsに新しい行が増え、" +
          "プロフィール画面で表示名を保存するとusersの行が変わり、Keycloakで一度ログインすれば(シナリオ4)" +
          "keycloakの行が自動で作られます。残高は科目の行のSUMです: SELECT name, SUM(quantity) FROM transactions " +
          "GROUP BY name。すべてのカラムは概要ページのER図にあります。",
        ],
      },
      {
        heading: "一発実行のテストツールとレポート",
        body: [
          "pytestとvitestは自己完結しています(それぞれインメモリDB・モックfetchに差し替えるため、" +
            "apps:up不要)。playwrightとspecmatic:testは実際に稼働中のappsを対象にするため、" +
            "先に起動してください。specmatic:testはbackendをopenapi.yamlに照らして確認します。" +
            "詳しくは、[シナリオ1](/docs/scenario-testing)を参照してください。",
        ],
        code: [
          {
            code:
              "make apps:up                # playwright/specmaticに必要(pytest/vitestは不要)\n\n" +
              "make pytest:test             # backendの単体テスト\n" +
              "make vitest:test             # frontendの単体テスト\n" +
              "make playwright:test         # 稼働中のfrontendに対するE2Eテスト\n" +
              "make specmatic:test          # openapi.yamlに対するProvider契約テスト",
          },
        ],
        closing: [
          "make <module>:testを実行するたびに、<module>/report/以下(ヘッドレスの負荷テストmake locust:loadはlocust/logs/<timestamp>/以下)に" +
          "ブラウザで見られるHTMLレポートが残ります — すべて.gitignore対象で、実行のたびに新しく生成されます。" +
          "[シナリオ1](/docs/scenario-testing)では、すべてのテストについて、結果の確認方法、実際のスクリーンショット、" +
          "本リポジトリでの結果の評価を記載しています。",
        ],
      },
      {
        heading: "backendのMCPサーバーを試す",
        code: [{ code: "make apps:mcp   # MCP Inspectorを開く(http://localhost:6274)" }],
        body: [
          "backendは/mcpでMCPをネイティブに提供しており、試すにはapps:upと一緒に起動するMCP Inspectorが手軽です。" +
            "サーバー一覧は2つのエンドポイントに固定されています: apps-backend(こちら)と、agentgateway" +
            "(シナリオ6。make agentgateway:upが動いている間だけ接続できます)。",
        ],
        bullets: [
          "apps-backendカードのスイッチをオンにして接続します。緑になりConnectedと表示されます。",
          "Toolsタブでlist_accounts_accounts_getを選び(引数はありません)、Execute Toolを押すと、ResultsにGET /accountsと同じデータが表示されます。",
          "health・login・JWKS以外のツールはどれもトークンが必要で、ここではすべて動きます: get_me_me_getを選んでExecute Toolを押すと、デモユーザーのプロフィールが返ります。",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mcp-inspector-servers.png",
            alt: "MCP InspectorのServers画面。apps-backendとagentgatewayの2つのサーバーが未接続で並んでいる",
            caption: "make apps:mcp — 2つのMCPエンドポイントが未接続の状態で並んでいる。",
          },
          {
            src: "/docs/screenshots/mcp-inspector-connected.png",
            alt: "apps-backendに接続した(緑)MCP Inspector。右のログにinitializeのハンドシェイクが出ている",
            caption: "apps-backendに接続した状態 — 右のログにinitialize / tools/listのやり取りが出ている。",
          },
          {
            src: "/docs/screenshots/mcp-inspector-tools.png",
            alt: "MCP InspectorのToolsタブ。list_accounts_accounts_getを選択し、Execute Toolボタンが見えている",
            caption: "backendのツール一覧。list_accounts_accounts_getを選択した状態。",
          },
          {
            src: "/docs/screenshots/mcp-inspector-result.png",
            alt: "MCP InspectorのResultsパネル。勘定科目一覧のJSONが表示されている",
            caption: "呼び出し結果 — 稼働中のbackendのライブなデータ。",
          },
        ],
        noteTitle: "MCP Inspectorにおける認証トークン設定",
        noteHref: "https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/configuration#catalog-file-format",
        note:
          "/mcpはログインが必要ですが、Inspectorで改めてログインする必要はありません。Inspectorのサーバー一覧は読み取り専用の" +
          "apps/mcp-inspector/config.json(--configで起動)で、このファイルがapps-backendとagentgatewayに、デモトークンを" +
          "入れたAuthorizationヘッダーを持たせ、Inspectorがすべてのリクエストでそれを送ります。ヘッダーがないと/mcpは401を返して" +
          "apps-backendのカードは接続できず、get_me_me_getはinvalid or missing tokenになります。" +
          "サーバーごとのheadersはInspector自身の設定ファイル形式です — 詳しくは公式ドキュメントを参照してください。",
      },
      {
        heading: "Inspector以外のMCPクライアントでの確認手順",
        body: [
          "MCP Inspectorは数あるクライアントの1つで、Streamable HTTPを話せるMCPクライアントなら同じ" +
            "エンドポイントを使えます(agentgatewayのエンドポイントはシナリオ6で登録します)。2つのClaudeクライアントの違いは次のとおりです:",
        ],
        subsections: [
          {
            heading: "Claude CodeとClaude Desktopの違い",
            table: {
              headers: ["", "Claude Code", "Claude Desktop"],
              rows: [
                ["接続の仕方", "直接 — Streamable HTTPにそのまま対応", "mcp-remoteブリッジ経由(ローカルのhttp://アドレスはカスタムコネクタにできない。カスタムコネクタには公開されたhttps URLが必要)"],
                ["追加の仕方", "claude mcp add --transport http <名前> <URL>", "claude_desktop_config.jsonのmcpServersにエントリを追加"],
                ["その後", "Claude Codeを再起動、または/mcpで再接続(起動中のセッションは追加したサーバーを読み込まない)", "Claude Desktopを再起動"],
                ["確認", "/mcpでサーバーとそのツールが一覧できる", "新しいチャットでサーバーのツールが使えるようになる"],
              ],
              nowrapColumns: [0],
            },
          },
          {
            heading: "Claude Code",
            code: [
              {
                code:
                  "claude mcp add --transport http apps-backend http://localhost:8080/mcp\n" +
                  "claude mcp list",
              },
            ],
            closing: [
              "claude mcp listでConnectedと表示されても、すでに起動していたClaude Codeのセッションにはまだツールが" +
              "読み込まれません。頼む前にClaude Codeを再起動するか、/mcpで再接続してください。スコープを指定しない" +
              "場合、サーバーは現在のプロジェクトにだけ追加されます。どのディレクトリからでも使うなら-s userを付けてください。",
            ],
            bullets: [
              "/mcpはログインが必要です(health・login・JWKS以外のツールにはトークンが必要で、MCPクライアントはこの方法で入手します)。" +
                "再起動後、/mcpでapps-backend(needs authenticationと表示されます)を選んでAuthenticateします。",
              "ブラウザでfrontendの/mcp-authorizeが開きます。アプリ自身のログインで、デモログイン(demo / demo)で" +
                "サインインします。Keycloakでログインする場合は[シナリオ4](/docs/scenario-keycloak)を参照してください。",
              "Allowを押します(Denyならクライアントにaccess_deniedが返ります)。ブラウザはClaude Code自身の" +
                "「Authentication successful」ページに移るので、タブを閉じてget_meを頼んでください。",
              "Claude Codeはトークンを保持するので、ブラウザが再び開くのはclaude mcp removeした後か、トークンの期限(1日)が切れた後、backendの署名鍵を変えた後だけです。" +
                ".envでAPPS_MCP_AUTH_REQUIRED=false(+ make apps:restart)にすると/mcpを開放できます。",
            ],
            imagesLayout: "stack",
            images: [
              {
                src: "/docs/screenshots/mcp-authorize-login.png",
                alt: "frontendの/mcp-authorizeページ。デモログインのダイアログが開き、demo / demoが入力されている",
                caption: "Authenticateで/mcp-authorizeが開く — アプリ自身のログイン(デモログイン)。",
              },
              {
                src: "/docs/screenshots/mcp-authorize-allow.png",
                alt: "/mcp-authorizeページ。Claude Code(apps-backend)がMCPツールを使いたいと表示され、demoでサインイン済み。AllowとDenyのボタンがある",
                caption: "ログイン済み — Allowを押すとログインがClaude Codeに返る。",
              },
            ],
          },
          {
            heading: "Claude Desktop(claude_desktop_config.json)",
            code: [
              {
                code:
                  "{\n" +
                  '  "mcpServers": {\n' +
                  '    "apps-backend": {\n' +
                  '      "command": "npx",\n' +
                  '      "args": ["-y", "mcp-remote", "http://localhost:8080/mcp"]\n' +
                  "    }\n" +
                  "  }\n" +
                  "}",
              },
            ],
            closing: [
              "あとは「勘定科目と残高を一覧して」などと頼むと、Claudeがlist_accounts_accounts_getを呼びます" +
              "(実行前に承認を求められます)。mcp-remoteは/mcpに求められると同じブラウザログインを自分で実行します(ここでは未検証)。" +
              "確認後はClaude Codeのエントリをclaude mcp remove <name>で外してください。",
            ],
          },
        ],
      },
      {
        heading: "/mcpのログインの仕組み",
        body: [
          "クライアントがブラウザでログインするまで/mcpは401を返し(手順は上のClaude Codeを参照)、" +
            "最終的に得たトークンが以後のすべてのツール呼び出しに付きます。",
        ],
        sequence: {
          summary:
            "シーケンス図: Claude Codeは/mcpで401を受けて自分を登録し、ユーザーをfrontendのログインへ送り、認可コードをトークンに交換して、以後のすべてのツール呼び出しに付けます。",
          participants: [
            { id: "cc", label: "Claude Code", sub: "MCP client" },
            { id: "fe", label: "Frontend", sub: "browser" },
            { id: "be", label: "Backend", sub: "/mcp + /oauth" },
          ],
          steps: [
            { kind: "message", from: "cc", to: "be", text: "トークンなしでPOST /mcp" },
            { kind: "message", from: "be", to: "cc", text: "401", detail: "WWW-Authenticate: Bearer resource_metadata=...", dashed: true },
            { kind: "message", from: "cc", to: "be", text: "クライアントを登録", detail: "POST /oauth/register" },
            { kind: "message", from: "cc", to: "fe", text: "ブラウザを開く", detail: "/mcp-authorize?client_id=...&code_challenge=..." },
            { kind: "note", at: "fe", text: "デモログインでサインインしてAllow" },
            { kind: "message", from: "fe", to: "be", text: "認可コードを要求", detail: "POST /oauth/authorize + Bearer <demo login token>" },
            { kind: "message", from: "fe", to: "cc", text: "codeを付けてリダイレクト", detail: "http://localhost:<port>/callback?code=..." },
            { kind: "message", from: "cc", to: "be", text: "codeをトークンに交換", detail: "POST /oauth/token + PKCE verifier" },
            { kind: "message", from: "cc", to: "be", text: "以後のすべての呼び出し", detail: "Authorization: Bearer <token> -> forwarded to the REST route" },
          ],
        },
        subsections: [
          {
            heading: "知っておくこと",
            bullets: [
              "backend(app/mcp_oauth.py)が認可サーバーです。protected-resourceと認可サーバーのメタデータ、" +
                "動的クライアント登録、認可コード+PKCE(S256)を提供します。ログイン自体はfrontendのものなので、" +
                "Keycloakのログインも追加コードなしで使え(シナリオ4)、出てくるアクセストークンは通常のデモトークンです。",
              "client_idとcodeは署名つきで自己完結しています(保存先なし、どのbackendインスタンスでも検証できます)。" +
                "codeの有効期間は60秒です。登録できるリダイレクトURIはループバックのhttp://と、claude.ai / " +
                "claude.comのコールバックだけです。OAuthのルートはmcp-oauthタグを付けて、ツール一覧から外しています。",
              "MCP Inspectorは設定内のデモトークンで通ります。トークンを持たないほかのクライアントは401になります。" +
                "agentgatewayは影響を受けません(REST経路を呼び、/mcpは使いません — シナリオ6を参照)。",
              "MCPクライアントを接続したままbackendのコードを編集すると、開いたままのGET /mcpストリームに" +
                "uvicornの再読み込みが阻まれて固まります。docker restart nb-backendを使ってください。" +
                "ログインを止めるには、.envでAPPS_MCP_AUTH_REQUIRED=falseにしてmake apps:restartします。",
            ],
          },
        ],
        noteTitle: "fastapi-mcp: FastAPIのルートからMCPサーバーを作る",
        noteHref: "https://fastapi-mcp.tadata.com/getting-started/quickstart",
        note:
          "backendの/mcpは、fastapi-mcpがマウントしています(app/main.pyのFastApiMCP(app).mount_http())。RESTのルートをMCPツールに変換し、ツール呼び出しごとにAuthorizationヘッダーを対応するルートへ転送します。ログインで得たトークンがget_meなどに届くのはこのためです。",
      },
      {
        heading: "すべてをリセットする",
        body: [
          "試している間に加えた変更(記帳した取引、Kongの設定、Kafkaのトピック、メトリクスやトレースなど)を" +
            "元に戻すには、make all:resetを実行します。すべてのサービスを停止し、apps・Kong・Kafka・" +
            "observabilityの保存データと、各テストツールが生成したレポートやログを消去します。" +
            "実行後は何も起動しないので、必要なものをmake all:up(またはモジュールごとのup)で起動し直してください。",
        ],
        code: [{ code: "make all:reset   # すべて停止し、保存データと生成レポートを消去" }],
        closing: [
          ".envに加えた設定(APPS_API_BASEやAPPS_MCP_AUTH_REQUIREDなど)は変更されないので、必要なら手で" +
            "元に戻してください。モジュールごとのreset(make apps:reset、make kong:resetなど)もあり、" +
            "一部だけやり直すこともできます。",
        ],
      },
      {
        heading: "次は8つのシナリオ",
        body: [
          "以下の各シナリオはapps:upの上に成り立ち、互いに独立しています — どの順で試しても、興味のある" +
            "ものだけ試してもかまいません。どのシナリオも最後はmake <module>:downでそのモジュールだけを" +
            "片付け、apps自体は動いたままにする、という同じ終わり方をします。",
        ],
      },
    ],
  },
};
