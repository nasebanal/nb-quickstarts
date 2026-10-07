import type { LocalizedDocsPage } from "./types";

export const scenarioKong: LocalizedDocsPage = {
  en: {
    title: "Scenario 2: Switch to Kong",
    description:
      "Kong's apps_backend gateway service proxies http://localhost:8000/api/* to the real backend's " +
      "own root (strip_path: true, so /api/transactions reaches backend:8080/transactions). This scenario " +
      "routes the frontend through it, then repoints that same service at a contract mock instead of " +
      "the real backend - with no frontend code change either time.",
    sections: [
      {
        heading: "Why Kong and Specmatic",
        body: [
          "Kafka's path (Scenario 3) does not go through Kong: by default the bridge posts to the backend directly. Kong is where the REST clients - the browser, the load tests - are routed, and where a contract mock can be swapped in.",
        ],
        bullets: [
          "Kong: put auth, rate limiting and routing in one gateway in front of the backend, and change where traffic goes at runtime - no application code change.",
          "Specmatic: a mock server generated straight from the OpenAPI contract, and the same contract can verify the real backend, so mock and implementation can't quietly drift apart.",
        ],
      },
      {
        heading: "Plugins used in this scenario",
        body: [
          "Kong's behavior here comes from a handful of plugins, all declared in kong/conf/declarative.yml.",
        ],
        table: {"headers": ["Plugin", "Applied to", "What it does"], "rows": [["[mock-demo-token](https://developer.konghq.com/plugins/request-transformer/)", "Service apps_backend (off by default)", "A request-transformer instance. When apps_backend points at Specmatic's mock, it swaps the client's token for the fixed demo token that the mock accepts."], ["[response-transformer](https://developer.konghq.com/plugins/response-transformer/)", "Service apps_backend", "Adds Access-Control-Expose-Headers: Via,X-Specmatic-Result, so the browser can read the headers the frontend uses to show \"Via Kong\" and \"Via Mock\"."], ["[opentelemetry](https://developer.konghq.com/plugins/opentelemetry/)", "Service apps_backend", "Sends a trace of each request to the OpenTelemetry Collector (Scenario 7, Observability)."], ["[rate-limiting](https://developer.konghq.com/plugins/rate-limiting/)", "Service example_service (/mock, /echo)", "Limits the demo routes to 5 requests per minute. It is not applied to /api."]], "nowrapColumns": [0]},
        closing: [
          "The same list is in Kong Manager (Plugins), or with curl http://localhost:8001/plugins.",
        ],
      },
      {
        heading: "1. Start Kong and route the frontend through it",
        body: [
          "Kong runs in DB mode (KONG_DB=postgres) by default, so Kong Manager can save edits; DB-less mode (KONG_DB=off) " +
            "has a read-only Admin API, so it can display apps_backend but can't save an edit to it. " +
            "NEXT_PUBLIC_API_BASE is baked into the frontend's bundle at server start (Next.js dev " +
            "mode), so it needs apps:restart, not just a browser reload, to pick up the change.",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make kong:up\n" +
              "# .env: APPS_API_BASE=http://localhost:8000/api\n" +
              "make apps:restart   # frontend needs recreating to pick up the new value",
          },
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/kong-frontend-via-kong.png",
            alt: "The frontend's account page with API endpoint http://localhost:8000/api and the Via Kong checkbox checked",
            caption: "After apps:restart: the API endpoint is http://localhost:8000/api and Via Kong is checked.",
          },
        ],
        closing: [
          "Log in at http://localhost:5173 and look at the strip above the balances: it shows the API endpoint the " +
            "frontend is using and three checkboxes. They are read-only indicators, and each is checked from a real " +
            "response header, not from configuration - Via Kong when the answer carries Kong's Via header. The same " +
            "balances appear either way; only the route changed.",
        ],
        noteTitle: "Kong: DB mode and declarative configuration",
        noteHref: "https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/",
        note:
          "kong/conf/declarative.yml describes Kong's services, routes and plugins as declarative configuration. In " +
          "DB-less mode (KONG_DB=off) Kong reads only that file and its Admin API is read-only. This repo defaults " +
          "to DB mode: the file is imported into Postgres on the first start (or by make kong:up after make kong:reset, which empties the database), after which " +
          "the same entities can be edited in Kong Manager.",
      },
      {
        heading: "2. Start the contract mocks",
        body: [
          "Start whichever mock you want apps_backend to point at in the next step - the real backend " +
            "needs nothing extra.",
        ],
        code: [
          {
            label:
              "Specmatic's mock (reads the checked-in shared contract and examples):",
            code: "make specmatic:mock-up",
          },
        ],
        closing: ["Specmatic's mock needs no Path at all, since its mock paths already match the real API directly."],
      },
      {
        heading: "3. Swap the target to a contract mock",
        body: [
          "apps_backend's Host/Port/Path, edited right from Kong Manager, is the seam: repoint it at a " +
            "mock built from the same contract instead of the real backend, and neither the frontend " +
            "nor anything hitting /api/* needs to change at all. Host/Port here are Docker Compose " +
            "service names on apps-network, not localhost - only resolvable from inside that network, " +
            "which is why Kong itself joins it.",
          "Every API route needs a bearer token now, and the mock answers only the one token its contract " +
            "examples carry (the fixed demo token), not the token a login hands out. So kong/conf/declarative.yml " +
            "ships a request-transformer plugin on apps_backend, named mock-demo-token and switched off, that " +
            "swaps the demo token in for whatever the client sent. You switch it on together with the target " +
            "in step 4; against the real backend it stays off.",
        ],
        table: {
          headers: ["Target", "Host", "Port", "Path"],
          rows: [
            ["Real backend (default)", "backend", "8080", "(empty)"],
            ["Specmatic's mock", "specmatic-mock", "9091", "(empty)"],
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
        heading: "4. Edit it in Kong Manager",
        bullets: [
          "make kong:open (or open http://localhost:8002) → Gateway Services → apps_backend → Edit.",
          "Set Host / Port / Path to one of the targets above, then Save.",
          "Pointing at the mock? Also switch on the mock-demo-token plugin: apps_backend → Plugins → " +
            "request-transformer (mock-demo-token) → enable, or curl -X PATCH http://localhost:8001/plugins/mock-demo-token " +
            "-d enabled=true.",
          "curl -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts (a token from POST " +
            "/api/auth/login - see step 5), or reload the frontend's account page (the checkboxes are " +
            "checked once when the page loads, so a reload is needed), to confirm - allow a couple of seconds " +
            "for the change to propagate.",
          "To go back to the real backend: edit apps_backend again, Host backend / Port 8080 / Path " +
            "empty, Save - and switch the mock-demo-token plugin off again.",
        ],
      },
      {
        heading: "5. Verify it worked",
        body: [
          "The real backend and Specmatic's mock return structurally similar but genuinely different " +
            "data - the mock answers with the example written in the contract (openapi.yaml), never the ledger's real values. " +
            "That difference through the exact same curl, before and after the edit, is the proof the " +
            "swap actually took effect (via the Admin API here - the same edit Kong Manager's Save " +
            "button makes):",
        ],
        terminal: {
          lines: [
            {
              text: "$ TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H 'content-type: application/json' -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')",
              tone: "muted",
            },
            {
              text: "$ curl -s -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts",
              tone: "muted",
            },
            {
              text: '[{"name":"Cash","balance":121012,"eventCount":8},{"name":"Rent Expense","balance":30000,"eventCount":1},...',
            },
            { text: "" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/services/apps_backend -d host=specmatic-mock -d port=9091",
              tone: "muted",
            },
            { text: "host: specmatic-mock port: 9091", tone: "info" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/plugins/mock-demo-token -d enabled=true",
              tone: "muted",
            },
            { text: "enabled: true", tone: "info" },
            { text: "" },
            {
              text: "$ curl -s -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts",
              tone: "muted",
            },
            {
              text: '[{"name": "Cash", "balance": 120000, "eventCount": 3},',
              tone: "success",
            },
            {
              text: ' {"name": "Rent Expense", "balance": 30000, "eventCount": 1},',
              tone: "success",
            },
            {
              text: ' {"name": "Sales Revenue", "balance": 50000, "eventCount": 1}]',
              tone: "success",
            },
            {
              text: "  ^ Specmatic's mock - the example from the contract (the same every time), not the real ledger",
            },
          ],
        },
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/kong-frontend-via-mock.png",
            alt: "The frontend's account page after apps_backend was pointed at Specmatic's mock: Via Kong and Via Mock both checked, and only three accounts listed",
            caption: "After the swap and a reload: Via Mock is checked too, and the balances are the mock's example data.",
          },
        ],
        closing: [
          "The frontend shows the same thing. Reload its account page after the edit: Via Mock is now checked " +
            "next to Via Kong (Specmatic's mock adds an X-Specmatic-Result response header the real backend never " +
            "sends, which is what the checkbox looks for), and the balance table switches to the mock's example " +
            "data. The API endpoint is still http://localhost:8000/api - the frontend itself was not touched.",
        ],
      },
      {
        heading: "Cleanup",
        body: [
          "Stop everything this scenario started. Kong goes last, and the frontend is pointed back at " +
            "the backend directly first - otherwise it would keep calling a gateway that's no longer there.",
        ],
        code: [
          {
            code:
              "# .env: remove APPS_API_BASE (or set it back to http://localhost:8080)\n" +
              "make apps:restart          # frontend needs recreating to pick up the change\n" +
              "make specmatic:mock-down   # if you started Specmatic's mock\n" +
              "make kong:down",
          },
        ],
      },
    ],
  },
  ja: {
    title: "シナリオ2: Kong経由への切り替え",
    description:
      "Kongのapps_backendというGateway Serviceは、http://localhost:8000/api/*を実際のbackendのルートへ" +
      "そのままプロキシします(strip_path: trueなので、/api/transactionsはbackend:8080/transactionsに届きます)。" +
      "このシナリオでは、まずfrontendの接続先をこのKong経由に切り替え、そのうえで同じServiceの向き先を" +
      "実backendから契約モックへ差し替えます — どちらの場合もfrontend側のコード変更は一切不要です。",
    sections: [
      {
        heading: "Kong・Specmaticを使うメリット",
        body: [
          "Kafkaの経路(シナリオ3)はKongを通りません: ブリッジはデフォルトでbackendへ直接POSTします。Kongは、RESTのクライアント — ブラウザや負荷テスト — をルーティングし、契約モックへ差し替えられる場所です。",
        ],
        bullets: [
          "Kong: 認証・レート制限・ルーティングをbackendの前段のゲートウェイに集約でき、向き先の変更もアプリのコードを触らず実行時に行えます。",
          "Specmatic: OpenAPIの契約からそのままモックサーバーを生成でき、同じ契約で実backendも検証できるため、モックと実装が知らないうちにずれることを防げます。",
        ],
      },
      {
        heading: "このシナリオで使っているプラグイン",
        body: [
          "このシナリオのKongの動作は、いくつかのプラグインで実現していて、すべてkong/conf/declarative.ymlに宣言されています。",
        ],
        table: {"headers": ["プラグイン", "付けている場所", "用途"], "rows": [["[mock-demo-token](https://developer.konghq.com/plugins/request-transformer/)", "サービス apps_backend(初期は無効)", "request-transformerのインスタンスです。apps_backendをSpecmaticのモックに向けたとき、クライアントのトークンを、モックが受け付ける固定デモトークンに差し替えます。"], ["[response-transformer](https://developer.konghq.com/plugins/response-transformer/)", "サービス apps_backend", "Access-Control-Expose-Headers: Via,X-Specmatic-Result を足します。frontendが「Kong経由」「モック経由」の表示に使うヘッダーを、ブラウザが読めるようにするためです。"], ["[opentelemetry](https://developer.konghq.com/plugins/opentelemetry/)", "サービス apps_backend", "各リクエストのトレースを、OpenTelemetry Collectorへ送ります(シナリオ7: オブザーバビリティ)。"], ["[rate-limiting](https://developer.konghq.com/plugins/rate-limiting/)", "サービス example_service(/mock、/echo)", "デモ用のルートを、1分5リクエストに制限します。/apiにはかけていません。"]], "nowrapColumns": [0]},
        closing: [
          "同じ一覧は、Kong Manager(Plugins)や、curl http://localhost:8001/plugins でも見られます。",
        ],
      },
      {
        heading: "1. Kongを起動し、frontendをKong経由にする",
        body: [
          "KongはデフォルトでDBモード(KONG_DB=postgres)で動くので、Kong Managerで編集内容を保存できます。" +
            "DB-lessモード(KONG_DB=off)ではAdmin APIが読み取り専用になり、apps_backendの表示はできても保存できません。" +
            "NEXT_PUBLIC_API_BASEはサーバー起動時(Next.jsの開発モード)にfrontendのバンドルへ焼き込まれる" +
            "ため、ブラウザのリロードではなくapps:restartが必要です。",
        ],
        code: [
          {
            code:
              "make apps:up\n" +
              "make kong:up\n" +
              "# .env: APPS_API_BASE=http://localhost:8000/api\n" +
              "make apps:restart   # frontendを再作成して新しい値を反映",
          },
        ],
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/kong-frontend-via-kong.png",
            alt: "frontendの勘定科目ページ。API endpointはhttp://localhost:8000/apiで、Via Kongのチェックボックスがチェックされている",
            caption: "apps:restart後: API endpointがhttp://localhost:8000/apiになり、Via Kongにチェックが入ります。",
          },
        ],
        closing: [
          "http://localhost:5173にログインし、残高表の上の帯を見てください。frontendが使っているAPI endpointと、" +
            "3つのチェックボックスが表示されています。これらは読み取り専用の表示で、設定からの推測ではなく実際の" +
            "レスポンスヘッダーで判定しています — 応答にKongのViaヘッダーが付いていればVia Kongにチェックが入ります。" +
            "どちらの経路でも同じ残高が表示され、変わったのは経路だけです。",
        ],
        noteTitle: "Kong: DBモードと宣言的設定",
        noteHref: "https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/",
        note:
          "kong/conf/declarative.ymlは、Kongのservice・route・pluginを宣言的設定として記述したファイルです。DB-lessモード(KONG_DB=off)ではKongはこのファイルだけを読み、Admin " +
          "APIは読み取り専用になります。このリポジトリは既定でDBモードで、初回起動時(またはmake kong:reset でDBを空にしたあとのmake kong:up)にこのファイルがPostgresへ取り込まれ、以後は同じエンティティをKong " +
          "Managerで編集できます。",
      },
      {
        heading: "2. 契約モックを起動する",
        body: [
          "次の手順でapps_backendの向き先にしたいモックを起動しておきます — 実backendに戻すだけなら" +
            "追加の準備は不要です。",
        ],
        code: [
          {
            label:
              "Specmaticのモック(共有コントラクトとexampleを直接読み込み、apps:upは不要):",
            code: "make specmatic:mock-up",
          },
        ],
        closing: ["Specmaticのモックはモック側のパスが実APIとそのまま一致するため、Pathの指定は不要です。"],
      },
      {
        heading: "3. 向き先を契約モックへ差し替える",
        body: [
          "Kong Managerから直接編集できるapps_backendのHost/Port/Pathが差し替えの接点です — 実backendの" +
            "代わりに同じ契約由来のモックを指すよう変更するだけで、frontend側も/api/*を叩く側も一切変更" +
            "不要です。ここでのHost/PortはDocker Composeのサービス名であり、apps-network内からしか解決" +
            "できません(localhostではない)。Kong自身がこのネットワークに参加しているのはこのためです。",
          "APIはすべてbearerトークンが必要になり、モックが答えるのは契約のexampleに書かれた1つのトークン" +
            "(固定デモトークン)だけで、ログインで得たトークンには答えません。そのためkong/conf/declarative.ymlには、" +
            "apps_backendに付けたrequest-transformerプラグイン(名前はmock-demo-token、初期は無効)があり、" +
            "クライアントが送ったトークンをデモトークンに差し替えます。手順4で向き先と一緒にオンにします。" +
            "実backendに向けているときはオフのままです。",
        ],
        table: {
          headers: ["向き先", "Host", "Port", "Path"],
          rows: [
            ["実backend(デフォルト)", "backend", "8080", "(空)"],
            ["Specmaticのモック", "specmatic-mock", "9091", "(空)"],
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
        heading: "4. Kong Managerで編集する",
        bullets: [
          "make kong:open(またはhttp://localhost:8002を開く)→ Gateway Services → apps_backend → Edit。",
          "Host / Port / Pathを上の表いずれかに設定してSave。",
          "モックに向けるときは、mock-demo-tokenプラグインもオンにします: apps_backend → Plugins → " +
            "request-transformer(mock-demo-token)→ 有効化、またはcurl -X PATCH http://localhost:8001/plugins/mock-demo-token " +
            "-d enabled=true。",
          "curl -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts(トークンはPOST " +
            "/api/auth/loginで取得 — 手順5を参照)、またはfrontendの勘定科目ページのリロード(チェックボックスは" +
            "ページを開いたときに一度だけ判定されるため、リロードが必要です)で確認します " +
            "— 反映まで数秒かかることがあります。",
          "実backendに戻すには: apps_backendを再度編集し、Host backend / Port 8080 / Pathは空でSaveし、mock-demo-tokenプラグインもオフに戻します。",
        ],
      },
      {
        heading: "5. 反映されたことを確認する",
        body: [
          "実backendとSpecmaticのモックは、構造は似ていても中身がまったく異なるデータを返します — " +
            "モックはコントラクト(openapi.yaml)に書かれたexampleを返し、台帳の実データでは" +
            "決してありません。同じcurlを編集の前後で叩いたときのこの違いこそが、切り替えが実際に" +
            "反映された証拠です(ここではAdmin API経由 — Kong ManagerのSaveボタンが行うのと同じ編集です):",
        ],
        terminal: {
          lines: [
            {
              text: "$ TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H 'content-type: application/json' -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')",
              tone: "muted",
            },
            {
              text: "$ curl -s -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts",
              tone: "muted",
            },
            {
              text: '[{"name":"Cash","balance":121012,"eventCount":8},{"name":"Rent Expense","balance":30000,"eventCount":1},...',
            },
            { text: "" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/services/apps_backend -d host=specmatic-mock -d port=9091",
              tone: "muted",
            },
            { text: "host: specmatic-mock port: 9091", tone: "info" },
            {
              text: "$ curl -s -X PATCH http://localhost:8001/plugins/mock-demo-token -d enabled=true",
              tone: "muted",
            },
            { text: "enabled: true", tone: "info" },
            { text: "" },
            {
              text: "$ curl -s -H \"Authorization: Bearer $TOKEN\" http://localhost:8000/api/accounts",
              tone: "muted",
            },
            {
              text: '[{"name": "Cash", "balance": 120000, "eventCount": 3},',
              tone: "success",
            },
            {
              text: ' {"name": "Rent Expense", "balance": 30000, "eventCount": 1},',
              tone: "success",
            },
            {
              text: ' {"name": "Sales Revenue", "balance": 50000, "eventCount": 1}]',
              tone: "success",
            },
            {
              text: "  ^ Specmaticのモック — コントラクトのexample(毎回同じ値)で、実際の台帳ではない",
            },
          ],
        },
        imagesLayout: "stack",
        images: [
          {
            src: "/docs/screenshots/kong-frontend-via-mock.png",
            alt: "apps_backendをSpecmaticのモックへ向けた後のfrontendの勘定科目ページ。Via KongとVia Mockの両方にチェックが入り、勘定科目は3つだけ表示されている",
            caption: "差し替えてリロードした後: Via Mockにもチェックが入り、残高はモックのexampleデータになります。",
          },
        ],
        closing: [
          "frontendの画面でも同じことが分かります。編集後に勘定科目ページをリロードすると、Via Kongに加えて" +
            "Via Mockにもチェックが入り(Specmaticのモックは実backendが返さないX-Specmatic-Resultヘッダーを" +
            "付けるので、チェックボックスはそれを見ています)、残高の表がモックのexampleデータに切り替わります。" +
            "API endpointはhttp://localhost:8000/apiのままで、frontend自体には何も手を入れていません。",
        ],
      },
      {
        heading: "環境のクリーンアップ",
        body: [
          "このシナリオで起動したものをすべて停止します。Kongは最後に止め、その前にfrontendの接続先を" +
            "backend直結へ戻します — そうしないと、存在しなくなったゲートウェイを呼び続けてしまいます。",
        ],
        code: [
          {
            code:
              "# .env: APPS_API_BASEを削除(またはhttp://localhost:8080に戻す)\n" +
              "make apps:restart          # frontendを再作成して変更を反映\n" +
              "make specmatic:mock-down   # Specmaticのモックを起動した場合\n" +
              "make kong:down",
          },
        ],
      },
    ],
  },
};
