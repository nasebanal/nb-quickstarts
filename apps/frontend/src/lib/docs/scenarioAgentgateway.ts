import type { LocalizedDocsPage } from "./types";

export const scenarioAgentgateway: LocalizedDocsPage = {
  en: {
    title: "Scenario 7: MCP access via agentgateway",
    description:
      "The backend already mounts its own MCP server natively at /mcp (via fastapi-mcp, auto-derived " +
      "from its REST routes). agentgateway is a different way to get there: instead of backend-side " +
      "MCP code, it builds MCP tools entirely from the OpenAPI contract (openapi.yaml) - the same " +
      "contract Specmatic/Microcks/Kong already build against, fetched live from /openapi.json.",
    sections: [
      {
        heading: "Why agentgateway",
        body: [
          "An agent's create-account tool call is the same POST /accounts that the Kafka bridge (Scenario 3) makes for each event: another way in to the same write path.",
        ],
        bullets: [
          "Turns an existing OpenAPI contract into MCP tools with configuration only - no MCP server code to write or maintain in the backend.",
          "One gateway in front of MCP (and A2A) traffic is a single place for access control, observability and routing of what AI agents can call.",
          "Because tools come from the same contract as everything else, they stay in sync with the API automatically.",
        ],
      },
      {
        heading: "1. Start it and verify what it actually serves",
        code: [
          {
            code: "make apps:up\nmake agentgateway:up\nmake agentgateway:tools",
          },
        ],
        body: [
          "agentgateway:tools does the MCP handshake by hand and lists what's being served - the real " +
            "verification that it's actually reading openapi.yaml, not a hardcoded example: six tools, " +
            "one per operation, named and described straight from the contract.",
        ],
        terminal: {
          lines: [
            { text: "$ make agentgateway:tools", tone: "muted" },
            {
              text: "Calling MCP initialize + tools/list against agentgateway...",
            },
            { text: "  health_health_get - Health", tone: "success" },
            { text: "  login_auth_login_post - Login", tone: "success" },
            {
              text: "  list_accounts_accounts_get - List Accounts",
              tone: "success",
            },
            {
              text: "  create_account_accounts_post - Create Account",
              tone: "success",
            },
            {
              text: "  list_balances_accounts_balances_get - List Balances",
              tone: "success",
            },
            {
              text: "  get_account_accounts__account_id__get - Get Account",
              tone: "success",
            },
          ],
        },
      },
      {
        heading: "2. Call a tool through the gateway",
        body: [
          "Calling list_balances_accounts_balances_get through the gateway returns the same live data " +
            "GET /accounts/balances itself does - it's a real proxy to the running backend, not a " +
            "static description of it.",
        ],
        note:
          "create_account_accounts_post needs a real bearer token, same as POST /accounts itself does " +
          "everywhere else - call login_auth_login_post first and pass its token back as an " +
          "Authorization header, or the tool call 401s the same way an unauthenticated curl would.",
      },
      {
        heading: "3. Use it from a real MCP client",
        body: [
          "Point an MCP client (Claude Desktop, mcp-inspector, ...) at http://localhost:8010/mcp " +
            "(Streamable HTTP) to use it interactively, the same way you'd connect one to the backend's " +
            "own native /mcp mount at http://localhost:8080/mcp - two independent paths to the same " +
            "six operations.",
        ],
      },
      {
        heading: "The dashboard",
        code: [
          {
            code: "make agentgateway:open   # http://localhost:15000 -> redirects to /ui",
          },
        ],
        body: [
          "agentgateway ships a real dashboard UI (a React SPA built into the image by default), served " +
            "off its admin port - separate from the MCP port above. Routes -> Route 1 shows exactly the " +
            "backend this apps-demo route is actually wired to - the same route agentgateway:tools just " +
            "proved works.",
        ],
        images: [
          {
            src: "/docs/screenshots/agentgateway-routes.png",
            alt: "agentgateway dashboard Traffic Routes page showing Route 1 (HTTP, bind 3000, listener Listener 1, match /) wired to the apps backend",
            caption:
              "agentgateway's own dashboard - Traffic > Routes, showing the real route MCP calls go through.",
          },
        ],
      },
      {
        heading: "One gotcha to know about",
        body: [
          "agentgateway fetches the backend's OpenAPI schema once, at its own startup - not lazily on " +
            "first request. If the backend isn't actually accepting connections yet at that exact " +
            "moment (e.g. it just restarted), agentgateway exits with a connection-refused error " +
            "instead of retrying.",
        ],
        note: "make agentgateway:restart once apps:up's backend is confirmed healthy resolves it.",
      },
      {
        heading: "Cleanup",
        code: [{ code: "make agentgateway:down" }],
      },
    ],
  },
  ja: {
    title: "シナリオ7: agentgateway経由でのMCPアクセス",
    description:
      "backendはすでに、自身のREST routesから自動生成されたMCPサーバーをfastapi-mcp経由で/mcpにネイティブ" +
      "にマウントしています。agentgatewayはそこに至るもう一つの経路です — backend側のMCP用コードではなく、" +
      "OpenAPIの契約(openapi.yaml、Specmatic/Microcks/Kongがすでに使っているのと同じ契約)から、/openapi.json" +
      "をライブに取得してMCPツールを丸ごと構築します。",
    sections: [
      {
        heading: "agentgatewayを使うメリット",
        body: [
          "エージェントのアカウント作成ツールの呼び出しは、Kafkaブリッジ(シナリオ3)がイベントごとに行うのと同じPOST /accountsです: 同じ書き込み経路への、もう1つの入口。",
        ],
        bullets: [
          "既存のOpenAPI契約から設定だけでMCPツールを作れ、backend側にMCPサーバーのコードを書いて保守する必要がありません。",
          "MCP(およびA2A)の通信を1つのゲートウェイに通すことで、AIエージェントが呼べるものへのアクセス制御・可観測性・ルーティングを一元化できます。",
          "ツールは他のすべてと同じ契約から作られるため、APIの変更に自動で追従します。",
        ],
      },
      {
        heading: "1. 起動し、実際に何を提供しているか確認する",
        code: [
          {
            code: "make apps:up\nmake agentgateway:up\nmake agentgateway:tools",
          },
        ],
        body: [
          "agentgateway:toolsは手動でMCPハンドシェイクを行い、提供中のツールを一覧表示します — " +
            "これが「本当にopenapi.yamlを読んでいる」ことの実際の確認であり、ハードコードされた例では" +
            "ありません。openapi.yamlの1オペレーションにつき1ツール、名前も説明もそこからそのまま取ら" +
            "れた、6個のツールです。",
        ],
        terminal: {
          lines: [
            { text: "$ make agentgateway:tools", tone: "muted" },
            {
              text: "Calling MCP initialize + tools/list against agentgateway...",
            },
            { text: "  health_health_get - Health", tone: "success" },
            { text: "  login_auth_login_post - Login", tone: "success" },
            {
              text: "  list_accounts_accounts_get - List Accounts",
              tone: "success",
            },
            {
              text: "  create_account_accounts_post - Create Account",
              tone: "success",
            },
            {
              text: "  list_balances_accounts_balances_get - List Balances",
              tone: "success",
            },
            {
              text: "  get_account_accounts__account_id__get - Get Account",
              tone: "success",
            },
          ],
        },
      },
      {
        heading: "2. ゲートウェイ経由でツールを呼び出す",
        body: [
          "list_balances_accounts_balances_getをゲートウェイ経由で呼び出すと、GET /accounts/balances自体" +
            "が返すのと同じライブなデータが返ります — 静的な説明ではなく、稼働中のbackendへの本物のプロキシ" +
            "です。",
        ],
        note:
          "create_account_accounts_postは、他のどこでもPOST /accounts自体が要求するのと同じく、本物の" +
          "bearerトークンが必要です — 先にlogin_auth_login_postを呼び、そのトークンをAuthorizationヘッダー" +
          "として渡してください。渡さなければ、認証なしのcurlと同じように401になります。",
      },
      {
        heading: "3. 実際のMCPクライアントから使う",
        body: [
          "MCPクライアント(Claude Desktop・mcp-inspectorなど)をhttp://localhost:8010/mcp" +
            "(Streamable HTTP)に向ければ、対話的に使えます — backend自身がネイティブにマウントしている" +
            "http://localhost:8080/mcpに接続するのとまったく同じ要領で、同じ6個のオペレーションへの独立した" +
            "2つの経路になります。",
        ],
      },
      {
        heading: "ダッシュボード",
        code: [
          {
            code: "make agentgateway:open   # http://localhost:15000 -> /uiへリダイレクト",
          },
        ],
        body: [
          "agentgatewayには本物のダッシュボードUI(デフォルトでイメージに組み込まれたReact SPA)があり、" +
            "上記MCPポートとは別のadminポートで提供されています。Routes -> Route 1では、このapps-demo" +
            "ルートが実際にどのbackendへ配線されているかがそのまま見えます — agentgateway:toolsが" +
            "動作を証明したのと、まさに同じルートです。",
        ],
        images: [
          {
            src: "/docs/screenshots/agentgateway-routes.png",
            alt: "agentgatewayダッシュボードのTraffic Routesページ。Route 1(HTTP、bind 3000、listener Listener 1、match /)がappsのbackendに配線されている様子",
            caption:
              "agentgateway自身のダッシュボード — Traffic > Routes。MCP呼び出しが実際に通る経路が表示されている。",
          },
        ],
      },
      {
        heading: "知っておくべき注意点",
        body: [
          "agentgatewayは、backendのOpenAPIスキーマを自身の起動時に一度だけ取得します — リクエストの" +
            "たびに遅延取得するわけではありません。ちょうどそのタイミングでbackendがまだ接続を受け付けて" +
            "いない場合(再起動直後など)、agentgatewayはリトライせずconnection refusedエラーで終了します。",
        ],
        note: "apps:upのbackendが正常であることを確認してからmake agentgateway:restartすれば解決します。",
      },
      {
        heading: "環境のクリーンアップ",
        code: [{ code: "make agentgateway:down" }],
      },
    ],
  },
};
