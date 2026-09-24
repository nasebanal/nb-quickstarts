import type { LocalizedDocsPage } from "./types";

export const overview: LocalizedDocsPage = {
  en: {
    title: "Overview",
    description:
      "apps is the test-target stack nb-quickstarts uses to verify the NASEBANAL Stack: a Next.js " +
      "frontend and a FastAPI backend (REST + GraphQL + MCP) over a MySQL-backed, event-sourced " +
      "accounting ledger. Every other module in the toolkit exercises this same running stack from a " +
      "different angle - the diagram below is the bird's-eye view of how they all connect on the shared " +
      "apps-network.",
    sections: [
      {
        heading: "Constituent modules",
        table: {
          headers: ["Module", "Role"],
          rows: [
            ["apps", "The test-target stack itself - frontend, backend, MySQL."],
            ["Kong", "API gateway in front of the backend - can swap its target to a contract mock."],
            ["Kafka + kafka-bridge", "Asynchronous event ingestion - a topic, drained into POST /accounts."],
            ["Consul", "Service discovery - registers and health-checks the real backend (up to three instances) and MySQL; a client finds healthy instances through it."],
            ["Keycloak", "OIDC identity provider - issues real JWTs the backend validates."],
            ["Vault", "Secret storage - can supply the MySQL credential the backend connects with."],
            ["Specmatic", "Contract testing (Provider + Consumer) against openapi.yaml, plus a stub mock."],
            ["Microcks", "A second, independent mock server built from the same OpenAPI schema."],
            ["agentgateway", "A second way to expose the backend as MCP tools - built from OpenAPI, not code."],
            ["Observability", "OTel Collector + Prometheus + Alertmanager + Tempo + Loki + Grafana, receiving traces, metrics and logs over OTLP from the backend."],
          ],
        },
      },
      {
        heading: "Data model: an event-sourced ledger",
        body: [
          "The accounts table holds accounting events, not accounts. Each row is a signed quantity " +
            "delta - a debit or credit - posted against a name, never an update to an existing balance. " +
            "GET /accounts/balances computes each name's current balance as the running sum of its own " +
            "events (a GROUP BY name SUM), the same pattern real bookkeeping and event-sourced financial " +
            "systems use. Nothing is ever edited or deleted - the full history stays queryable as " +
            "GET /accounts.",
        ],
      },
      {
        heading: "API surfaces",
        bullets: [
          "REST — /accounts, /accounts/balances, /accounts/{id}, /auth/login. The contract lives in " +
            "openapi.yaml, hand-maintained rather than generated from the route code, so contract tests " +
            "(Specmatic) can catch real drift, not just behavioral bugs.",
          "GraphQL — the same data through /graphql (Strawberry): an accounts query, a balances query " +
            "and a createAccount mutation.",
          "MCP — /mcp (Streamable HTTP, via fastapi-mcp) auto-generates MCP tools from the REST routes.",
        ],
        note: "Browse the live REST reference at /api-specs (the header's other link, right next to Docs).",
      },
      {
        heading: "Authentication, at baseline",
        body: [
          "POST /auth/login takes a username and password, checked against the users table in MySQL " +
            "(one seeded user: demo, with the password demo), and returns an " +
            "opaque bearer token that unlocks the protected write path (POST /accounts) and the profile " +
            "(GET /me, PUT /me/profile - email, display name and language, edited on the app's Profile " +
            "page). Scenarios 5 and 6 replace pieces of this with real infrastructure: Keycloak for the " +
            "identity check itself, Vault for the credential the backend's own database connection uses.",
        ],
      },
      {
        heading: "Where to go next",
        body: [
          "Getting Started covers the basic make apps:up / down / restart / reset commands and the " +
            "one-shot test tools. The seven scenarios each take one module from the table above and wire " +
            "it into this same running apps stack, with the exact commands and what to expect at every " +
            "step.",
        ],
      },
    ],
  },
  ja: {
    title: "概要",
    description:
      "appsは、nb-quickstartsがNASEBANAL Stackを検証するために使うテスト対象そのものです。Next.jsの" +
      "frontendと、REST・GraphQL・MCPを提供するFastAPIのbackendが、MySQLを使ったイベントソーシング型の" +
      "会計台帳の上に構成されています。ツールキットの他のすべてのモジュールは、この同じ稼働中のスタックを" +
      "それぞれ異なる角度から検証対象にしています — 下の図は、それらがapps-network上でどう繋がっているかの" +
      "鳥瞰図です。",
    sections: [
      {
        heading: "構成モジュール一覧",
        table: {
          headers: ["モジュール", "役割"],
          rows: [
            ["apps", "テスト対象のスタックそのもの — frontend・backend・MySQL。"],
            ["Kong", "backendの前段に立つAPIゲートウェイ。向き先を契約モックに切り替えられる。"],
            ["Kafka + kafka-bridge", "非同期のイベント取り込み — トピックをPOST /accountsへ流し込む。"],
            ["Consul", "サービスディスカバリ — 実際のbackend(最大3インスタンス)とMySQLを登録・ヘルスチェックし、クライアントはそこから健全なインスタンスを見つける。"],
            ["Keycloak", "OIDC IDプロバイダー — backendが検証する本物のJWTを発行する。"],
            ["Vault", "シークレットストア — backendが接続に使うMySQL認証情報を供給できる。"],
            ["Specmatic", "openapi.yamlに対する契約テスト(Provider/Consumer)と、同じ契約由来のスタブ。"],
            ["Microcks", "同じOpenAPIスキーマから作られる、もう一つの独立したモックサーバー。"],
            ["agentgateway", "backendをMCPツールとして公開するもう一つの経路 — コードではなくOpenAPI由来。"],
            ["Observability", "OTel Collector + Prometheus + Alertmanager + Tempo + Loki + Grafana。backendからトレース・メトリクス・ログをOTLPで受信。"],
          ],
        },
      },
      {
        heading: "データモデル:イベントソーシング型の台帳",
        body: [
          "accountsテーブルが保持しているのは勘定科目そのものではなく、会計イベントです。各行は勘定科目名に" +
            "対して記帳される符号付きの数量差分(借方/貸方)であり、既存残高の更新ではありません。" +
            "GET /accounts/balancesは各勘定科目の現在残高を、その勘定科目のイベントを積み上げた合計" +
            "(GROUP BY nameのSUM)として計算します — 実際の簿記やイベントソーシング型の金融システムと同じ" +
            "考え方です。何も編集・削除されないため、GET /accountsで全履歴を常に参照できます。",
        ],
      },
      {
        heading: "API",
        bullets: [
          "REST — /accounts・/accounts/balances・/accounts/{id}・/auth/login。契約はopenapi.yamlに手書きで" +
            "維持されており、実装コードから自動生成しません。そのため契約テスト(Specmatic)が、単なる挙動" +
            "バグではなく実際の契約ドリフトを検出できます。",
          "GraphQL — 同じデータを/graphql(Strawberry)経由でも提供します。accountsクエリ・balancesクエリ・" +
            "createAccountミューテーションがあります。",
          "MCP — /mcp(Streamable HTTP、fastapi-mcp経由)はRESTルートからMCPツールを自動生成します。",
        ],
        note: "ライブのREST APIリファレンスは/api-specsで参照できます(Docsの右隣、ヘッダーのもう一つのリンク)。",
      },
      {
        heading: "認証のベースライン",
        body: [
          "POST /auth/loginはユーザー名とパスワードを受け取り、MySQLのusersテーブルと照合して(demoユーザー1人が" +
            "シード済みで、パスワードはdemo)、保護された書き込み(POST /accounts)とプロフィール" +
            "(GET /me・PUT /me/profile — メール・表示名・言語。アプリのプロフィール画面で編集)を使える不透明な" +
            "bearerトークンを返します。シナリオ5と6は、この一部を本物のインフラに置き換えます: 本人確認そのものを" +
            "Keycloakに、backend自身のデータベース接続の認証情報をVaultに。",
        ],
      },
      {
        heading: "次に読むもの",
        body: [
          "Getting Startedでは、基本のmake apps:up / down / restart / resetコマンドと、一発実行のテスト" +
            "ツール群を扱います。7つのシナリオは、それぞれ上の表のモジュールを1つずつ取り上げて、この同じ" +
            "稼働中のappsスタックに組み込みます — 実際のコマンドと、各ステップで何が起きるかを添えて。",
        ],
      },
    ],
  },
};
