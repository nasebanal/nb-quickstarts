import type { LocalizedDocsPage } from "./types";

export const scenarioKong: LocalizedDocsPage = {
  en: {
    title: "Scenario 1: Switch to Kong",
    description:
      "Kong's apps_backend gateway service proxies http://localhost:8000/api/* to the real backend's " +
      "own root (strip_path: true, so /api/accounts reaches backend:8080/accounts). This scenario " +
      "routes the frontend through it, then repoints that same service at a contract mock instead of " +
      "the real backend - with no frontend code change either time.",
    sections: [
      {
        heading: "1. Start Kong and route the frontend through it",
        body: [
          "Kong Manager needs DB mode (KONG_DB=postgres) - the default DB-less mode's Admin API is " +
            "read-only, so it can display apps_backend but can't save an edit to it. " +
            "NEXT_PUBLIC_API_BASE is baked into the frontend's bundle at server start (Next.js dev " +
            "mode), so it needs apps:restart, not just a browser reload, to pick up the change.",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make kong:up KONG_DB=postgres\n" +
              "# .env: NEXT_PUBLIC_API_BASE=http://localhost:8000/api\n" +
              "make apps:restart   # frontend needs recreating to pick up the new value",
          },
        ],
      },
      {
        heading: "2. Swap the target to a contract mock",
        body: [
          "apps_backend's Host/Port/Path, edited right from Kong Manager, is the seam: repoint it at a " +
            "mock built from the same contract instead of the real backend, and neither the frontend " +
            "nor anything hitting /api/* needs to change at all. Host/Port here are Docker Compose " +
            "service names on apps-network, not localhost - only resolvable from inside that network, " +
            "which is why Kong itself joins it.",
        ],
        table: {
          headers: ["Target", "Host", "Port", "Path"],
          rows: [
            ["Real backend (default)", "backend", "8080", "(empty)"],
            ["Specmatic's stub", "specmatic-stub", "9091", "(empty)"],
          ],
        },
        images: [
          {
            src: "/docs/screenshots/kong-manager-edit.png",
            alt: "Kong Manager's Edit Gateway Service form for apps_backend, showing Host=backend, Port=8080, Path empty",
            caption:
              "Kong Manager - Gateway Services > apps_backend > Edit. This is the exact seam the table above edits.",
          },
        ],
      },
      {
        heading: "Steps in Kong Manager",
        bullets: [
          "make kong:open (or open http://localhost:8002) → Gateway Services → apps_backend → Edit.",
          "Set Host / Port / Path to one of the targets above, then Save.",
          "curl http://localhost:8000/api/accounts/balances (or reload the frontend, if it's routed " +
            "through Kong) to confirm - allow a couple of seconds for the change to propagate.",
          "To go back to the real backend: edit apps_backend again, Host backend / Port 8080 / Path " +
            "empty, Save.",
        ],
      },
      {
        heading: "Verify it worked",
        body: [
          "The real backend and Specmatic's stub return structurally similar but genuinely different " +
            "data - the stub's is schema-valid but randomly generated, never the ledger's real values. " +
            "That difference through the exact same curl, before and after the edit, is the proof the " +
            "swap actually took effect (via the Admin API here - the same edit Kong Manager's Save " +
            "button makes):",
        ],
        terminal: {
          lines: [
            {
              text: "$ curl -s http://localhost:8000/api/accounts/balances",
              tone: "muted",
            },
            {
              text: '[{"name":"Cash","balance":120000,"eventCount":3},{"name":"Kafka Load Account","balance":744370,...',
            },
            { text: "" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/services/apps_backend -d host=specmatic-stub -d port=9091",
              tone: "muted",
            },
            { text: "host: specmatic-stub port: 9091", tone: "info" },
            { text: "" },
            {
              text: "$ curl -s http://localhost:8000/api/accounts/balances",
              tone: "muted",
            },
            {
              text: '[{"name": "IYBOK", "balance": 133, "eventCount": 240}]',
              tone: "success",
            },
            {
              text: "  ^ Specmatic's stub - a schema-valid but randomly generated response, not the real ledger",
            },
          ],
        },
      },
      {
        heading: "Prerequisites for each mock target",
        code: [
          {
            label:
              "Specmatic's stub (needs apps:up first, to seed its schema+examples):",
            code: "make specmatic:stub-up",
          },
          {
            label:
              "Microcks (needs apps:up first, to fetch the live OpenAPI schema):",
            code: "make microcks:up\nmake microcks:import-openapi",
          },
        ],
        note:
          "Microcks needs the full /rest/<service>/<version> prefix baked into apps_backend's own Path " +
          "(e.g. /rest/nb-quickstarts+apps+backend/0.1.0), since Kong's strip_path only removes /api - " +
          "whatever's left of the incoming path gets appended onto the service's own Path. Specmatic's " +
          "stub needs no Path at all, since its mock paths already match the real API directly. " +
          "Microcks can't mock POST /accounts (it needs a real bearer token, which an OpenAPI example " +
          "has no way to carry) - but every read endpoint works fine.",
      },
      {
        heading: "Cleanup",
        code: [{ code: "make kong:down" }],
      },
    ],
  },
  ja: {
    title: "シナリオ1: Kong経由への切り替え",
    description:
      "Kongのapps_backendというGateway Serviceは、http://localhost:8000/api/*を実際のbackendのルートへ" +
      "そのままプロキシします(strip_path: trueなので、/api/accountsはbackend:8080/accountsに届きます)。" +
      "このシナリオでは、まずfrontendの接続先をこのKong経由に切り替え、そのうえで同じServiceの向き先を" +
      "実backendから契約モックへ差し替えます — どちらの場合もfrontend側のコード変更は一切不要です。",
    sections: [
      {
        heading: "1. Kongを起動し、frontendをKong経由にする",
        body: [
          "Kong ManagerはDBモード(KONG_DB=postgres)が必要です — デフォルトのDB-lessモードではAdmin " +
            "APIが読み取り専用になり、apps_backendの表示はできても編集内容を保存できません。" +
            "NEXT_PUBLIC_API_BASEはサーバー起動時(Next.jsの開発モード)にfrontendのバンドルへ焼き込まれる" +
            "ため、ブラウザのリロードではなくapps:restartが必要です。",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make kong:up KONG_DB=postgres\n" +
              "# .env: NEXT_PUBLIC_API_BASE=http://localhost:8000/api\n" +
              "make apps:restart   # frontendを再作成して新しい値を反映",
          },
        ],
      },
      {
        heading: "2. 向き先を契約モックへ差し替える",
        body: [
          "Kong Managerから直接編集できるapps_backendのHost/Port/Pathが差し替えの接点です — 実backendの" +
            "代わりに同じ契約由来のモックを指すよう変更するだけで、frontend側も/api/*を叩く側も一切変更" +
            "不要です。ここでのHost/PortはDocker Composeのサービス名であり、apps-network内からしか解決" +
            "できません(localhostではない)。Kong自身がこのネットワークに参加しているのはこのためです。",
        ],
        table: {
          headers: ["向き先", "Host", "Port", "Path"],
          rows: [
            ["実backend(デフォルト)", "backend", "8080", "(空)"],
            ["Specmaticのスタブ", "specmatic-stub", "9091", "(空)"],
          ],
        },
        images: [
          {
            src: "/docs/screenshots/kong-manager-edit.png",
            alt: "Kong Managerのapps_backend編集フォーム。Host=backend、Port=8080、Pathは空",
            caption:
              "Kong Manager — Gateway Services > apps_backend > Edit。上の表が編集するのは、まさにこの画面。",
          },
        ],
      },
      {
        heading: "Kong Managerでの手順",
        bullets: [
          "make kong:open(またはhttp://localhost:8002を開く)→ Gateway Services → apps_backend → Edit。",
          "Host / Port / Pathを上の表いずれかに設定してSave。",
          "curl http://localhost:8000/api/accounts/balances(またはKong経由のfrontendをリロード)で確認 " +
            "— 反映まで数秒かかることがあります。",
          "実backendに戻すには: apps_backendを再度編集し、Host backend / Port 8080 / Pathは空でSave。",
        ],
      },
      {
        heading: "反映されたことを確認する",
        body: [
          "実backendとSpecmaticのスタブは、構造は似ていても中身がまったく異なるデータを返します — " +
            "スタブの応答はスキーマ的には正しいものの、ランダムに生成された値で、台帳の実データでは" +
            "決してありません。同じcurlを編集の前後で叩いたときのこの違いこそが、切り替えが実際に" +
            "反映された証拠です(ここではAdmin API経由 — Kong ManagerのSaveボタンが行うのと同じ編集です):",
        ],
        terminal: {
          lines: [
            {
              text: "$ curl -s http://localhost:8000/api/accounts/balances",
              tone: "muted",
            },
            {
              text: '[{"name":"Cash","balance":120000,"eventCount":3},{"name":"Kafka Load Account","balance":744370,...',
            },
            { text: "" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/services/apps_backend -d host=specmatic-stub -d port=9091",
              tone: "muted",
            },
            { text: "host: specmatic-stub port: 9091", tone: "info" },
            { text: "" },
            {
              text: "$ curl -s http://localhost:8000/api/accounts/balances",
              tone: "muted",
            },
            {
              text: '[{"name": "IYBOK", "balance": 133, "eventCount": 240}]',
              tone: "success",
            },
            {
              text: "  ^ Specmaticのスタブ — スキーマ的には妥当だがランダム生成された値で、実際の台帳ではない",
            },
          ],
        },
      },
      {
        heading: "各モックの前提条件",
        code: [
          {
            label:
              "Specmaticのスタブ(先にapps:upが必要 — スキーマ/exampleを取り込むため):",
            code: "make specmatic:stub-up",
          },
          {
            label:
              "Microcks(先にapps:upが必要 — 稼働中のOpenAPIスキーマを取得するため):",
            code: "make microcks:up\nmake microcks:import-openapi",
          },
        ],
        note:
          "Microcksの場合、apps_backend自身のPathに/rest/<service>/<version>のプレフィックスをまるごと" +
          "埋め込む必要があります(例: /rest/nb-quickstarts+apps+backend/0.1.0)。Kongのstrip_pathは/api" +
          "しか取り除かないため、残りのパスがそのままServiceのPathに追加されるからです。Specmaticのスタブ" +
          "はモック側のパスが実APIとそのまま一致するため、Pathの指定は不要です。MicrocksはPOST /accounts" +
          "をモックできません(実際のbearerトークンが必要で、OpenAPIのexampleにはそれを運ぶ手段がないため)" +
          "が、読み取り系のエンドポイントは問題なく動きます。",
      },
      {
        heading: "片付け",
        code: [{ code: "make kong:down" }],
      },
    ],
  },
};
