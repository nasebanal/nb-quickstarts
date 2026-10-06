import type { LocalizedDocsPage } from "./types";

export const scenarioAgentgateway: LocalizedDocsPage = {
  en: {
    title: "Scenario 7: MCP access via agentgateway",
    description:
      "The backend already mounts its own MCP server natively at /mcp (via fastapi-mcp, auto-derived " +
      "from its REST routes). agentgateway is a different way to get there: instead of backend-side " +
      "MCP code, it builds MCP tools entirely from the OpenAPI contract (openapi.yaml) - the same " +
      "contract Specmatic and the backend use, read from shared/openapi/openapi.yaml.",
    sections: [
      {
        heading: "Why agentgateway",
        body: [
          "An agent's create-transaction tool call is the same POST /transactions that the Kafka bridge (Scenario 3) makes for each event: another way in to the same write path.",
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
            code: "make agentgateway:up\nmake agentgateway:tools",
          },
        ],
        body: [
          "agentgateway:tools does the MCP handshake by hand and lists what's being served - the real " +
            "verification that it's actually reading openapi.yaml, not a hardcoded example: eight tools, " +
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
            { text: "  get_me_me_get - Get Me", tone: "success" },
            { text: "  update_profile_me_profile_put - Changes the display name and/or language; fields left out stay as they are. The email is recorded but not editable here.", tone: "success" },
            {
              text: "  list_transactions_transactions_get - List Transactions",
              tone: "success",
            },
            {
              text: "  create_transaction_transactions_post - Record a Transaction",
              tone: "success",
            },
            {
              text: "  get_transaction_transactions__transaction_id__get - Get Transaction",
              tone: "success",
            },
            {
              text: "  list_accounts_accounts_get - List Accounts",
              tone: "success",
            },
          ],
        },
      },
      {
        heading: "2. Call a tool through the gateway",
        body: [
          "Run make apps:up before calling a tool. Calling list_accounts_accounts_get through the gateway returns the same live data " +
            "GET /accounts itself does - it's a real proxy to the running backend, not a " +
            "static description of it.",
        ],
        note:
          "get_me, update_profile and create_transaction need a real bearer token, same as the REST routes " +
          "behind them. The tool arguments have no Authorization header, so called as-is they answer " +
          "\"invalid or missing token\" - see \"4. Register it in Claude Code, with a token\" below.",
      },
      {
        heading: "3. Try it in MCP Inspector",
        code: [{ code: "make apps:mcp   # opens MCP Inspector at http://localhost:6274" }],
        body: [
          "MCP Inspector (started with apps:up) lists agentgateway next to the backend's own /mcp. " +
            "How to connect and call a tool is shown with the backend in [Getting Started](/docs/getting-started); " +
            "here, do the same through the gateway: flip the switch on the agentgateway card, open the " +
            "Tools tab, pick list_accounts_accounts_get and press Execute Tool. The server name in the " +
            "header is rmcp (agentgateway's own MCP implementation), the tools come with titles taken from " +
            "the OpenAPI contract, and the result is the same account list - this time proxied through the " +
            "gateway (its access log, and Tempo's trace if observability is up, show the call).",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mcp-inspector-agentgateway.png",
            alt: "MCP Inspector connected to agentgateway (rmcp) with List Accounts executed and its JSON result",
            caption: "Connected to agentgateway: titled tools built from the OpenAPI contract, same account data.",
          },
        ],
        note:
          "The backend's native /mcp also exposes its two GraphQL routes as tools, so its tool list is longer " +
          "than the eight agentgateway builds from the OpenAPI contract. Claude Code can use the " +
          "gateway too - step 4 below registers it, with a token.",
      },
      {
        heading: "4. Register it in Claude Code, with a token",
        body: [
          "get_me, update_profile and create_transaction need a bearer token, like the REST routes behind them, and the tool " +
            "arguments have no Authorization header - so without a token they answer \"invalid or missing token\". The " +
            "token therefore goes on the connection itself: agentgateway passes the connection's Authorization header through to " +
            "the backend (checked with a demo token and with a Keycloak one). So register it with one, in this order " +
            "(needs make agentgateway:up and make apps:up):",
        ],
        code: [
          {
            label: "1. Get a token (the demo token never expires)",
            code:
              "TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \\\n" +
              "  -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')\n" +
              "echo \"token: ${TOKEN:0:12}...\"   # nb1~ZGVtbw~... means it worked",
          },
          {
            label: "2. Register agentgateway with it (drop the first line if it was never registered)",
            code:
              "claude mcp remove agentgateway\n" +
              "claude mcp add --transport http agentgateway http://localhost:8010/mcp --header \"Authorization: Bearer $TOKEN\"",
          },
          {
            label: "3. Restart Claude Code (a running session does not pick up a newly added server), then ask it to call get_me",
            code: "claude mcp list",
          },
        ],
        note:
          "get_me returning the demo user's profile means the token went through; \"invalid or missing token\" means the header was not " +
          "registered - claude mcp get does not list headers (its Connected says nothing about them), ~/.claude.json does. The demo " +
          "token never expires; a Keycloak access token lasts minutes. Claude Desktop works the same way through the mcp-remote bridge " +
          "(see Getting Started) with its --header option - not tried here.",
        subsections: [
          {
            heading: "Why not the browser login (Authenticate)?",
            body: [
              "agentgateway has no login of its own here, and APPS_MCP_AUTH_REQUIRED does not reach it: it builds its tools from " +
                "the OpenAPI contract and calls the REST routes, never the backend's /mcp. So in Claude Code's /mcp the server " +
                "shows not authenticated, and Authenticate fails with Dynamic Client Registration rejected (HTTP 406) - every path " +
                "other than /mcp is answered by agentgateway's MCP handler, so there is no OAuth endpoint to register with. " +
                "Pick Reconnect instead (it connects fine; the header carries the token).",
              "A browser login through agentgateway itself would need policies.mcpAuthentication, which only validates JWTs - " +
                "the demo token is not one - so it waits for the backend to issue JWTs. provider: keycloak is no way around that: " +
                "agentgateway issue #3668 makes Claude Code reject the login (RFC 9207 issuer mismatch).",
            ],
          },
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
        heading: "Contract and backend availability",
        body: [
          "agentgateway reads shared/openapi/openapi.yaml from a read-only mount when it starts, " +
            "so the backend can be down while the gateway starts and lists its tools. " +
            "Tool calls still need the backend to be running.",
        ],
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
      "OpenAPIの契約(openapi.yaml、Specmaticやbackendが使っているのと同じ契約)を" +
      "shared/openapi/openapi.yamlから直接読み込んでMCPツールを丸ごと構築します。",
    sections: [
      {
        heading: "agentgatewayを使うメリット",
        body: [
          "エージェントの取引記帳ツールの呼び出しは、Kafkaブリッジ(シナリオ3)がイベントごとに行うのと同じPOST /transactionsです: 同じ書き込み経路への、もう1つの入口。",
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
            code: "make agentgateway:up\nmake agentgateway:tools",
          },
        ],
        body: [
          "agentgateway:toolsは手動でMCPハンドシェイクを行い、提供中のツールを一覧表示します — " +
            "これが「本当にopenapi.yamlを読んでいる」ことの実際の確認であり、ハードコードされた例では" +
            "ありません。openapi.yamlの1オペレーションにつき1ツール、名前も説明もそこからそのまま取ら" +
            "れた、8個のツールです。",
        ],
        terminal: {
          lines: [
            { text: "$ make agentgateway:tools", tone: "muted" },
            {
              text: "Calling MCP initialize + tools/list against agentgateway...",
            },
            { text: "  health_health_get - Health", tone: "success" },
            { text: "  login_auth_login_post - Login", tone: "success" },
            { text: "  get_me_me_get - Get Me", tone: "success" },
            { text: "  update_profile_me_profile_put - Changes the display name and/or language; fields left out stay as they are. The email is recorded but not editable here.", tone: "success" },
            {
              text: "  list_transactions_transactions_get - List Transactions",
              tone: "success",
            },
            {
              text: "  create_transaction_transactions_post - Record a Transaction",
              tone: "success",
            },
            {
              text: "  get_transaction_transactions__transaction_id__get - Get Transaction",
              tone: "success",
            },
            {
              text: "  list_accounts_accounts_get - List Accounts",
              tone: "success",
            },
          ],
        },
      },
      {
        heading: "2. ゲートウェイ経由でツールを呼び出す",
        body: [
          "ツールを呼び出す前にmake apps:upを実行します。list_accounts_accounts_getをゲートウェイ経由で呼び出すと、GET /accounts自体" +
            "が返すのと同じライブなデータが返ります — 静的な説明ではなく、稼働中のbackendへの本物のプロキシ" +
            "です。",
        ],
        note:
          "get_me、update_profile、create_transactionは、背後のRESTルートと同じく本物のbearerトークンが" +
          "必要です。ツールの引数にAuthorizationヘッダーは無いので、そのまま呼ぶと「invalid or missing token」に" +
          "なります — 下の「4. トークンを付けてClaude Codeに登録する」を見てください。",
      },
      {
        heading: "3. MCP Inspectorで試す",
        code: [{ code: "make apps:mcp   # MCP Inspectorを開く(http://localhost:6274)" }],
        body: [
          "MCP Inspector(apps:upと一緒に起動)には、backend自身の/mcpと並んでagentgatewayが載っています。" +
            "接続とツール呼び出しの手順はbackendを例に[Getting Started](/docs/getting-started)で示しているので、" +
            "ここではゲートウェイ経由で同じことを行います: agentgatewayカードのスイッチをオンにし、Toolsタブで" +
            "list_accounts_accounts_getを選んでExecute Toolを押します。ヘッダーのサーバー名はrmcp(agentgateway" +
            "自身のMCP実装)で、ツールにはOpenAPI契約から取られたタイトルが付き、結果は同じ勘定科目一覧です — " +
            "ただし今回はゲートウェイを経由しています(agentgatewayのアクセスログや、observabilityを起動していれば" +
            "Tempoのトレースにも呼び出しが残ります)。",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/mcp-inspector-agentgateway.png",
            alt: "agentgateway(rmcp)に接続したMCP Inspector。List Accountsを実行し、JSONの結果が表示されている",
            caption: "agentgatewayに接続した状態: OpenAPI契約から作られたタイトル付きのツールと、同じ勘定科目データ。",
          },
        ],
        note:
          "backendのネイティブな/mcpはGraphQLの2つのルートもツールとして公開するため、OpenAPI契約からagentgatewayが作る8個より" +
          "ツール数が多くなります。Claude Codeからもゲートウェイを使えます — " +
          "下の手順4でトークンを付けて登録します。",
      },
      {
        heading: "4. トークンを付けてClaude Codeに登録する",
        body: [
          "get_me、update_profile、create_transactionは、背後のRESTルートと同じくbearerトークンが必要で、ツールの引数に" +
            "Authorizationヘッダーは無いので、トークンが無いと「invalid or missing token」になります。そのためトークンは" +
            "接続そのものに付けます: agentgatewayは接続のAuthorizationヘッダーをbackendへそのまま渡します(デモトークンでも" +
            "Keycloakのトークンでも確認済み)。次の順で、トークンを付けて登録します(make agentgateway:upとmake apps:upが必要です):",
        ],
        code: [
          {
            label: "1. トークンを取得する(デモトークンは期限なし)",
            code:
              "TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \\\n" +
              "  -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')\n" +
              "echo \"token: ${TOKEN:0:12}...\"   # nb1~ZGVtbw~... means it worked",
          },
          {
            label: "2. そのトークンを付けてagentgatewayを登録する(未登録なら1行目は不要)",
            code:
              "claude mcp remove agentgateway\n" +
              "claude mcp add --transport http agentgateway http://localhost:8010/mcp --header \"Authorization: Bearer $TOKEN\"",
          },
          {
            label: "3. Claude Codeを再起動する(起動中のセッションは追加したサーバーを読み込みません)。そのあとget_meを呼ぶよう頼む",
            code: "claude mcp list",
          },
        ],
        note:
          "get_meがデモユーザーのプロフィールを返せば、トークンは通っています。「invalid or missing token」ならヘッダーが登録されて" +
          "いません — claude mcp getはヘッダーを表示しません(Connectedはヘッダーと無関係です)。確認は~/.claude.jsonで行います。デモ" +
          "トークンは期限なし、Keycloakのアクセストークンは数分です。Claude Desktopもmcp-remoteブリッジ(Getting Startedを参照)の" +
          "--headerオプションで同じように使えますが、ここでは試していません。",
        subsections: [
          {
            heading: "ブラウザログイン(Authenticate)ではない理由",
            body: [
              "agentgatewayにはここで独自のログインがなく、APPS_MCP_AUTH_REQUIREDも届きません。OpenAPIコントラクトから" +
                "ツールを作り、RESTルートを呼ぶだけで、backendの/mcpは使わないからです。そのためClaude Codeの/mcpでは" +
                "not authenticatedと表示され、AuthenticateはDynamic Client Registration rejected (HTTP 406)で失敗します" +
                " — /mcp以外のパスはすべてagentgatewayのMCPハンドラが応答するので、登録先のOAuthエンドポイントが" +
                "ありません。代わりにReconnectを選んでください(接続はできて、トークンはヘッダーが運びます)。",
              "agentgateway自身でブラウザログインするには、JWTだけを検証するpolicies.mcpAuthenticationが要り、デモトークンは" +
                "JWTではないので、backendがJWTを発行できるようになるまで待ちです。provider: keycloakも回避策にはなりません: " +
                "agentgatewayのissue #3668により、Claude Codeがそのログインを拒否します(RFC 9207の発行元の不一致)。",
            ],
          },
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
        heading: "コントラクトとbackendの起動状態",
        body: [
          "agentgatewayは起動時にshared/openapi/openapi.yamlを読み取り専用のマウントから直接読み込みます。" +
            "backendが停止していても起動とツール一覧の表示ができますが、ツールの呼び出しには稼働中のbackendが必要です。",
        ],
      },
      {
        heading: "環境のクリーンアップ",
        code: [{ code: "make agentgateway:down" }],
      },
    ],
  },
};
