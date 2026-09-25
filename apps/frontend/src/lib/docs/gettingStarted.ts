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
            ["demo", "demo", "ja", "Demo User"],
          ],
        },
        note:
          "These are seed data for a local demo (apps/backend/app/seed.py), not credentials to protect. " +
          "Only a hash of the password is stored. Every test tool (Playwright, Locust, kafka-bridge, " +
          "Specmatic) logs in as demo.",
      },
      {
        heading: "Look inside MySQL",
        body: [
          "The easiest way in is the SQL client: make apps:sql opens phpMyAdmin already logged in to " +
            "demo (no password prompt - it connects as root for this local demo), with the two tables, " +
            "accounts and users, in the left-hand list. It also lets you click through the rows, and " +
            "shows mysql.user, where the users Vault creates in Scenario 6 appear.",
          "From the terminal, make apps:mysql opens a mysql shell, or runs one statement:",
        ],
        code: [
          { code: "make apps:sql      # phpMyAdmin, already logged in" },
          { code: "make apps:mysql    # an interactive mysql shell on demo" },
          { code: "make apps:mysql SQL=\"SHOW TABLES\"" },
        ],
        terminal: {
          lines: [
            { text: "$ make apps:mysql SQL=\"SELECT id, name, quantity, source FROM accounts ORDER BY id LIMIT 5\"", tone: "muted" },
            { text: "+----+---------------+----------+--------+" },
            { text: "| id | name          | quantity | source |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "|  1 | Cash          |   100000 | seed   |" },
            { text: "|  2 | Rent Expense  |    30000 | seed   |" },
            { text: "|  3 | Cash          |   -30000 | seed   |" },
            { text: "|  4 | Sales Revenue |    50000 | seed   |" },
            { text: "|  5 | Cash          |    50000 | seed   |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "" },
            { text: "$ make apps:mysql SQL=\"SELECT username, email, display_name, language, provider FROM users WHERE provider = 'demo'\"", tone: "muted" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| username | email              | display_name | language | provider |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| demo     | demo@nasebanal.com | Demo User    | ja       | demo     |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
          ],
        },
        note:
          "Real output. Try it in step with the app: record a transaction and a new accounts row appears; " +
          "save a new display name on the Profile page and the users row changes; log in through Keycloak " +
          "once (Scenario 5) and a keycloak row is created for you. A balance is the SUM of an account's " +
          "rows: SELECT name, SUM(quantity) FROM accounts GROUP BY name. The Overview page's ER diagram " +
          "shows every column.",
      },
      {
        heading: "One-shot test tools",
        body: [
          "pytest and vitest are self-contained (no apps:up needed - they swap in an in-memory " +
            "database / mock fetch respectively). playwright, specmatic:test and microcks:test exercise " +
            "the real, running apps, so start it first; microcks:test also needs the Microcks server " +
            "(make microcks:up). specmatic:test and microcks:test both check the backend against " +
            "openapi.yaml - [Scenario 1](/docs/scenario-testing) explains how they differ and when to use which.",
        ],
        code: [
          {
            code:
              "make apps:up                # needed by playwright/specmatic, not pytest/vitest\n\n" +
              "make pytest:test             # backend unit tests\n" +
              "make vitest:test             # frontend unit tests\n" +
              "make playwright:test         # E2E against the running frontend\n" +
              "make specmatic:test          # provider contract test against openapi.yaml\n" +
              "make microcks:up && make microcks:test   # second provider check with Microcks (6 of 9 pass - see Scenario 1)",
          },
        ],
        note:
          "Every make <module>:test run leaves a browsable HTML report behind under <module>/report/ " +
          "(or locust/logs/<timestamp>/ for Locust) - all gitignored, regenerated on every run.",
      },
      {
        heading: "Reports",
        body: [
          "Each test command leaves an HTML report behind. [Scenario 1](/docs/scenario-testing) covers every one of them: " +
            "how to check the results, real screenshots, and the evaluation of the results from this " +
            "repository - including the Microcks run (microcks/report/latest.json, plus its page in the " +
            "Microcks UI) and the findings it made that Specmatic did not.",
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
            ["demo", "demo", "ja", "Demo User"],
          ],
        },
        note:
          "これらはローカルデモ用のシードデータ(apps/backend/app/seed.py)で、守るべき認証情報ではありません。" +
          "保存されているのはパスワードのハッシュだけです。すべてのテストツール(Playwright・Locust・" +
          "kafka-bridge・Specmatic)は、demoでログインします。",
      },
      {
        heading: "MySQLの中身を確認する",
        body: [
          "いちばん手軽なのはSQLクライアントです: make apps:sqlでphpMyAdminが、demoにログイン済みの状態で" +
            "開きます(パスワード入力は不要 — このローカルデモではrootで接続します)。左の一覧に2つのテーブル、" +
            "accountsとusersが並び、行をクリックして辿れます。シナリオ6でVaultが作るユーザーが現れる" +
            "mysql.userも見られます。",
          "ターミナルからは、make apps:mysqlでmysqlシェルを開くか、SQLを1文だけ実行できます:",
        ],
        code: [
          { code: "make apps:sql      # phpMyAdmin(ログイン済み)" },
          { code: "make apps:mysql    # demoへの対話的なmysqlシェル" },
          { code: "make apps:mysql SQL=\"SHOW TABLES\"" },
        ],
        terminal: {
          lines: [
            { text: "$ make apps:mysql SQL=\"SELECT id, name, quantity, source FROM accounts ORDER BY id LIMIT 5\"", tone: "muted" },
            { text: "+----+---------------+----------+--------+" },
            { text: "| id | name          | quantity | source |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "|  1 | Cash          |   100000 | seed   |" },
            { text: "|  2 | Rent Expense  |    30000 | seed   |" },
            { text: "|  3 | Cash          |   -30000 | seed   |" },
            { text: "|  4 | Sales Revenue |    50000 | seed   |" },
            { text: "|  5 | Cash          |    50000 | seed   |" },
            { text: "+----+---------------+----------+--------+" },
            { text: "" },
            { text: "$ make apps:mysql SQL=\"SELECT username, email, display_name, language, provider FROM users WHERE provider = 'demo'\"", tone: "muted" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| username | email              | display_name | language | provider |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
            { text: "| demo     | demo@nasebanal.com | Demo User    | ja       | demo     |" },
            { text: "+----------+--------------------+--------------+----------+----------+" },
          ],
        },
        note:
          "実際の出力です。アプリの操作と並べて試してみてください: 取引を記帳するとaccountsに新しい行が増え、" +
          "プロフィール画面で表示名を保存するとusersの行が変わり、Keycloakで一度ログインすれば(シナリオ5)" +
          "keycloakの行が自動で作られます。残高は科目の行のSUMです: SELECT name, SUM(quantity) FROM accounts " +
          "GROUP BY name。すべてのカラムは概要ページのER図にあります。",
      },
      {
        heading: "一発実行のテストツール",
        body: [
          "pytestとvitestは自己完結しています(それぞれインメモリDB・モックfetchに差し替えるため、" +
            "apps:up不要)。playwright、specmatic:test、microcks:testは実際に稼働中のappsを対象にするため、" +
            "先に起動してください。microcks:testにはMicrocksサーバー(make microcks:up)も必要です。" +
            "specmatic:testとmicrocks:testはどちらもbackendをopenapi.yamlに照らして確認します。違いと" +
            "使い分けは、[シナリオ1](/docs/scenario-testing)で説明しています。",
        ],
        code: [
          {
            code:
              "make apps:up                # playwright/specmaticに必要(pytest/vitestは不要)\n\n" +
              "make pytest:test             # backendの単体テスト\n" +
              "make vitest:test             # frontendの単体テスト\n" +
              "make playwright:test         # 稼働中のfrontendに対するE2Eテスト\n" +
              "make specmatic:test          # openapi.yamlに対するProvider契約テスト\n" +
              "make microcks:up && make microcks:test   # Microcksによる2つ目のProvider確認(9件中6件が成功 — シナリオ1を参照)",
          },
        ],
        note:
          "make <module>:testを実行するたびに、<module>/report/以下(Locustはlocust/logs/<timestamp>/以下)に" +
          "ブラウザで見られるHTMLレポートが残ります — すべて.gitignore対象で、実行のたびに新しく生成されます。",
      },
      {
        heading: "レポート",
        body: [
          "各テストコマンドは、HTMLレポートを残します。[シナリオ1](/docs/scenario-testing)では、すべてのテストについて、" +
            "結果の確認方法、実際のスクリーンショット、本リポジトリでの結果の評価を記載しています。" +
            "Microcksの実行(microcks/report/latest.jsonと、MicrocksのUIにある実行結果のページ)と、Specmaticが" +
            "検出しなかった発見事項も含みます。",
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
