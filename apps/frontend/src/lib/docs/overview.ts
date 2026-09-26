import type { LocalizedDocsPage } from "./types";

// The Overview has three parts, in this order: the purpose of NASEBANAL Quickstarts, its structure
// (the paragraphs read the diagrams, which app/docs/page.tsx renders into the "architecture" slot),
// and the functional-verification scenarios, one short description each. Scenario 1 verifies the
// demo app with the test tools; scenarios 2-7 each switch on one of the dashed integrations. Headings
// and links follow the scenario pages' own titles and the sidebar order (overview.test.ts checks it).
// Register: neutral and factual - no second-person address or chatty phrasing.
export const overview: LocalizedDocsPage = {
  en: {
    title: "Overview",
    sections: [
      {
        heading: "Purpose",
        body: [
          "NASEBANAL Quickstarts is a hands-on verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com/en/stack) - the proven " +
            "open-source technologies NASEBANAL builds on. Each module takes one of them, or a tool used to " +
            "verify it, and wires it into the same running app, so that each can be run, modified and verified on " +
            "your own machine with the same [make <module>:up](/docs/getting-started).",
          "It is a demonstration-grade reference (demo passwords, a single node of everything), not a " +
            "production template; each scenario notes where the demo shortcuts are.",
        ],
      },
      {
        heading: "Structure",
        body: [
          "In the middle is the [apps stack](/docs/getting-started) on the shared apps-network: a Next.js frontend, a FastAPI backend " +
            "(REST, GraphQL and MCP) and MySQL, driven by a browser and, for load, by Locust. Everything else is a " +
            "module around it, each with its own directory and its own [make <module>:up](/docs/getting-started).",
          "Around it sit the gateway and contract mocks ([Kong](/docs/scenario-kong), with [Specmatic](/docs/scenario-kong)), the async path " +
            "([Kafka and kafka-bridge](/docs/scenario-kafka)), identity and secrets ([Keycloak](/docs/scenario-keycloak) and [Vault](/docs/scenario-vault)), [observability](/docs/scenario-observability) (an " +
            "OpenTelemetry Collector feeding Tempo, Prometheus and Loki, read in Grafana, with Alertmanager " +
            "sending the alerts) and the agent gateway ([agentgateway](/docs/scenario-agentgateway)).",
          "In the diagrams, arrows point from the caller to what it calls, and dashed lines are integrations " +
            "that are off by default - each one is switched on in its own scenario. The second diagram is the " +
            "[MCP access path](/docs/scenario-agentgateway): an MCP client reaches the backend through its built-in /mcp or, optionally, " +
            "through agentgateway."
        ],
        slot: "architecture",
      },
      {
        heading: "Functional verification scenarios",
        body: [
          "Scenario 1 verifies the demo app with the test tools. Scenarios 2 to 7 each switch on one of the dashed integrations above and check that it works. The order follows the sidebar.",
        ],
        subsections: [
          {
            heading: "Scenario 1: Verify the demo app",
            href: "/docs/scenario-testing",
            body: [
              "Verifies the operation of the demo app with the repository's test tools: pytest and Vitest (unit), Playwright (end-to-end), Specmatic (contract), Locust (load) and OWASP ZAP (security). For each tool, the scenario describes how to check the results and how the results are evaluated.",
            ],
          },
          {
            heading: "Scenario 2: Switch to Kong",
            href: "/docs/scenario-kong",
            body: [
              "Routes the frontend through Kong: the gateway proxies /api/* on port 8000 to the real backend. The same gateway service is then repointed at a contract mock (Specmatic's mock) instead of the backend, with no frontend code change.",
            ],
          },
          {
            heading: "Scenario 3: Switch to Kafka",
            href: "/docs/scenario-kafka",
            body: [
              "Places Kafka in front of the write path: kafka-bridge reads events from a topic and forwards each one to the backend through POST /accounts, the same write every other client uses. The same Locust load is sent down two paths - direct REST, which errors under the burst, and through Kafka - and the measured results are compared.",
            ],
          },
          {
            heading: "Scenario 4: Observability",
            href: "/docs/scenario-observability",
            body: [
              "Enables the backend's OpenTelemetry export (traces, metrics and logs; off by default) and runs an HTTP overload while it is observed live in Grafana. The same run triggers alert rules that Alertmanager routes as notifications, a log line in Loki links to the trace of the request behind it, and Kong and agentgateway export telemetry as well.",
            ],
          },
          {
            heading: "Scenario 5: Use Keycloak",
            href: "/docs/scenario-keycloak",
            body: [
              "Replaces the mock login with a real one: the login page gains a Keycloak option (with sign-up), the user authenticates at Keycloak, and the backend accepts the token Keycloak issued on the same POST /accounts route. The scenario then confirms that the backend performs the check.",
            ],
          },
          {
            heading: "Scenario 6: Use Vault",
            href: "/docs/scenario-vault",
            body: [
              "Removes the database password from the backend's configuration: the backend requests a credential from Vault at startup, and Vault creates a short-lived MySQL user for it on demand. The scenario shows the backend failing without Vault and working with it, then inspects the users Vault created.",
            ],
          },
          {
            heading: "Scenario 7: MCP access via agentgateway",
            href: "/docs/scenario-agentgateway",
            body: [
              "Provides a second route to the backend as MCP tools. Besides the backend's own /mcp, agentgateway builds MCP tools solely from the OpenAPI contract (openapi.yaml). A tool is called through the gateway and from a real MCP client, and the gateway's dashboard is reviewed.",
            ],
          },
        ],
      },
    ],
  },
  ja: {
    title: "概要",
    sections: [
      {
        heading: "目的",
        body: [
          "NASEBANAL Quickstartsは、[NASEBANAL Stack](https://www.nasebanal.com/ja/stack) — NASEBANALが土台にしている実績ある" +
            "オープンソース技術 — を手元で検証するためのツールキットです。各モジュールはそのうちの1つ" +
            "(またはその検証に使うツール)を取り上げ、同じ稼働中のアプリに組み込むため、共通の " +
            "[make <モジュール名>:up](/docs/getting-started) で、自分のマシン上で動作の確認、構成の変更、検証を行えます。",
          "デモ用のリファレンスであり(デモ用のパスワード、すべて単一ノード)、本番用のテンプレートではありません。" +
            "デモ用の近道がどこにあるかは、各シナリオに記載しています。",
        ],
      },
      {
        heading: "構成",
        body: [
          "中心にあるのは、共通のapps-network上の[appsスタック](/docs/getting-started)です: Next.jsのfrontend、FastAPIのbackend" +
            "(REST・GraphQL・MCP)、MySQL。ブラウザと、負荷をかけるLocustがこれを呼びます。それ以外はすべて周りの" +
            "モジュールで、モジュールごとに専用のディレクトリと [make <モジュール名>:up](/docs/getting-started) があります。",
          "周りにあるのは、ゲートウェイとモック([Kong](/docs/scenario-kong)、[Specmatic](/docs/scenario-kong))、非同期の経路([Kafkaとkafka-bridge](/docs/scenario-kafka))、" +
            "認証とシークレット([Keycloak](/docs/scenario-keycloak)と[Vault](/docs/scenario-vault))、[オブザーバビリティ](/docs/scenario-observability)(OpenTelemetry Collectorが" +
            "Tempo・Prometheus・Lokiへ振り分け、Grafanaで見て、Alertmanagerがアラートを通知する)、" +
            "そしてエージェント向けのゲートウェイ([agentgateway](/docs/scenario-agentgateway))です。",
          "図では、矢印は呼び出し元から呼び出し先へ向かい、破線は既定でオフの連携です — それぞれ、自分の" +
            "シナリオでオンにします。2枚目の図は[MCPのアクセス経路](/docs/scenario-agentgateway)です: MCPクライアントは、backend内蔵の/mcp、" +
            "またはオプションでagentgatewayを経由してbackendに届きます。"
        ],
        slot: "architecture",
      },
      {
        heading: "機能確認シナリオ",
        body: [
          "シナリオ1は、テストツールでデモアプリの動作を検証します。シナリオ2〜7は、それぞれ上の図の破線の連携を1つずつオンにして、その機能を確認します。順番はサイドバーのとおりです。",
        ],
        subsections: [
          {
            heading: "シナリオ1: デモアプリの動作検証",
            href: "/docs/scenario-testing",
            body: [
              "本リポジトリのテストツールで、デモアプリの動作を検証します。pytestとVitest(ユニット)、Playwright(E2E)、Specmatic(コントラクト)、Locust(負荷)、OWASP ZAP(セキュリティ)について、ツールごとに、結果の確認方法と結果の評価を記載します。",
            ],
          },
          {
            heading: "シナリオ2: Kong経由への切り替え",
            href: "/docs/scenario-kong",
            body: [
              "frontendをKong経由にします。ゲートウェイがポート8000の/api/*を実際のbackendへプロキシします。続いて、同じゲートウェイのサービスの向き先を、backendではなく、Specファイルから作ったモック(Specmaticのモック)に切り替えます。frontendのコードは変更しません。",
            ],
          },
          {
            heading: "シナリオ3: Kafka経由への切り替え",
            href: "/docs/scenario-kafka",
            body: [
              "書き込み経路の手前にKafkaを置きます。kafka-bridgeがトピックからイベントを読み、1件ずつPOST /accountsでbackendへ転送します(他のすべてのクライアントと同じ書き込みです)。同じLocustの負荷を、バーストでエラーになるREST直接の経路と、Kafka経由の経路の2つに流し、測定結果を比較します。",
            ],
          },
          {
            heading: "シナリオ4: オブザーバビリティ",
            href: "/docs/scenario-observability",
            body: [
              "backendのOpenTelemetryエクスポート(トレース・メトリクス・ログ。既定ではオフ)を有効にし、HTTPの過負荷を実行して、その様子をGrafanaでライブに観察します。同じ実行でアラートルールが発火してAlertmanagerが通知に振り分け、Lokiのログ行からそのリクエストのトレースへ遷移でき、Kongとagentgatewayもテレメトリーを送信します。",
            ],
          },
          {
            heading: "シナリオ5: Keycloakの利用",
            href: "/docs/scenario-keycloak",
            body: [
              "モックのログインを本物に置き換えます。ログイン画面にKeycloakの選択肢(サインアップ付き)が加わり、Keycloakで認証すると、backendは同じPOST /accountsでKeycloakが発行したトークンを受け付けます。そのうえで、backendが実際にトークンを検証していることを確認します。",
            ],
          },
          {
            heading: "シナリオ6: Vaultの利用",
            href: "/docs/scenario-vault",
            body: [
              "backendの設定からデータベースのパスワードを取り除きます。backendは起動時にVaultへ認証情報を要求し、Vaultがその場で短命なMySQLユーザーを作成します。Vaultなしではbackendが失敗し、Vaultありでは動作することを確認し、最後にVaultが作成したユーザーを確認します。",
            ],
          },
          {
            heading: "シナリオ7: agentgateway経由でのMCPアクセス",
            href: "/docs/scenario-agentgateway",
            body: [
              "backendへMCPツールとして到達する、もう1つの経路です。backend自身の/mcpとは別に、agentgatewayはMCPツールをOpenAPIのSpecファイル(openapi.yaml)だけから作成します。ゲートウェイ経由と実際のMCPクライアントからツールを呼び出し、ゲートウェイのダッシュボードを確認します。",
            ],
          },
        ],
      },
    ],
  },
};
