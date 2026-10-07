import type { LocalizedDocsPage } from "./types";

export const scenarioAgentgateway: LocalizedDocsPage = {
  en: {
    title: "Scenario 6: MCP access via agentgateway",
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
        heading: "1. Start it",
        code: [
          {
            code: "make agentgateway:up",
          },
        ],
        body: [
          "agentgateway:up starts the gateway. It reads shared/openapi/openapi.yaml directly when it starts " +
            "(config.yaml's schema.file, mounted read-only), so the tools are known without the backend running: nine " +
            "of them, one per operation, named and described straight from the contract (step 3 shows them in the " +
            "Inspector). The backend is only needed once a tool is actually called.",
        ],
        noteTitle: "agentgateway: OpenAPI as MCP tools",
        noteHref: "https://agentgateway.dev/docs/standalone/latest/mcp/connect/openapi/",
        note:
          "agentgateway/config.yaml gives the gateway an openapi target (schema.file plus host: backend:8080). " +
          "agentgateway then generates one MCP tool for each operation in the spec, named after its operationId, and " +
          "translates each tool call into the matching HTTP request.",
      },
      {
        heading: "2. Open the dashboard",
        code: [
          {
            code: "make agentgateway:open   # http://localhost:15000 -> redirects to /ui",
          },
        ],
        body: [
          "With agentgateway up, check the configuration it started with. Its dashboard (a React SPA built " +
            "into the image) is served off the admin port, separate from the MCP port, and lists the route that " +
            "agentgateway/config.yaml applied. Open Routes and click the pencil (Edit route) on Route 1 to see " +
            "what is configured in it.",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/agentgateway-routes.png",
            alt: "agentgateway dashboard Traffic Routes page showing Route 1 (HTTP, bind 3000, listener Listener 1, match /) wired to the apps backend",
            caption:
              "agentgateway's own dashboard - Traffic > Routes, showing the real route MCP calls go through.",
          },
          {
            src: "/docs/screenshots/agentgateway-route-edit.png",
            alt: "agentgateway's Edit route panel for Route 1: Prefix path match /, no header or query conditions, one legacy MCP backend, a CORS route policy, and the Resulting YAML with an apps-backend target of type openapi whose schema file is /shared/openapi/openapi.yaml and host is backend:8080",
            caption: "Edit route on Route 1. The Resulting YAML at the bottom is the route's real configuration.",
          },
        ],
        closing: [
          "The route matches everything under / and sends it to one MCP backend. The form shows it as \"legacy MCP " +
            "backend - unsupported backend shape in this form\", but the Resulting YAML spells it out: a single target, " +
            "apps-backend, of type openapi, with schema.file pointing at /shared/openapi/openapi.yaml and host " +
            "backend:8080. That is where the tools come from: the OpenAPI contract is the schema, and every operation " +
            "in it becomes a tool that is sent to backend:8080. The cors policy below it is what lets a browser client " +
            "such as MCP Inspector call the gateway. Close the panel with Cancel - Save route would change the running " +
            "configuration.",
        ],
      },
      {
        heading: "3. Try it in MCP Inspector",
        code: [{ code: "make apps:mcp   # opens MCP Inspector at http://localhost:6274" }],
        sequence: {
          summary:
            "Sequence diagram: MCP Inspector initializes a session with agentgateway, lists the tools the gateway built from openapi.yaml, and calls list_accounts_accounts_get, which the gateway turns into a GET /accounts on the backend and returns as the tool result.",
          participants: [
            { id: "mi", label: "MCP Inspector", sub: "MCP client" },
            { id: "ag", label: "agentgateway", sub: "MCP -> REST" },
            { id: "be", label: "Backend", sub: "REST" },
          ],
          steps: [
            { kind: "message", from: "mi", to: "ag", text: "Flip the switch: initialize", detail: "MCP over Streamable HTTP, :8010/mcp" },
            { kind: "message", from: "ag", to: "mi", text: "Session started", detail: "mcp-session-id", dashed: true },
            { kind: "message", from: "mi", to: "ag", text: "Tools tab: tools/list" },
            { kind: "note", at: "ag", text: "Eight tools, built from openapi.yaml - no backend call" },
            { kind: "message", from: "ag", to: "mi", text: "The tool list", detail: "name + title per operation", dashed: true },
            { kind: "message", from: "mi", to: "ag", text: "Execute Tool: tools/call", detail: "list_accounts_accounts_get" },
            { kind: "message", from: "ag", to: "be", text: "The matching REST call", detail: "GET /accounts" },
            { kind: "message", from: "be", to: "ag", text: "The account balances", detail: "JSON", dashed: true },
            { kind: "message", from: "ag", to: "mi", text: "The tool result", detail: "the same JSON as the content", dashed: true },
          ],
        },
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
        closing: [
          "Connect the agentgateway card: agentgateway refuses a connection without a valid token (401), so the Inspector opens the app's login in your browser - sign in, press Allow, and it turns green. Every tool then runs as you: try get_me_me_get the same way (it returns your profile). How the login works is under step 4.",
          "The backend's native /mcp also exposes its two GraphQL routes as tools, so its tool list is longer " +
          "than the nine agentgateway builds from the OpenAPI contract. Claude Code can use the " +
          "gateway too - step 4 below registers it, with a token.",
        ],
      },
      {
        heading: "4. Register it in Claude Code",
        body: [
          "Needs make agentgateway:up and make apps:up. Register agentgateway, then log in from the browser; a token by hand is the alternative at the end.",
        ],
        subsections: [
          {
            heading: "Register it and log in",
            body: [
              "Register agentgateway without a token, restart Claude Code (a running session does not pick up a newly added server), open /mcp, pick agentgateway and choose Authenticate. Your browser opens the app's own login: sign in (Demo login, or Keycloak) and press Allow - already signed in, you only press Allow. Claude Code is then connected, and every tool runs as you. If you set a token by hand (the last part of this step), that token is used and no login starts.",
            ],
            code: [
              { label: "1. Register agentgateway (drop the first line if it was never registered)", code: "claude mcp remove agentgateway\nclaude mcp add --transport http agentgateway http://localhost:8010/mcp" },
              { label: "2. Restart Claude Code, open /mcp, pick agentgateway and choose Authenticate", code: "claude mcp list" },
            ],
            closing: [
              "Claude Code's own Authenticate was not tried here: the login was run with MCP Inspector (step 3) and a scripted MCP client (agentgateway issue #3668 is about provider: keycloak, which this does not use). If it fails in Claude Code, registering with a token (below) works the same way.",
            ],
          },
          {
            heading: "How the login works",
            body: [
              "agentgateway asks for a token on every connection (policies.mcpAuthentication, mode strict). A request without a valid one gets 401 with a WWW-Authenticate header, and that is what starts an MCP client's browser login: it points at the backend's own OAuth login (/oauth/register, /oauth/authorize, /oauth/token - the one the backend's /mcp uses), whose login page is the frontend's /mcp-authorize. What the client gets back is an ordinary backend RS256 JWT.",
              "agentgateway checks that token against the backend's JWKS (issuer http://localhost:8080, audience nb-quickstarts-api, keys fetched over apps-network from http://backend:8080/.well-known/jwks.json) and, with backendAuth: passthrough, sends it on to the REST calls behind the tools. Without that line agentgateway drops the validated token and every tool answers invalid or missing token.",
              "MCP Inspector (step 3) runs the same login. It does the discovery, registration and token exchange inside its own container, and the servers advertise localhost addresses, so a small socat sidecar (mcp-inspector-localhost) forwards localhost:8080 and localhost:8010 there.",
            ],
          },
          {
            heading: "With a token instead",
            body: [
              "The same thing by hand, and a token set this way is used instead of the login. The tool arguments have no Authorization header, so the token goes on the connection itself: agentgateway checks it (it must be a backend JWT - a Keycloak token is another issuer's and is refused) and passes it through to the backend. In this order:",
            ],
            code: [
              { label: "1. Get a token (a login lasts a day)", code: "TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \\\n  -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')\necho \"token: ${TOKEN:0:12}...\"   # eyJ... (a JWT) means it worked" },
              { label: "2. Register agentgateway with it (drop the first line if it was never registered)", code: "claude mcp remove agentgateway\nclaude mcp add --transport http agentgateway http://localhost:8010/mcp --header \"Authorization: Bearer $TOKEN\"" },
              { label: "3. Restart Claude Code (a running session does not pick up a newly added server), then ask it to call get_me", code: "claude mcp list" },
            ],
            closing: [
              "get_me returning the demo user's profile means the token went through; \"invalid or missing token\" means the header was not registered - claude mcp get does not list headers (its Connected says nothing about them), ~/.claude.json does. A login token lasts a day (JWT_TTL_SECONDS). A Keycloak access token is not accepted here: sign in with Keycloak in the browser login instead, and the backend issues an ordinary token. Claude Desktop works the same way through the mcp-remote bridge (see Getting Started) with its --header option - not tried here.",
            ],
          },
        ],
      },
      {
        heading: "Cleanup",
        code: [{ code: "make agentgateway:down" }],
      },
    ],
  },
  ja: {
    title: "シナリオ6: agentgateway経由でのMCPアクセス",
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
        heading: "1. 起動する",
        code: [
          {
            code: "make agentgateway:up",
          },
        ],
        body: [
          "agentgateway:upでゲートウェイを起動します。起動時にshared/openapi/openapi.yamlを直接読む" +
            "(config.yamlのschema.file、読み取り専用でマウント)ので、backendが動いていなくてもツールは分かります: " +
            "オペレーションごとに1つ、計9個で、名前と説明は契約そのままです(手順3でInspectorに表示されます)。" +
            "backendが必要になるのは、ツールを実際に呼ぶときだけです。",
        ],
        noteTitle: "agentgateway: OpenAPIをMCPツールとして公開",
        noteHref: "https://agentgateway.dev/docs/standalone/latest/mcp/connect/openapi/",
        note:
          "agentgateway/config.yamlは、ゲートウェイにopenapiターゲット(schema.fileとhost: " +
          "backend:8080)を持たせています。agentgatewayは仕様内のオペレーション1つにつきMCPツールを1つ生成し(名前はoperationId)、ツール呼び出しを対応するHTTPリクエストに変換します。",
      },
      {
        heading: "2. ダッシュボードを開く",
        code: [
          {
            code: "make agentgateway:open   # http://localhost:15000 -> /uiへリダイレクト",
          },
        ],
        body: [
          "agentgatewayを起動したら、起動時に読み込まれた設定を確認します。ダッシュボード(イメージに組み込まれた" +
            "React SPA)はMCPポートとは別のadminポートで提供されていて、agentgateway/config.yamlが適用した" +
            "ルートが表示されます。Routesを開き、Route 1の鉛筆アイコン(Edit route)をクリックすると、" +
            "設定されている内容を見られます。",
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/agentgateway-routes.png",
            alt: "agentgatewayダッシュボードのTraffic Routesページ。Route 1(HTTP、bind 3000、listener Listener 1、match /)がappsのbackendに配線されている様子",
            caption:
              "agentgateway自身のダッシュボード — Traffic > Routes。MCP呼び出しが実際に通る経路が表示されている。",
          },
          {
            src: "/docs/screenshots/agentgateway-route-edit.png",
            alt: "agentgatewayのRoute 1のEdit routeパネル。パスマッチはPrefixの/、ヘッダー・クエリの条件なし、legacy MCP backendが1つ、CORSのルートポリシーがあり、下部のResulting YAMLにはapps-backendターゲット(種類はopenapi、schemaのfileは/shared/openapi/openapi.yaml、hostはbackend:8080)が表示されている",
            caption: "Route 1のEdit route。下部のResulting YAMLが、このルートの実際の設定です。",
          },
        ],
        closing: [
          "このルートは/以下をすべて一致させ、MCPバックエンドの1つへ送ります。フォームでは「legacy MCP backend — " +
            "Unsupported backend shape in this form」と表示されますが、Resulting YAMLには中身が書かれています: " +
            "ターゲットは1つ、apps-backend(種類はopenapi)で、schema.fileは/shared/openapi/openapi.yamlを、hostは" +
            "backend:8080を指しています。ツールの出どころはここで、OpenAPI契約がschemaとなり、その中のオペレーション" +
            "1つ1つがツールになってbackend:8080へ送られます。その下のcorsポリシーは、MCP Inspectorのような" +
            "ブラウザのクライアントがゲートウェイを呼べるようにするためのものです。パネルはCancelで閉じてください — " +
            "Save routeを押すと動作中の設定が変わります。",
        ],
      },
      {
        heading: "3. MCP Inspectorで試す",
        code: [{ code: "make apps:mcp   # MCP Inspectorを開く(http://localhost:6274)" }],
        sequence: {
          summary:
            "シーケンス図: MCP Inspectorはagentgatewayとセッションを開始し、ゲートウェイがopenapi.yamlから作ったツールを一覧し、list_accounts_accounts_getを呼び出します。ゲートウェイはそれをbackendへのGET /accountsに変換し、結果をツールの結果として返します。",
          participants: [
            { id: "mi", label: "MCP Inspector", sub: "MCP client" },
            { id: "ag", label: "agentgateway", sub: "MCP -> REST" },
            { id: "be", label: "Backend", sub: "REST" },
          ],
          steps: [
            { kind: "message", from: "mi", to: "ag", text: "スイッチをオン: initialize", detail: "Streamable HTTPのMCP、:8010/mcp" },
            { kind: "message", from: "ag", to: "mi", text: "セッション開始", detail: "mcp-session-id", dashed: true },
            { kind: "message", from: "mi", to: "ag", text: "Toolsタブ: tools/list" },
            { kind: "note", at: "ag", text: "openapi.yamlから作った9個のツール — backendは呼ばない" },
            { kind: "message", from: "ag", to: "mi", text: "ツール一覧", detail: "オペレーションごとのname + title", dashed: true },
            { kind: "message", from: "mi", to: "ag", text: "Execute Tool: tools/call", detail: "list_accounts_accounts_get" },
            { kind: "message", from: "ag", to: "be", text: "対応するRESTの呼び出し", detail: "GET /accounts" },
            { kind: "message", from: "be", to: "ag", text: "勘定科目の残高", detail: "JSON", dashed: true },
            { kind: "message", from: "ag", to: "mi", text: "ツールの結果", detail: "同じJSONをcontentとして返す", dashed: true },
          ],
        },
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
        closing: [
          "agentgatewayのカードに接続します: agentgatewayは有効なトークンのない接続を拒否(401)するので、Inspectorがアプリのログインをブラウザで開きます。ログインしてAllowを押すと、緑になります。どのツールも、あなたとして実行されます: 同じ要領でget_me_me_getを呼んでみてください(あなたのプロフィールが返ります)。ログインの仕組みは、手順4にあります。",
          "backendのネイティブな/mcpはGraphQLの2つのルートもツールとして公開するため、OpenAPI契約からagentgatewayが作る9個より" +
          "ツール数が多くなります。Claude Codeからもゲートウェイを使えます — " +
          "下の手順4でトークンを付けて登録します。",
        ],
      },
      {
        heading: "4. Claude Codeに登録する",
        body: [
          "make agentgateway:upとmake apps:upが必要です。agentgatewayを登録してから、ブラウザでログインします。トークンを手で渡す方法は、最後に代替手段として載せています。",
        ],
        subsections: [
          {
            heading: "登録してログインする",
            body: [
              "agentgatewayをトークンなしで登録し、Claude Codeを再起動し(起動中のセッションは追加したサーバーを読み込みません)、/mcpを開いてagentgatewayを選び、Authenticateを選びます。ブラウザでアプリ自身のログインが開くので、ログイン(デモログイン、またはKeycloak)してAllowを押します。すでにログイン済みなら、Allowを押すだけです。これでClaude Codeが接続され、どのツールもあなたとして実行されます。手動でトークンを設定した場合(この手順の最後の部分)は、そのトークンが優先され、ログインは始まりません。",
            ],
            code: [
              { label: "1. agentgatewayを登録する(未登録なら1行目は不要)", code: "claude mcp remove agentgateway\nclaude mcp add --transport http agentgateway http://localhost:8010/mcp" },
              { label: "2. Claude Codeを再起動し、/mcpでagentgatewayを選んでAuthenticateを選ぶ", code: "claude mcp list" },
            ],
            closing: [
              "Claude Code自身のAuthenticateは、ここでは試していません。ログインは、MCP Inspector(手順3)とスクリプトのMCPクライアントで確認しました(agentgatewayのissue #3668はprovider: keycloakの話で、ここでは使いません)。Claude Codeで失敗する場合は、下のトークンを付けた登録が、同じように使えます。",
            ],
          },
          {
            heading: "ログインの仕組み",
            body: [
              "agentgatewayは、すべての接続でトークンを要求します(policies.mcpAuthentication、modeはstrict)。有効なトークンのないリクエストは、WWW-Authenticateヘッダー付きの401になり、これがMCPクライアントのブラウザログインの合図になります。案内先は、backend自身のOAuthログイン(/oauth/register、/oauth/authorize、/oauth/token — backendの/mcpが使うものと同じ)で、そのログイン画面はfrontendの/mcp-authorizeです。クライアントが受け取るのは、通常のbackendのRS256のJWTです。",
              "agentgatewayは、そのトークンをbackendのJWKSで検証し(発行者http://localhost:8080、対象nb-quickstarts-api、鍵はapps-network経由でhttp://backend:8080/.well-known/jwks.jsonから取得)、backendAuth: passthroughで、ツールの背後のRESTの呼び出しにそのまま渡します。この1行がないと、agentgatewayは検証したトークンを捨てるので、どのツールも「invalid or missing token」になります。",
              "MCP Inspector(手順3)も、同じログインを行います。Inspectorは、発見・登録・トークン交換を自分のコンテナの中で行い、サーバーがlocalhostのアドレスを案内するため、小さなsocatのサイドカー(mcp-inspector-localhost)が、そこでlocalhost:8080とlocalhost:8010を転送します。",
            ],
          },
          {
            heading: "トークンを付けて登録する(代替手段)",
            body: [
              "同じことを手で行う方法で、この方法で設定したトークンは、ログインより優先されます。ツールの引数にAuthorizationヘッダーは無いので、トークンは接続そのものに付けます: agentgatewayはそれを検証し(backendのJWTであること。Keycloakのトークンは発行者が別のため拒否されます)、backendへそのまま渡します。次の順で行います:",
            ],
            code: [
              { label: "1. トークンを取得する(ログインは1日有効)", code: "TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \\\n  -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')\necho \"token: ${TOKEN:0:12}...\"   # eyJ... (a JWT) means it worked" },
              { label: "2. そのトークンを付けてagentgatewayを登録する(未登録なら1行目は不要)", code: "claude mcp remove agentgateway\nclaude mcp add --transport http agentgateway http://localhost:8010/mcp --header \"Authorization: Bearer $TOKEN\"" },
              { label: "3. Claude Codeを再起動する(起動中のセッションは追加したサーバーを読み込みません)。そのあとget_meを呼ぶよう頼む", code: "claude mcp list" },
            ],
            closing: [
              "get_meがデモユーザーのプロフィールを返せば、トークンは通っています。「invalid or missing token」ならヘッダーが登録されていません — claude mcp getはヘッダーを表示しません(Connectedはヘッダーと無関係です)。確認は~/.claude.jsonで行います。ログイントークンは1日(JWT_TTL_SECONDS)です。Keycloakのアクセストークンはここでは受け付けません: ブラウザログインでKeycloakを選べば、backendが通常のトークンを発行します。Claude Desktopもmcp-remoteブリッジ(Getting Startedを参照)の--headerオプションで同じように使えますが、ここでは試していません。",
            ],
          },
        ],
      },
      {
        heading: "環境のクリーンアップ",
        code: [{ code: "make agentgateway:down" }],
      },
    ],
  },
};
