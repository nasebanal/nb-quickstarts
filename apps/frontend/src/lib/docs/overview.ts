import type { DocsSequence, LocalizedDocsPage } from "./types";
import { scenarioKeycloak } from "./scenarioKeycloak";
import { scenarioVault } from "./scenarioVault";

// The Overview reuses the scenarios' own flow diagrams, so the picture of "how login works" or
// "how the credential is issued" is drawn once and cannot drift from the scenario that sets it up.
function sequenceOf(page: LocalizedDocsPage, locale: "en" | "ja"): DocsSequence {
  const found = page[locale].sections.find((section) => section.sequence)?.sequence;
  if (!found) throw new Error("scenario page has no sequence diagram");
  return found;
}


export const overview: LocalizedDocsPage = {
  en: {
    title: "Overview",
    description:
      "nb-quickstarts is a reference architecture for microservices, built only from open-source parts " +
      "that you can run yourself: clone it, run make, and every piece below is up on your own machine. " +
      "The application in the middle is deliberately small - an accounting ledger - so that what you look " +
      "at is everything around it: how traffic is routed, how load is absorbed, who is allowed in, where " +
      "secrets live, how you see what is happening, and how you check it all still works. The diagram is " +
      "the bird's-eye view of how the pieces connect on the shared apps-network.",
    sections: [
      {
        heading: "What this is for",
        body: [
          "Building a microservice system means answering the same handful of questions, and every " +
            "answer is another piece of software: how do requests get in, how do you survive a burst, how do " +
            "instances find each other, how do you know who is calling, where do passwords live, how do you " +
            "see a slow request, and how do you know a change did not break anyone. Each module here answers " +
            "exactly one of them with a well-known open-source tool, wired into the same running app, with " +
            "the commands to try it and real output to compare against.",
          "The point is to show the pieces working together, not each one in isolation - and, because " +
            "everything is open source and runs with Docker, to let you run it, change it and break it " +
            "yourself. It is a demonstration-grade reference (demo passwords, a single node of everything), " +
            "not a production template; each scenario says where the demo shortcuts are.",
        ],
      },
      {
        heading: "The concerns, and the tool that answers each",
        table: {
          headers: ["Concern", "Tool", "What it does here", "Scenario"],
          rows: [
            ["The application", "apps: Next.js, FastAPI, MySQL", "A small event-sourced accounting ledger with REST, GraphQL and MCP interfaces - the thing everything else is wrapped around.", "Getting Started"],
            ["Front door and routing", "Kong", "Routes /api/* to the backend, and can be repointed at a contract mock without touching the frontend.", "1"],
            ["Absorbing bursts", "Kafka + kafka-bridge", "Takes writes into a topic and drains them into the backend at its own pace, so an overload becomes a queue instead of errors.", "2"],
            ["Seeing what is happening", "OpenTelemetry, Prometheus, Alertmanager, Tempo, Loki, Grafana", "Traces, metrics and logs from the backend and the gateways, alerts that reach a notification, and jumps from a log line to its trace.", "3"],
            ["Who is calling", "Keycloak", "A real identity provider: the user logs in there, and the backend verifies the token it issues.", "4"],
            ["Where the secrets live", "Vault", "Issues the backend a short-lived MySQL user on demand, so its config holds no database password.", "5"],
            ["Access for AI agents", "agentgateway", "Exposes the backend as MCP tools, built from the OpenAPI contract rather than from code.", "6"],
            ["Contracts and mocks", "Specmatic, Microcks", "One OpenAPI file checked against the real backend, and turned into two independent mock servers.", "1 and Testing"],
            ["Checking it works", "pytest, Vitest, Playwright, Locust, ZAP", "Unit, end-to-end, load and security tests, each with an HTML report.", "Testing"],
          ],
        },
      },
      {
        heading: "Kong and agentgateway: the front doors",
        body: [
          "Kong is the gateway for the REST API. It sits in front of the backend, so cross-cutting " +
            "behaviour (routing, rate limiting, and in Scenario 1 swapping the target for a contract mock) " +
            "lives at the edge rather than in application code. agentgateway is the same idea for AI " +
            "agents: it turns the OpenAPI contract into MCP tools, so an agent calls the backend through a " +
            "gateway too - and its create-account tool is the same POST /accounts a browser or the Kafka " +
            "bridge uses. Both export traces, so a request through either shows up in Tempo as one trace with " +
            "the backend's spans under it (Scenario 3).",
        ],
      },
      {
        heading: "Kafka: turning a burst into a queue",
        body: [
          "A write path that talks straight to the database fails under a burst: connections run out and " +
            "requests time out. Kafka puts a durable queue in front - producers append events to a topic, " +
            "and a small bridge drains them into POST /accounts at a steady pace, retrying while the backend " +
            "is unavailable and committing an event only after it succeeded. Scenario 2 measures the " +
            "difference under the same load. Kafka comes up again in the other scenarios: the bridge's requests are ordinary " +
            "traffic in the traces and dashboards (Scenario 3), it logs in to the backend like any client " +
            "(Scenario 4), and its writes reach MySQL through the credential Vault issued (Scenario 5).",
        ],
      },
      {
        heading: "Keycloak: someone else checks the password",
        body: [
          "The app should not be the thing that stores passwords and decides who someone is. With " +
            "Keycloak the frontend sends the user to the identity provider, gets back a signed token, and " +
            "the backend verifies the signature against Keycloak's public keys - it never sees the password " +
            "and does not call Keycloak per request. The flow below is what Scenario 4 sets up.",
        ],
        sequence: sequenceOf(scenarioKeycloak, "en"),
      },
      {
        heading: "Vault: no password in the config",
        body: [
          "The backend needs a database credential, and a password in a config file or an environment " +
            "variable is the classic leak. With Vault the backend holds only a token that may ask for a " +
            "credential; Vault creates a fresh, limited MySQL user with a lease and drops it when the " +
            "lease ends. The flow below is what Scenario 5 sets up.",
        ],
        sequence: sequenceOf(scenarioVault, "en"),
      },
      {
        heading: "Observability: seeing it work, and fail",
        body: [
          "The backend and both gateways send traces, metrics and logs over OpenTelemetry to a Collector, " +
            "which fans them out to Tempo, Prometheus and Loki, all read in Grafana. An alert rule in " +
            "Prometheus becomes a notification through Alertmanager, and a log line links to the trace of " +
            "the request that produced it. Scenario 3 runs an overload and watches it happen live.",
        ],
      },
      {
        heading: "Specmatic and Microcks: the contract is the source of truth",
        body: [
          "openapi.yaml is written by hand, so it can genuinely disagree with the code - which makes " +
            "checking it worthwhile. Specmatic verifies the real backend against it and serves a stub so the " +
            "frontend can be tested without a backend; Microcks turns the same file into a second, " +
            "independent mock; Kong can route the frontend to either. The Testing page has the reports.",
        ],
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
            "page). Scenarios 4 and 5 replace pieces of this with real infrastructure: Keycloak for the " +
            "identity check itself, Vault for the credential the backend's own database connection uses.",
        ],
      },
      {
        heading: "Where to go next",
        body: [
          "Getting Started covers the basic make apps:up / down / restart / reset commands. The six " +
            "scenarios each take one concern from the table above and wire its tool into this same running " +
            "apps stack, with the exact commands and what to expect at every step. The Testing page, last " +
            "in the sidebar, shows how the whole thing is checked, with sample reports.",
        ],
      },
    ],
  },
  ja: {
    title: "概要",
    description:
      "nb-quickstartsはマイクロサービスのリファレンスアーキテクチャで、自分で動かせるオープンソースの部品だけで" +
      "作られています: クローンしてmakeを実行すれば、下のすべての部品が手元のマシンで立ち上がります。" +
      "中心のアプリケーションは会計台帳という意図的に小さなものにして、見てほしいのはその周りのすべてにしています — " +
      "トラフィックをどうルーティングするか、負荷をどう吸収するか、誰を通すか、シークレットをどこに置くか、" +
      "何が起きているかをどう見るか、そしてそのすべてが今も動くことをどう確かめるか。図は、それらが共通の" +
      "apps-network上でどう繋がっているかの鳥瞰図です。",
    sections: [
      {
        heading: "何のためのものか",
        body: [
          "マイクロサービスのシステムを作るときは、いつも同じ少数の問いに答えることになり、その答えはどれも" +
            "別のソフトウェアです: リクエストはどう入るのか、バーストにどう耐えるのか、インスタンス同士はどう" +
            "見つけ合うのか、誰が呼んでいるとどう分かるのか、パスワードはどこに置くのか、遅いリクエストを" +
            "どう見つけるのか、変更で誰も壊れていないとどう確かめるのか。ここの各モジュールは、そのうちのちょうど" +
            "1つに、よく知られたオープンソースのツールで答え、同じ稼働中のアプリに組み込み、試すコマンドと" +
            "比較できる実際の出力を付けています。",
          "目的は、個々の部品を単独で見せることではなく、部品が一緒に働く姿を見せることです — そしてすべてが" +
            "オープンソースでDockerで動くので、自分で動かし、変え、壊せます。デモ用のリファレンスであり" +
            "(デモ用のパスワード、すべて単一ノード)、本番用のテンプレートではありません。デモ用の近道がどこにあるかは、" +
            "各シナリオに書いています。",
        ],
      },
      {
        heading: "関心事と、それぞれに答えるツール",
        table: {
          headers: ["関心事", "ツール", "ここでの役割", "シナリオ"],
          rows: [
            ["アプリケーション", "apps: Next.js・FastAPI・MySQL", "REST・GraphQL・MCPを備えた、小さなイベントソーシング型の会計台帳 — 他のすべてが周りを包む対象。", "Getting Started"],
            ["入口とルーティング", "Kong", "/api/*をbackendへルーティングし、frontendに手を入れずに契約モックへ向け直せる。", "1"],
            ["バーストの吸収", "Kafka + kafka-bridge", "書き込みをトピックで受け、backendのペースで流し込む。過負荷はエラーではなくキューになる。", "2"],
            ["何が起きているかを見る", "OpenTelemetry・Prometheus・Alertmanager・Tempo・Loki・Grafana", "backendとゲートウェイのトレース・メトリクス・ログ、通知に届くアラート、ログ行からそのトレースへのジャンプ。", "3"],
            ["誰が呼んでいるか", "Keycloak", "本物のIDプロバイダー: ユーザーはそこでログインし、backendは発行されたトークンを検証する。", "4"],
            ["シークレットの置き場所", "Vault", "backendに、短命なMySQLユーザーをその場で発行するので、設定にデータベースのパスワードが残らない。", "5"],
            ["AIエージェントからのアクセス", "agentgateway", "backendをMCPツールとして公開する。コードではなくOpenAPI契約から作る。", "6"],
            ["契約とモック", "Specmatic・Microcks", "1つのOpenAPIファイルを、実際のbackendに対して検証し、独立した2つのモックサーバーにする。", "1とテスト"],
            ["動くことの確認", "pytest・Vitest・Playwright・Locust・ZAP", "ユニット・E2E・負荷・セキュリティのテスト。それぞれHTMLレポート付き。", "テスト"],
          ],
        },
      },
      {
        heading: "Kong と agentgateway: 入口",
        body: [
          "KongはREST APIのゲートウェイです。backendの前段にあるので、横断的な振る舞い(ルーティング、レート制限、" +
            "そしてシナリオ1では向き先を契約モックに切り替えること)を、アプリのコードではなく入口に置けます。" +
            "agentgatewayはAIエージェント向けの同じ発想です: OpenAPI契約をMCPツールに変えるので、エージェントも" +
            "ゲートウェイ経由でbackendを呼びます — そのアカウント作成ツールは、ブラウザやKafkaブリッジが使うのと" +
            "同じPOST /accountsです。どちらもトレースを送るので、どちらを通ったリクエストも、backendのスパンが" +
            "下に連なる1本のトレースとしてTempoに現れます(シナリオ3)。",
        ],
      },
      {
        heading: "Kafka: バーストをキューに変える",
        body: [
          "データベースに直接書き込む経路は、バーストで壊れます: 接続が尽き、リクエストがタイムアウトします。" +
            "Kafkaは手前に永続的なキューを置きます — プロデューサーはトピックにイベントを追記し、小さなブリッジが" +
            "一定のペースでPOST /accountsへ流し込み、backendが使えない間は再試行し、成功したあとにだけイベントを" +
            "コミットします。シナリオ2は、同じ負荷での違いを測ります。Kafkaは他のシナリオにも顔を出します: " +
            "ブリッジのリクエストはトレースやダッシュボードでは普通のトラフィックであり(シナリオ3)、ブリッジも他のクライアントと" +
            "同じようにbackendへログインし(シナリオ4)、その書き込みはVaultが発行した認証情報でMySQLに届きます(シナリオ5)。",
        ],
      },
      {
        heading: "Keycloak: パスワードの確認を他に任せる",
        body: [
          "アプリ自身がパスワードを保存し、その人が誰かを決める役であるべきではありません。Keycloakを使うと、" +
            "frontendはユーザーをIDプロバイダーへ送り、署名付きのトークンを受け取り、backendはKeycloakの公開鍵で" +
            "その署名を検証します — パスワードは見ず、リクエストごとにKeycloakを呼ぶこともありません。" +
            "下の流れが、シナリオ4で構築するものです。",
        ],
        sequence: sequenceOf(scenarioKeycloak, "ja"),
      },
      {
        heading: "Vault: 設定にパスワードを置かない",
        body: [
          "backendにはデータベースの認証情報が必要ですが、設定ファイルや環境変数のパスワードは、典型的な漏洩の" +
            "原因です。Vaultを使うと、backendが持つのは認証情報を要求できるトークンだけで、Vaultがリース付きの" +
            "限定されたMySQLユーザーをその場で作り、リースが終わると削除します。下の流れが、シナリオ5で" +
            "構築するものです。",
        ],
        sequence: sequenceOf(scenarioVault, "ja"),
      },
      {
        heading: "オブザーバビリティ: 動くところも、壊れるところも見る",
        body: [
          "backendと両方のゲートウェイは、OpenTelemetryでトレース・メトリクス・ログをCollectorへ送り、Collectorが" +
            "Tempo・Prometheus・Lokiへ振り分け、すべてをGrafanaで見ます。Prometheusのアラートルールは" +
            "Alertmanager経由で通知になり、ログ行はそれを生んだリクエストのトレースへリンクします。" +
            "シナリオ3では、過負荷を起こして、その様子をライブで観察します。",
        ],
      },
      {
        heading: "Specmatic と Microcks: 契約が唯一の正解",
        body: [
          "openapi.yamlは手で書いているので、コードと本当に食い違い得ます — だから確認する意味があります。" +
            "Specmaticはそれに対して実際のbackendを検証し、backendなしでfrontendをテストできるようスタブを提供します。" +
            "Microcksは同じファイルから、もう1つの独立したモックを作り、Kongはfrontendをどちらへも向けられます。" +
            "レポートは「テスト」ページにあります。",
        ],
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
            "bearerトークンを返します。シナリオ4と5は、この一部を本物のインフラに置き換えます: 本人確認そのものを" +
            "Keycloakに、backend自身のデータベース接続の認証情報をVaultに。",
        ],
      },
      {
        heading: "次に読むもの",
        body: [
          "Getting Startedでは、基本のmake apps:up / down / restart / resetコマンドを扱います。6つのシナリオは、" +
            "それぞれ上の表の関心事を1つずつ取り上げ、そのツールをこの同じ稼働中のappsスタックに組み込みます — " +
            "実際のコマンドと、各ステップで何が起きるかを添えて。サイドバーの最後にある「テスト」ページでは、" +
            "全体をどう確かめるかを、サンプルレポート付きで見られます。",
        ],
      },
    ],
  },
};
