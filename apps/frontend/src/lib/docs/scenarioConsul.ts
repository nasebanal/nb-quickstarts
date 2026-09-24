import type { LocalizedDocsPage } from "./types";

export const scenarioConsul: LocalizedDocsPage = {
  en: {
    title: "Scenario 3: Consul - service discovery and load balancing",
    description:
      "Everything so far reached the backend at an address written into a config file (backend:8080). With " +
      "one instance that is fine. With several it is not: who lists them, who notices one has died, who " +
      "spreads the calls? This scenario runs several backend instances, has Consul health-check them, and " +
      "has the frontend's server ask Consul which are healthy - so instances can come and go with nothing " +
      "to edit. You can switch the frontend between a fixed address and Consul and watch the difference.",
    sections: [
      {
        heading: "Why Consul",
        body: [
          "Scenario 2 answered an overload by buffering: Kafka lets the backend take work at its own pace. " +
            "There is a second, complementary answer - give the work more backends to land on. This scenario " +
            "takes the same overload (section 7) and spreads it over several instances, with Consul keeping " +
            "track of which ones exist and are healthy.",
        ],
        bullets: [
          "A registry that reflects what is actually running: clients ask Consul which instances exist instead of keeping an address list in a config file.",
          "Health checks are part of the registry: Consul checks each instance itself, and one that stops answering drops out of the answer by itself and comes back when it recovers - nobody edits anything.",
          "Discovery is the building block, and load balancing is one thing built on it (here in the client; a gateway or proxy can do the same). Consul also offers DNS and HTTP interfaces, a key/value store and a service mesh, none of which this scenario needs.",
        ],
      },
      {
        heading: "How it works: register, check, ask, call",
        body: [
          "Each backend instance is registered under one service name, apps-backend, with its own address " +
            "and a health check; MySQL is registered too. Consul's agent runs those checks continuously. " +
            "A client that wants the backend - here the frontend's server - asks Consul who is healthy right " +
            "now, picks one, and calls it, on every request, so the answer is always current. There is no " +
            "backend address written anywhere in the client.",
        ],
        sequence: {
          summary:
            "Sequence diagram: Consul health-checks the backend instances and MySQL; on every request the frontend's server asks Consul for the healthy instances and calls one of them",
          participants: [
            { id: "client", label: "Frontend (server)", sub: "asks, then calls" },
            { id: "consul", label: "Consul", sub: "registry + health checks" },
            { id: "app", label: "Backend, MySQL", sub: "the instances" },
          ],
          steps: [
            { kind: "note", at: "consul", text: "Registered by make consul:register-apps" },
            {
              kind: "message",
              from: "consul",
              to: "app",
              text: "Health-check every instance (and MySQL)",
              detail: "GET /health every 2s  (one that fails is marked critical)",
            },
            {
              kind: "message",
              from: "client",
              to: "consul",
              text: "Which backends are healthy right now?",
              detail: "GET /v1/health/service/apps-backend?passing",
            },
            {
              kind: "message",
              from: "consul",
              to: "client",
              text: "The healthy instances",
              detail: "e.g. backend-1, backend-3  (a critical one is left out)",
              dashed: true,
            },
            {
              kind: "message",
              from: "client",
              to: "app",
              text: "Call one of them (round robin)",
              detail: "REST  ->  X-Served-By: backend-3",
            },
          ],
          frames: [{ from: 2, to: 4, label: "on every request" }],
        },
        note:
          "Which instance answered is read from the `X-Served-By` header the backend adds to every response " +
          "(from its `INSTANCE_ID`), not assumed from the address that was called. Registration is made by " +
          "`make consul:register-apps` (a call to Consul's HTTP API) rather than by the backend itself - the " +
          "same call either way.",
      },
      {
        heading: "1. Run several backends and register them",
        code: [
          {
            code:
              "make consul:up\n" +
              "APPS_BACKEND_INSTANCES=3 make apps:up   # or set APPS_BACKEND_INSTANCES=3 in .env\n" +
              "make consul:register-apps",
          },
        ],
        body: [
          "How many backend instances run is an apps setting, APPS_BACKEND_INSTANCES (default 1): apps' own " +
            "backend is instance 1 (backend-1) and backend-2, backend-3, ... are added from the same image, code " +
            "and database - the compose definition is generated for the number you ask for, by extending apps' " +
            "own backend service (apps/bin/compose.sh). consul:register-apps then registers whatever is " +
            "running, each with a health check.",
        ],
        terminal: {
          lines: [
            { text: "$ make consul:register-apps", tone: "muted" },
            { text: "Registering the running backend instances with Consul..." },
            { text: "  registered apps-backend-1 -> backend:8080" },
            { text: "  registered apps-backend-2 -> backend-2:8080" },
            { text: "  registered apps-backend-3 -> backend-3:8080" },
            { text: "  registered apps-mysql -> mysql-server:3306" },
            { text: "" },
            { text: "$ make consul:instances", tone: "muted" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  passing", tone: "success" },
            { text: "  apps-backend-3  backend-3:8080  passing", tone: "success" },
          ],
        },
        note:
          "Real output. Two things had to change in the backend for several instances to coexist: every " +
          "response now carries `X-Served-By`, and the mock login's token is signed and self-contained (an HMAC " +
          "over the username, with a secret every instance shares), so any instance can verify a token " +
          "another one issued - otherwise a login that landed on backend-1 would be rejected by backend-3. " +
          "(It used to be a JSON file shared between them; several instances writing it overwrote each " +
          "other's tokens.) Starting or reloading several at once also raced on creating the tables, which " +
          "a MySQL lock now serialises.",
      },
      {
        heading: "2. See the catalog",
        code: [{ code: "make consul:open   # Services -> apps-backend -> Instances\nmake consul:instances" }],
        images: [
          {
            src: "/docs/screenshots/consul-instances.png",
            alt: "Consul's UI on the apps-backend service's Instances tab: apps-backend-1, apps-backend-2 and apps-backend-3, each with all service checks and node checks passing",
            caption:
              "Consul's UI (http://localhost:8500): one service, apps-backend, and its three instances, all passing their health checks.",
          },
        ],
      },
      {
        heading: "3. A client that finds its backend through Consul",
        code: [{ code: "make consul:lb-demo" }],
        body: [
          "consul/bin/lb_demo.py is a small client. For every request it asks Consul for the healthy " +
            "apps-backend instances, takes them in turn, calls the chosen one, and prints who answered (the " +
            "`X-Served-By` header). The client contains no backend address at all - only \"ask Consul for " +
            "apps-backend\".",
        ],
        terminal: {
          lines: [
            { text: "$ make consul:lb-demo", tone: "muted" },
            { text: "#01  backend-1  HTTP 200    10ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#02  backend-2  HTTP 200    53ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#03  backend-3  HTTP 200    20ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#04  backend-1  HTTP 200     6ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "..." },
            { text: "" },
            { text: "Answered by:  backend-1: 4   backend-2: 4   backend-3: 4", tone: "success" },
            { text: "Retries: 0   Requests nobody answered: 0" },
          ],
        },
        note:
          "Real output (12 requests, abridged). `REQUESTS=30 INTERVAL=0.5 make consul:lb-demo` runs it longer.",
      },
      {
        heading: "4. Take an instance away",
        body: [
          "The point of a registry with health checks. Run the client for a while in one terminal, and " +
            "stop an instance from another:",
        ],
        code: [
          { label: "Terminal 1:", code: "make consul:lb-demo REQUESTS=24 INTERVAL=0.5" },
          { label: "Terminal 2, a few seconds in:", code: "docker stop nb-backend-2\nmake consul:instances" },
        ],
        terminal: {
          lines: [
            { text: "#03  backend-3  HTTP 200    69ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#04  backend-1  HTTP 200    13ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#05  backend-1  HTTP 200     3ms   healthy in Consul: backend-1, backend-3", tone: "info" },
            { text: "#06  backend-3  HTTP 200    11ms   healthy in Consul: backend-1, backend-3", tone: "info" },
            { text: "..." },
            { text: "Answered by:  backend-1: 12   backend-2: 1   backend-3: 11", tone: "success" },
            { text: "Retries: 0   Requests nobody answered: 0" },
            { text: "" },
            { text: "$ make consul:instances", tone: "muted" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  critical", tone: "error" },
            { text: "  apps-backend-3  backend-3:8080  passing", tone: "success" },
          ],
        },
        note:
          "Real output. Within one health-check interval (2s) Consul marks backend-2 critical and it vanishes " +
          "from the client's list - and not one request failed. Nobody edited a config file or restarted " +
          "anything. A request that hit the dead instance in the gap before Consul noticed would be retried " +
          "on the next healthy one (that is what \"Retries\" counts); this run never fell into that gap. " +
          "`docker start nb-backend-2` brings it back the same way, by itself.",
      },
      {
        heading: "5. Change the number of instances",
        body: [
          "How many run is one apps variable. Run apps:up again with another number and register again: " +
            "instances are added, or - going down - the ones no longer wanted are removed, and the catalog " +
            "follows. Nothing is edited.",
        ],
        code: [
          { label: "Five instances:", code: "APPS_BACKEND_INSTANCES=5 make apps:up\nmake consul:register-apps\nmake consul:lb-demo REQUESTS=10 INTERVAL=0.1" },
          { label: "Back down to two:", code: "APPS_BACKEND_INSTANCES=2 make apps:up\nmake consul:register-apps" },
        ],
        terminal: {
          lines: [
            { text: "$ APPS_BACKEND_INSTANCES=5 make apps:up && make consul:register-apps", tone: "muted" },
            { text: "  registered apps-backend-4 -> backend-4:8080" },
            { text: "  registered apps-backend-5 -> backend-5:8080" },
            { text: "" },
            { text: "$ make consul:lb-demo REQUESTS=10 INTERVAL=0.1", tone: "muted" },
            { text: "Answered by:  backend-1: 2   backend-2: 2   backend-3: 2   backend-4: 2   backend-5: 2", tone: "success" },
            { text: "" },
            { text: "$ APPS_BACKEND_INSTANCES=2 make apps:up && make consul:register-apps", tone: "muted" },
            { text: "  deregistered apps-backend-3 (no longer running)" },
            { text: "  deregistered apps-backend-4 (no longer running)" },
            { text: "  deregistered apps-backend-5 (no longer running)" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  passing", tone: "success" },
          ],
        },
        note:
          "Real output (abridged). The client was not touched between runs: it asked Consul each time and " +
          "used whatever was there - five instances, then two.",
      },
      {
        heading: "6. The frontend: a fixed address, or Consul",
        body: [
          "So far a script played the client. The frontend can do the same: with NEXT_PUBLIC_API_BASE=/api/backend " +
            "the browser calls the frontend's own server (app/api/backend), and that server finds the backend " +
            "and forwards the request - one of two ways, switchable at runtime: a fixed address " +
            "(BACKEND_DIRECT_URL, default backend:8080, always the same instance) or Consul (it asks for the " +
            "healthy apps-backend instances and takes them in turn, trying the next if one does not answer). " +
            "The accounts page shows which instance answered and has the switch. The mode is chosen, " +
            "not detected: consul mode does not fall back to the fixed address when Consul is down or lists " +
            "nothing - the call fails with a 502 saying so.",
        ],
        code: [
          {
            label: "Once: point the browser at the frontend's server (.env), then restart:",
            code: "NEXT_PUBLIC_API_BASE=/api/backend\n# make apps:restart",
          },
        ],
        table: {
          headers: ["Option (.env / environment)", "Default", "What it does"],
          rows: [
            ["APPS_BACKEND_INSTANCES", "1", "How many backend instances apps runs (apply with make apps:up; then make consul:register-apps)"],
            ["NEXT_PUBLIC_API_BASE", "http://localhost:8080", "Where the browser calls. /api/backend sends it through the frontend's server, which is the only path that can use Consul; the default calls the backend directly and skips both modes. Read when the frontend starts, so changing it needs make apps:restart (once)"],
            ["BACKEND_RESOLVER", "direct", "The mode a freshly started frontend server begins in: direct or consul. Switch at runtime from the accounts page (or PUT /api/resolver), no restart"],
            ["BACKEND_DIRECT_URL", "http://backend:8080", "The fixed address used in direct mode"],
            ["CONSUL_HTTP_ADDR", "http://consul:8500", "Where the frontend's server asks Consul in consul mode"],
          ],
        },
      },
      {
        heading: "Switch to Consul on the accounts page",
        body: [
          "That alone still uses the fixed address: the default mode is direct. Log in (demo / demo) and open the accounts page. Under the API endpoint (now /api/backend) is a panel showing which backend answered, with a switch between Fixed address and Consul. Click Consul.",
        ],
        images: [
          {
            src: "/docs/screenshots/frontend-routing-direct.png",
            alt: "The accounts page with Fixed address selected: the API endpoint is /api/backend, and the panel below says Served by backend, always backend:8080",
            caption: "Fixed address: every request is answered by the same backend. The panel under the API endpoint is the switch.",
          },
          {
            src: "/docs/screenshots/frontend-routing-consul.png",
            alt: "The accounts page with Consul selected: the panel lists the healthy instances Consul knows - backend-1, backend-2 and backend-3",
            caption: "Consul: the page polls once a second, and the answering instance rotates through backend-1, backend-2 and backend-3.",
          },
        ],
        code: [
          {
            label: "Or from the terminal:",
            code:
              "curl -X PUT -H 'content-type: application/json' -d '{\"mode\":\"consul\"}' localhost:5173/api/resolver\n" +
              "curl -i localhost:5173/api/backend/health   # X-Resolved-Via: consul, X-Served-By rotates",
          },
        ],
      },
      {
        heading: "Fixed address versus Consul, when an instance dies",
        body: [
          "The difference shows when the fixed address's instance goes away. Stop the backend the " +
            "fixed address points at, and call through the frontend in each mode:",
        ],
        terminal: {
          lines: [
            { text: "$ docker stop nb-backend      # the backend the fixed address points at", tone: "muted" },
            { text: "[direct]" },
            { text: "HTTP/1.1 502 Bad Gateway", tone: "error" },
            { text: "HTTP/1.1 502 Bad Gateway", tone: "error" },
            { text: "[consul]" },
            { text: "HTTP/1.1 200 OK  x-resolved-via: consul  x-served-by: backend-3", tone: "success" },
            { text: "HTTP/1.1 200 OK  x-resolved-via: consul  x-served-by: backend-2", tone: "success" },
          ],
        },
        note:
          "Real output (`curl -i localhost:5173/api/backend/health`). With a fixed address, one dead instance " +
          "is an outage; with Consul it is a shorter list. A stopped instance drops out of Consul's answer, " +
          "and the frontend server also tries the next instance if one fails mid-request.",
      },
      {
        heading: "7. The same overload, spread over three instances",
        body: [
          "Scenario 2's overload - hundreds of users hammering POST /accounts with no wait - ran against one " +
            "backend. locustfile_http_overload_consul.py is the same load spread over every healthy instance " +
            "Consul knows (the list is refreshed every couple of seconds). Same settings for both:",
        ],
        code: [
          {
            code:
              "make locust:test LOCUST_FILE=locustfile_http_overload.py        LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s   # one backend\n" +
              "make locust:test LOCUST_FILE=locustfile_http_overload_consul.py LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s   # three, via Consul",
          },
        ],
        table: {
          headers: ["600 users / 60s", "Requests completed", "Failures", "Median"],
          rows: [
            ["One backend", "12 (logins only; no POST /accounts finished)", "0", "5.1 s (login)"],
            ["Three, via Consul", "1,170 (600 logins + 570 POST /accounts)", "0", "0.68 s (POST /accounts)"],
          ],
        },
        note:
          "Real runs, one after the other. The honest reading: three instances did not turn errors into " +
          "success so much as let the work finish - in the same minute one backend completed almost nothing " +
          "while three completed everything that was asked. No failures were *counted* in either run: the " +
          "single backend's requests were still waiting when the minute ended, and Locust records a failure " +
          "only when a request ends in one. Scenario 2's recorded failure rates for one backend come from " +
          "before the demo login required a password (which makes each login cost CPU), so they are not " +
          "directly comparable with this run.",
      },
      {
        heading: "What this does not cover",
        bullets: [
          "The browser still cannot ask Consul: the frontend's calls go to its own server, which asks. Putting a gateway in front instead (a gateway such as Kong can be set up to resolve its upstream through Consul) is not done here and has not been verified.",
          "The backend's connection to MySQL is not balanced - a database needs a primary for writes, so it is not a plain round robin. (Consul does health-check MySQL.)",
          "The catalog lives in one Consul agent here (dev setup); a real deployment runs a cluster.",
        ],
      },
      {
        heading: "Cleanup",
        code: [
          {
            code:
              "# .env: remove NEXT_PUBLIC_API_BASE=/api/backend (or set it back to http://localhost:8080)\n" +
              "make consul:deregister-apps\n" +
              "APPS_BACKEND_INSTANCES=1 make apps:up   # back to one backend\n" +
              "make consul:down",
          },
        ],
      },
    ],
  },
  ja: {
    title: "シナリオ3: Consulによる負荷分散",
    description:
      "これまでは、設定ファイルに書いたアドレス(backend:8080)でbackendに到達していました。インスタンスが1つなら" +
      "それで足ります。複数になると足りません: 誰がそれらを一覧し、誰が死んだものに気づき、誰が呼び出しを" +
      "振り分けるのか。このシナリオではbackendを複数インスタンス動かし、Consulにヘルスチェックさせ、" +
      "frontendのサーバーが健全なものをConsulに尋ねるようにします — インスタンスが増減しても、編集するものは" +
      "何もありません。frontendを「固定アドレス」と「Consul」で切り替えて、違いを見られます。",
    sections: [
      {
        heading: "Consulを使うメリット",
        body: [
          "シナリオ2は、過負荷をバッファリングで受け止めました: Kafkaにより、backendは自分のペースで仕事を取り込めます。" +
            "もう1つ、補完的な答えがあります — 仕事の着地先となるbackendを増やすことです。このシナリオでは、同じ過負荷" +
            "(セクション7)を複数のインスタンスに分散し、どれが存在して健全かをConsulに管理させます。",
        ],
        bullets: [
          "実際に動いているものを反映するレジストリ: クライアントは、設定ファイルにアドレス一覧を持つ代わりに、どのインスタンスがあるかをConsulに尋ねます。",
          "ヘルスチェックがレジストリの一部: Consul自身が各インスタンスをチェックし、応答しなくなったものは回答から自動で外れ、回復すれば自動で戻ります — 誰も何も編集しません。",
          "検出は土台であり、負荷分散はその上に作れるものの1つです(ここではクライアント側で行いますが、ゲートウェイやプロキシでも同じことができます)。ConsulにはDNS・HTTPのインターフェース、キー/バリューストア、サービスメッシュもありますが、このシナリオでは使いません。",
        ],
      },
      {
        heading: "仕組み: 登録・チェック・問い合わせ・呼び出し",
        body: [
          "各backendインスタンスは、1つのサービス名apps-backendの下に、自分のアドレスとヘルスチェックを持って" +
            "登録されます(MySQLも登録されます)。Consulのエージェントがそのチェックを常に実行します。" +
            "backendを使いたいクライアント — ここではfrontendのサーバー — は、今この時点で健全なものをConsulに" +
            "尋ね、その1つを選んで呼び出します。リクエストのたびに行うので、回答は常に最新です。" +
            "クライアントのどこにもbackendのアドレスは書かれていません。",
        ],
        sequence: {
          summary:
            "シーケンス図: Consulがbackendの各インスタンスとMySQLをヘルスチェックし、リクエストのたびにfrontendのサーバーが健全なインスタンスをConsulへ問い合わせて、そのうち1つを呼び出す流れ",
          participants: [
            { id: "client", label: "Frontend(サーバー)", sub: "尋ねてから呼ぶ" },
            { id: "consul", label: "Consul", sub: "レジストリ + ヘルスチェック" },
            { id: "app", label: "Backend、MySQL", sub: "各インスタンス" },
          ],
          steps: [
            { kind: "note", at: "consul", text: "make consul:register-appsで登録済み" },
            {
              kind: "message",
              from: "consul",
              to: "app",
              text: "全インスタンス(とMySQL)をヘルスチェック",
              detail: "GET /health を2秒ごと (失敗したものはcriticalになる)",
            },
            {
              kind: "message",
              from: "client",
              to: "consul",
              text: "今、健全なbackendはどれ?",
              detail: "GET /v1/health/service/apps-backend?passing",
            },
            {
              kind: "message",
              from: "consul",
              to: "client",
              text: "健全なインスタンス",
              detail: "例: backend-1, backend-3 (criticalのものは除かれる)",
              dashed: true,
            },
            {
              kind: "message",
              from: "client",
              to: "app",
              text: "そのうち1つを呼ぶ(ラウンドロビン)",
              detail: "REST  ->  X-Served-By: backend-3",
            },
          ],
          frames: [{ from: 2, to: 4, label: "リクエストのたびに" }],
        },
        note:
          "どのインスタンスが応答したかは、呼び出したアドレスから推測するのではなく、backendがすべての応答に付ける" +
          "`X-Served-By`ヘッダー(`INSTANCE_ID`の値)から読み取っています。登録はbackend自身ではなく" +
          "`make consul:register-apps`(ConsulのHTTP APIの呼び出し)が行います — どちらでも同じ呼び出しです。",
      },
      {
        heading: "1. backendを複数動かして登録する",
        code: [
          {
            code:
              "make consul:up\n" +
              "APPS_BACKEND_INSTANCES=3 make apps:up   # または.envでAPPS_BACKEND_INSTANCES=3\n" +
              "make consul:register-apps",
          },
        ],
        body: [
          "backendを何インスタンス動かすかは、appsの設定APPS_BACKEND_INSTANCES(デフォルト1)です: appsのbackendが" +
            "インスタンス1(backend-1)で、backend-2、backend-3、...は、同じイメージ・コード・データベースで追加されます — " +
            "composeの定義は指定した数に合わせて、appsのbackendサービスを継承する形で生成されます" +
            "(apps/bin/compose.sh)。consul:register-appsは、動いているものをそれぞれヘルスチェック付きで登録します。",
        ],
        terminal: {
          lines: [
            { text: "$ make consul:register-apps", tone: "muted" },
            { text: "Registering the running backend instances with Consul..." },
            { text: "  registered apps-backend-1 -> backend:8080" },
            { text: "  registered apps-backend-2 -> backend-2:8080" },
            { text: "  registered apps-backend-3 -> backend-3:8080" },
            { text: "  registered apps-mysql -> mysql-server:3306" },
            { text: "" },
            { text: "$ make consul:instances", tone: "muted" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  passing", tone: "success" },
            { text: "  apps-backend-3  backend-3:8080  passing", tone: "success" },
          ],
        },
        note:
          "実際の出力です。複数インスタンスを共存させるために、backend側で変えたことがあります: すべての応答に" +
          "`X-Served-By`を付けることと、モックログインのトークンを署名付きの自己完結型にすること(ユーザー名に対する" +
          "HMACで、秘密鍵は全インスタンスで共通)です。これで、あるインスタンスが発行したトークンを、別の" +
          "インスタンスが単独で検証できます — そうしないと、backend-1で行ったログインがbackend-3で拒否されて" +
          "しまいます。(以前はインスタンス間で共有するJSONファイルでしたが、複数のインスタンスが書き込むと、" +
          "互いのトークンを上書きしてしまいました。)複数を同時に起動・再読み込みするとテーブル作成でも競合したため、" +
          "今はMySQLのロックで直列化しています。",
      },
      {
        heading: "2. カタログを見る",
        code: [{ code: "make consul:open   # Services -> apps-backend -> Instances\nmake consul:instances" }],
        images: [
          {
            src: "/docs/screenshots/consul-instances.png",
            alt: "ConsulのUIでapps-backendサービスのInstancesタブ。apps-backend-1・apps-backend-2・apps-backend-3の3つが並び、それぞれのサービスチェックとノードチェックがすべてpassingになっている",
            caption:
              "ConsulのUI(http://localhost:8500): 1つのサービスapps-backendと、その3インスタンスがすべてヘルスチェックに合格している。",
          },
        ],
      },
      {
        heading: "3. Consul経由でbackendを見つけるクライアント",
        code: [{ code: "make consul:lb-demo" }],
        body: [
          "consul/bin/lb_demo.pyは小さなクライアントです。リクエストのたびに、健全なapps-backendの" +
            "インスタンスをConsulに尋ね、順番に取り、選んだものを呼び出し、誰が応答したか(`X-Served-By`ヘッダー)を" +
            "表示します。クライアントにbackendのアドレスは一切なく、「Consulにapps-backendを尋ねる」だけです。",
        ],
        terminal: {
          lines: [
            { text: "$ make consul:lb-demo", tone: "muted" },
            { text: "#01  backend-1  HTTP 200    10ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#02  backend-2  HTTP 200    53ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#03  backend-3  HTTP 200    20ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#04  backend-1  HTTP 200     6ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "..." },
            { text: "" },
            { text: "Answered by:  backend-1: 4   backend-2: 4   backend-3: 4", tone: "success" },
            { text: "Retries: 0   Requests nobody answered: 0" },
          ],
        },
        note:
          "実際の出力(12リクエスト、省略あり)です。`REQUESTS=30 INTERVAL=0.5 make consul:lb-demo`でもっと長く実行できます。",
      },
      {
        heading: "4. インスタンスを1つ取り除く",
        body: [
          "ヘルスチェック付きレジストリの要点です。片方のターミナルでクライアントをしばらく動かし、もう片方から" +
            "インスタンスを1つ止めます:",
        ],
        code: [
          { label: "ターミナル1:", code: "make consul:lb-demo REQUESTS=24 INTERVAL=0.5" },
          { label: "ターミナル2(数秒後に):", code: "docker stop nb-backend-2\nmake consul:instances" },
        ],
        terminal: {
          lines: [
            { text: "#03  backend-3  HTTP 200    69ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#04  backend-1  HTTP 200    13ms   healthy in Consul: backend-1, backend-2, backend-3" },
            { text: "#05  backend-1  HTTP 200     3ms   healthy in Consul: backend-1, backend-3", tone: "info" },
            { text: "#06  backend-3  HTTP 200    11ms   healthy in Consul: backend-1, backend-3", tone: "info" },
            { text: "..." },
            { text: "Answered by:  backend-1: 12   backend-2: 1   backend-3: 11", tone: "success" },
            { text: "Retries: 0   Requests nobody answered: 0" },
            { text: "" },
            { text: "$ make consul:instances", tone: "muted" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  critical", tone: "error" },
            { text: "  apps-backend-3  backend-3:8080  passing", tone: "success" },
          ],
        },
        note:
          "実際の出力です。ヘルスチェックの間隔(2秒)以内にConsulがbackend-2をcriticalにし、クライアントの一覧から" +
          "消えます — しかも失敗したリクエストは1件もありません。設定ファイルの編集も、何かの再起動も、誰も" +
          "していません。Consulが気づくまでの隙間に死んだインスタンスへ当たったリクエストは、次の健全なものに" +
          "再試行されます(「Retries」が数えるのはそれです)が、この実行ではその隙間には入りませんでした。" +
          "`docker start nb-backend-2`で、同じように自動で戻ります。",
      },
      {
        heading: "5. インスタンス数を変える",
        body: [
          "動かす数はappsの1つの変数です。別の数でapps:upをもう一度実行し、もう一度登録してください: インスタンスが" +
            "追加され、減らす場合は不要になったものが削除されて、カタログが追従します。何も編集しません。",
        ],
        code: [
          { label: "5インスタンス:", code: "APPS_BACKEND_INSTANCES=5 make apps:up\nmake consul:register-apps\nmake consul:lb-demo REQUESTS=10 INTERVAL=0.1" },
          { label: "2インスタンスに戻す:", code: "APPS_BACKEND_INSTANCES=2 make apps:up\nmake consul:register-apps" },
        ],
        terminal: {
          lines: [
            { text: "$ APPS_BACKEND_INSTANCES=5 make apps:up && make consul:register-apps", tone: "muted" },
            { text: "  registered apps-backend-4 -> backend-4:8080" },
            { text: "  registered apps-backend-5 -> backend-5:8080" },
            { text: "" },
            { text: "$ make consul:lb-demo REQUESTS=10 INTERVAL=0.1", tone: "muted" },
            { text: "Answered by:  backend-1: 2   backend-2: 2   backend-3: 2   backend-4: 2   backend-5: 2", tone: "success" },
            { text: "" },
            { text: "$ APPS_BACKEND_INSTANCES=2 make apps:up && make consul:register-apps", tone: "muted" },
            { text: "  deregistered apps-backend-3 (no longer running)" },
            { text: "  deregistered apps-backend-4 (no longer running)" },
            { text: "  deregistered apps-backend-5 (no longer running)" },
            { text: "  apps-backend-1  backend:8080  passing", tone: "success" },
            { text: "  apps-backend-2  backend-2:8080  passing", tone: "success" },
          ],
        },
        note:
          "実際の出力(省略あり)です。実行の合間にクライアントには一切手を入れていません: 毎回Consulに尋ねて、その時に" +
          "あるものを使っただけです — 5インスタンスのときも、2インスタンスのときも。",
      },
      {
        heading: "6. frontend: 固定アドレスか、Consulか",
        body: [
          "ここまでは、スクリプトがクライアント役でした。frontendも同じことができます: NEXT_PUBLIC_API_BASE=/api/backend" +
            "にすると、ブラウザはfrontend自身のサーバー(app/api/backend)を呼び、そのサーバーがbackendを見つけて" +
            "リクエストを転送します — 見つけ方は実行時に切り替えられる2通りです: 固定アドレス" +
            "(BACKEND_DIRECT_URL、デフォルトはbackend:8080、常に同じインスタンス)か、Consul(健全なapps-backendの" +
            "インスタンスを尋ねて順番に取り、応答しなければ次を試す)。口座画面には、応答したインスタンスの表示と、" +
            "その切り替えがあります。モードは検出ではなく選択です: consulモードでは、Consulが止まっていたり" +
            "一覧が空だったりしても固定アドレスへは切り替わらず、その旨を示す502で失敗します。",
        ],
        code: [
          {
            label: "最初に1回: ブラウザの向き先をfrontendのサーバーにする(.env)。そして再起動:",
            code: "NEXT_PUBLIC_API_BASE=/api/backend\n# make apps:restart",
          },
        ],
        table: {
          headers: ["オプション(.env / 環境変数)", "デフォルト", "内容"],
          rows: [
            ["APPS_BACKEND_INSTANCES", "1", "appsが動かすbackendのインスタンス数(make apps:upで反映し、make consul:register-appsで登録)"],
            ["NEXT_PUBLIC_API_BASE", "http://localhost:8080", "ブラウザの呼び出し先。/api/backendにするとfrontendのサーバー経由になり、Consulを使えるのはこの経路だけです。デフォルトはbackendを直接呼び、どちらのモードも通りません。frontendの起動時に読まれるので、変更後はmake apps:restartが必要です(最初の1回)"],
            ["BACKEND_RESOLVER", "direct", "frontendサーバーが起動した直後のモード: directまたはconsul。実行時は口座画面(またはPUT /api/resolver)で切り替えられ、再起動は不要です"],
            ["BACKEND_DIRECT_URL", "http://backend:8080", "directモードで使う固定アドレス"],
            ["CONSUL_HTTP_ADDR", "http://consul:8500", "consulモードで、frontendのサーバーがConsulに問い合わせる先"],
          ],
        },
      },
      {
        heading: "口座画面でConsulに切り替える",
        body: [
          "これだけでは、まだ固定アドレスのままです(既定のモードはdirect)。ログイン(demo / demo)して口座画面を開くと、呼び出し先API(今は/api/backend)の下に、応答したbackendの表示と、固定アドレスとConsulの切り替えがあります。Consulを押してください。",
        ],
        images: [
          {
            src: "/docs/screenshots/frontend-routing-direct.png",
            alt: "「固定アドレス」を選んだ口座画面。呼び出し先APIは/api/backendで、その下のパネルに、応答したbackendと、常に向いている固定アドレスbackend:8080が表示されている",
            caption: "固定アドレス: どのリクエストも、同じbackendが応答する。呼び出し先APIの下のパネルが切り替えです。",
          },
          {
            src: "/docs/screenshots/frontend-routing-consul.png",
            alt: "「Consul」を選んだ口座画面。パネルに、Consulが把握する健全なbackend-1・backend-2・backend-3が表示されている",
            caption: "Consul: 画面は毎秒ポーリングし、応答するインスタンスがbackend-1・backend-2・backend-3を順に巡る。",
          },
        ],
        code: [
          {
            label: "ターミナルからなら:",
            code:
              "curl -X PUT -H 'content-type: application/json' -d '{\"mode\":\"consul\"}' localhost:5173/api/resolver\n" +
              "curl -i localhost:5173/api/backend/health   # X-Resolved-Via: consul, X-Served-By rotates",
          },
        ],
      },
      {
        heading: "インスタンスが死んだとき: 固定アドレスとConsulの違い",
        body: [
          "違いは、固定アドレスの先のインスタンスが消えたときに出ます。固定アドレスが指しているbackendを止めて、" +
            "それぞれのモードでfrontend経由で呼びます:",
        ],
        terminal: {
          lines: [
            { text: "$ docker stop nb-backend      # 固定アドレスの向き先のbackend", tone: "muted" },
            { text: "[direct]" },
            { text: "HTTP/1.1 502 Bad Gateway", tone: "error" },
            { text: "HTTP/1.1 502 Bad Gateway", tone: "error" },
            { text: "[consul]" },
            { text: "HTTP/1.1 200 OK  x-resolved-via: consul  x-served-by: backend-3", tone: "success" },
            { text: "HTTP/1.1 200 OK  x-resolved-via: consul  x-served-by: backend-2", tone: "success" },
          ],
        },
        note:
          "実際の出力(`curl -i localhost:5173/api/backend/health`)です。固定アドレスでは、1インスタンスの死は" +
          "そのまま障害です。Consulなら、一覧が1つ短くなるだけです。止まったインスタンスはConsulの回答から外れ、" +
          "frontendサーバーは、リクエストの途中で失敗した場合にも、次のインスタンスを試します。",
      },
      {
        heading: "7. 同じ過負荷を、3インスタンスに分散する",
        body: [
          "シナリオ2の過負荷 — 数百ユーザーが待ち時間なしでPOST /accountsを叩く — は、1つのbackendに対して" +
            "実行していました。locustfile_http_overload_consul.pyは、同じ負荷を、Consulが知る健全な全インスタンスに" +
            "分散します(一覧は数秒ごとに更新)。両方とも同じ設定です:",
        ],
        code: [
          {
            code:
              "make locust:test LOCUST_FILE=locustfile_http_overload.py        LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s   # backend 1つ\n" +
              "make locust:test LOCUST_FILE=locustfile_http_overload_consul.py LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s   # 3つ、Consul経由",
          },
        ],
        table: {
          headers: ["600ユーザー / 60秒", "完了したリクエスト", "失敗", "中央値"],
          rows: [
            ["backend 1つ", "12(ログインのみ。POST /accountsは1件も完了せず)", "0", "5.1秒(ログイン)"],
            ["3つ、Consul経由", "1,170(ログイン600 + POST /accounts 570)", "0", "0.68秒(POST /accounts)"],
          ],
        },
        note:
          "続けて実行した、実際の結果です。正直な読み方: 3インスタンスは、エラーを成功に変えたというより、仕事を" +
          "終わらせられるようにしました — 同じ1分間に、backend 1つはほとんど何も完了せず、3つは要求された" +
          "すべてを完了しました。どちらの実行でも、数えられた失敗は0件です: backend 1つの側は、1分が終わった時点で" +
          "リクエストがまだ待たされていて、Locustは、リクエストが失敗で終わったときにだけ失敗を記録するためです。" +
          "シナリオ2に記録している、backend 1つでの失敗率は、デモログインにパスワードが必要になる前(ログインごとに" +
          "CPUを使うようになる前)のものなので、この実行とは直接比較できません。",
      },
      {
        heading: "このシナリオがカバーしないこと",
        bullets: [
          "ブラウザは、今もConsulに問い合わせられません: frontendの呼び出しは、frontend自身のサーバーに向かい、そこが尋ねます。代わりにゲートウェイを前段に置く構成(Kongなどのゲートウェイは、Consul経由で上流を解決する構成にできます)は、ここでは行っておらず、検証もしていません。",
          "backendのMySQLへの接続は分散していません — データベースは書き込みにプライマリが必要なため、単純なラウンドロビンにはなりません。(ConsulはMySQLのヘルスチェックはしています。)",
          "カタログは、ここでは1つのConsulエージェント(開発用構成)にあります。実運用ではクラスタで動かします。",
        ],
      },
      {
        heading: "片付け",
        code: [
          {
            code:
              "# .env: NEXT_PUBLIC_API_BASE=/api/backendを削除(またはhttp://localhost:8080に戻す)\n" +
              "make consul:deregister-apps\n" +
              "APPS_BACKEND_INSTANCES=1 make apps:up   # backend 1つに戻す\n" +
              "make consul:down",
          },
        ],
      },
    ],
  },
};
