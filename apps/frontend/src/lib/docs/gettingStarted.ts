import type { LocalizedDocsPage } from "./types";

export const gettingStarted: LocalizedDocsPage = {
  en: {
    title: "Getting Started",
    description:
      "Every command below is a plain make target, run from the repository root. Each module also " +
      "prints its own help - run make apps, make kong, and so on with no action - so this page only " +
      "covers the commands you need before touching any scenario.",
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
        note:
          "These are seed data for a local demo (apps/backend/app/seed.py), not credentials to protect. " +
          "Only a hash of the password is stored. Every test tool (Playwright, Locust, kafka-bridge, " +
          "Specmatic) logs in as demo.",
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
        note: "Starting numbers are those of a freshly reset stack (make all:reset); if you have already run the test tools they differ - what matters is the +1000 and the +1.",
      },
      {
        heading: "Look inside MySQL",
        body: [
          "The entry you just recorded is now a row in MySQL. The easiest way to see it is the SQL client: " +
            "make apps:sql opens phpMyAdmin already logged in to " +
            "demo (no password prompt - it connects as root for this local demo), with the two tables, " +
            "transactions and users, in the left-hand list. It also lets you click through the rows, and " +
            "shows mysql.user, where the users Vault creates in Scenario 6 appear.",
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
        note:
          "Real output. Try it in step with the app: record a transaction and a new transactions row appears; " +
          "save a new display name on the Profile page and the users row changes; log in through Keycloak " +
          "once (Scenario 5) and a keycloak row is created for you. A balance is the SUM of an account's " +
          "rows: SELECT name, SUM(quantity) FROM transactions GROUP BY name. The Overview page's ER diagram " +
          "shows every column.",
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
        note:
          "Every make <module>:test run leaves a browsable HTML report behind under <module>/report/ " +
          "(and make locust:load, the headless load run, under locust/logs/<timestamp>/) - all gitignored, regenerated on every run. " +
          "[Scenario 1](/docs/scenario-testing) covers every one of them: how to check the results, real " +
          "screenshots, and the evaluation of the results from this repository.",
      },
      {
        heading: "Try the backend's MCP server",
        code: [{ code: "make apps:mcp   # opens MCP Inspector at http://localhost:6274" }],
        body: [
          "The backend serves MCP natively at /mcp, and MCP Inspector (started with apps:up) is the quickest " +
            "way to try it. Its server list is fixed to two endpoints: apps-backend (this one) and agentgateway " +
            "(Scenario 7, which only connects while make agentgateway:up is running).",
        ],
        bullets: [
          "Flip the switch on the apps-backend card to connect - it turns green and shows Connected.",
          "Open the Tools tab, pick list_accounts_accounts_get (it takes no arguments) and press Execute Tool - the Results panel shows the same data GET /accounts returns.",
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
      },
      {
        heading: "Also try it from Claude (or another MCP client)",
        body: [
          "MCP Inspector is only one client - any MCP client that speaks Streamable HTTP can use the same " +
            "endpoints (agentgateway's needs make agentgateway:up). Here is how the two Claude clients differ:",
        ],
        subsections: [
          {
            heading: "Claude Code vs. Claude Desktop",
            table: {
              headers: ["", "Claude Code", "Claude Desktop"],
              rows: [
                ["How it connects", "Directly - Streamable HTTP is supported as is", "Through the mcp-remote bridge (a local http:// address can't be a custom connector, which needs a public https URL)"],
                ["How to add", "claude mcp add --transport http <name> <url>", "Add an mcpServers entry to claude_desktop_config.json (use http://localhost:8010/mcp for agentgateway)"],
                ["Then", "Start (or restart) Claude Code", "Restart Claude Desktop"],
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
                  "claude mcp add --transport http agentgateway http://localhost:8010/mcp\n" +
                  "claude mcp list",
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
            note:
              "Then ask something like \"list the accounts and their balances\" - Claude calls " +
              "list_accounts_accounts_get, asking you to approve the call first. These are local, " +
              "unauthenticated demo endpoints; remove them afterwards with claude mcp remove <name>.",
          },
        ],
      },
      {
        heading: "Next: the seven scenarios",
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
      "以下のコマンドはすべてリポジトリルートで実行する、普通のmakeターゲットです。各モジュールは" +
      "アクションなしで(make apps、make kongのように)実行すると自分自身のヘルプも表示するので、この" +
      "ページではどのシナリオに入る前にも必要になる最低限のコマンドだけを扱います。",
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
        note:
          "これらはローカルデモ用のシードデータ(apps/backend/app/seed.py)で、守るべき認証情報ではありません。" +
          "保存されているのはパスワードのハッシュだけです。すべてのテストツール(Playwright・Locust・" +
          "kafka-bridge・Specmatic)は、demoでログインします。",
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
        note: "開始時の数値は、リセット直後(make all:reset)のスタックのものです。テストツールを実行済みだと違いますが、見るのは+1000と+1です。",
      },
      {
        heading: "MySQLの中身を確認する",
        body: [
          "いま記帳したエントリは、MySQLの1行になっています。いちばん手軽に見る方法はSQLクライアントです: make apps:sqlでphpMyAdminが、demoにログイン済みの状態で" +
            "開きます(パスワード入力は不要 — このローカルデモではrootで接続します)。左の一覧に2つのテーブル、" +
            "transactionsとusersが並び、行をクリックして辿れます。シナリオ6でVaultが作るユーザーが現れる" +
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
        note:
          "実際の出力です。アプリの操作と並べて試してみてください: 取引を記帳するとtransactionsに新しい行が増え、" +
          "プロフィール画面で表示名を保存するとusersの行が変わり、Keycloakで一度ログインすれば(シナリオ5)" +
          "keycloakの行が自動で作られます。残高は科目の行のSUMです: SELECT name, SUM(quantity) FROM transactions " +
          "GROUP BY name。すべてのカラムは概要ページのER図にあります。",
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
        note:
          "make <module>:testを実行するたびに、<module>/report/以下(ヘッドレスの負荷テストmake locust:loadはlocust/logs/<timestamp>/以下)に" +
          "ブラウザで見られるHTMLレポートが残ります — すべて.gitignore対象で、実行のたびに新しく生成されます。" +
          "[シナリオ1](/docs/scenario-testing)では、すべてのテストについて、結果の確認方法、実際のスクリーンショット、" +
          "本リポジトリでの結果の評価を記載しています。",
      },
      {
        heading: "backendのMCPサーバーを試す",
        code: [{ code: "make apps:mcp   # MCP Inspectorを開く(http://localhost:6274)" }],
        body: [
          "backendは/mcpでMCPをネイティブに提供しており、試すにはapps:upと一緒に起動するMCP Inspectorが手軽です。" +
            "サーバー一覧は2つのエンドポイントに固定されています: apps-backend(こちら)と、agentgateway" +
            "(シナリオ7。make agentgateway:upが動いている間だけ接続できます)。",
        ],
        bullets: [
          "apps-backendカードのスイッチをオンにして接続します。緑になりConnectedと表示されます。",
          "Toolsタブでlist_accounts_accounts_getを選び(引数はありません)、Execute Toolを押すと、ResultsにGET /accountsと同じデータが表示されます。",
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
      },
      {
        heading: "Inspector以外に、Claudeなど他のMCPクライアントでも確認できます",
        body: [
          "MCP Inspectorは数あるクライアントの1つで、Streamable HTTPを話せるMCPクライアントなら同じ" +
            "エンドポイントを使えます(agentgatewayはmake agentgateway:upが必要)。2つのClaudeクライアントの違いは次のとおりです:",
        ],
        subsections: [
          {
            heading: "Claude CodeとClaude Desktopの違い",
            table: {
              headers: ["", "Claude Code", "Claude Desktop"],
              rows: [
                ["接続の仕方", "直接 — Streamable HTTPにそのまま対応", "mcp-remoteブリッジ経由(ローカルのhttp://アドレスはカスタムコネクタにできない。カスタムコネクタには公開されたhttps URLが必要)"],
                ["追加の仕方", "claude mcp add --transport http <名前> <URL>", "claude_desktop_config.jsonのmcpServersにエントリを追加(agentgatewayならhttp://localhost:8010/mcp)"],
                ["その後", "Claude Codeを(再)起動", "Claude Desktopを再起動"],
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
                  "claude mcp add --transport http agentgateway http://localhost:8010/mcp\n" +
                  "claude mcp list",
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
            note:
              "あとは「勘定科目と残高を一覧して」などと頼むと、Claudeがlist_accounts_accounts_getを呼びます" +
              "(実行前に承認を求められます)。これらはデモ用の認証なしのローカルエンドポイントです。確認後は" +
              "claude mcp remove <name>で外してください。",
          },
        ],
      },
      {
        heading: "次は7つのシナリオ",
        body: [
          "以下の各シナリオはapps:upの上に成り立ち、互いに独立しています — どの順で試しても、興味のある" +
            "ものだけ試してもかまいません。どのシナリオも最後はmake <module>:downでそのモジュールだけを" +
            "片付け、apps自体は動いたままにする、という同じ終わり方をします。",
        ],
      },
    ],
  },
};
