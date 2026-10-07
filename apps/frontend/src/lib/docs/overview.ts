import type { LocalizedDocsPage } from "./types";

// The Overview has five parts, in this order: the purpose of NASEBANAL Quickstarts, its structure
// (the paragraphs read the diagrams, which app/docs/page.tsx renders into the "architecture" slot),
// the demo app's own event-sourced data model (its own diagram, the "eventSourcing" slot), its JWT
// authentication (a sample token and a sequence diagram), and the functional-verification scenarios, one
// short description each. Scenario 1 verifies the demo app with the test tools; scenarios 2-7 each
// switch on one of the dashed integrations. Headings
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
            "through agentgateway.",
        ],
        slot: "architecture",
      },
      {
        heading: "The demo app's data model: event sourcing",
        body: [
          "Event sourcing stores every change as its own immutable event, appended to a log, rather than " +
            "overwriting a single current-value row in place. The current value, when needed, is derived by " +
            "replaying (or, here, summing) the events that led to it - the log is the source of truth, not a " +
            "snapshot of it.",
          "The demo app applies this directly: the backend never updates a stored balance. " +
            "POST /transactions appends one signed-delta event (e.g. -30000 to record an expense) to an " +
            "append-only ledger, and GET /accounts derives each name's current balance by summing every " +
            "event recorded for it - the same one write path every client uses, whichever module it comes from. " +
            "/accounts is a read-only view built from it, never written to directly.",
        ],
        slot: "eventSourcing",
      },
      {
        heading: "Authentication with JWT",
        body: [
          "The demo app authenticates its API with JWT (JSON Web Token, RFC 7519). Every route - REST, GraphQL and MCP - needs an access token, except the few that must be reachable without one: login, the health check and the JWKS.",
          "Authentication with JWT usually involves three roles: the client (a browser, for one), the authentication server that creates the JWT, and the resource server (the Backend) that verifies the JWT and serves the API. The authentication server accepts the login and signs the JWT with its private key; the resource server verifies that JWT with the authentication server's public key (JWKS). In general, the authentication server and the resource server are set up separately.",
          "By default this app has no separate authentication server: the Backend process plays both roles - the authentication server (login, signing the JWT, publishing the public key) and the resource server (verifying the JWT, serving the API). Using Keycloak instead is covered in [Scenario 4](/docs/scenario-keycloak).",
        ],
        slot: "jwtRoles",
        subsections: [
          {
            heading: "The structure of a JWT",
            body: [
              "A JWT is one string made of three parts - header, payload and signature - joined by dots. Below, the three parts are explained one by one using the fixed demo token this app actually uses, and then put together into one JWT.",
            ],
          },
          {
            heading: "Header",
            body: [
              "The header is JSON that says how the token is signed: the algorithm (alg, RS256 here) and the id of the signing key (kid), which tells a verifier which key of the JWKS to use. Encoded in base64url, it becomes the 1st part of the JWT.",
            ],
            code: [
              {
                label: "The fixed demo token's header (JSON):",
                code: '{\n  "alg": "RS256",\n  "kid": "mXfbNPAfKC4MCud0",\n  "typ": "JWT"\n}',
              },
            ],
          },
          {
            heading: "Payload (claims)",
            body: [
              "The payload is JSON that holds the contents of the token, called claims: who the token is for (sub), who issued it (iss), which API it is meant for (aud), when it was issued (iat) and when it expires (exp). Encoded in base64url, it becomes the 2nd part. It is only encoded, not encrypted, so anyone holding the token can read it - no secret belongs in it.",
            ],
            code: [
              {
                label: "The fixed demo token's payload (JSON):",
                code: '{\n  "iss": "http://localhost:8080",\n  "sub": "demo",\n  "preferred_username": "demo",\n  "aud": "nb-quickstarts-api",\n  "iat": 1767225600,\n  "exp": 253370764800\n}',
              },
            ],
          },
          {
            heading: "Signature",
            body: [
              "The signature proves that the token was issued by the authentication server and was not changed on the way. At login the authentication server computes it in two steps: it hashes the header and the payload (as base64url text, joined by a dot) with SHA-256, then signs that hash with its private key (RS256). It is a signature, not encryption: the first two parts stay readable, and changing a single character of either changes the hash, so the signature no longer matches.",
            ],
            code: [
              {
                label:
                  "Creating the signature - at login, by the authentication server:",
                code: 'Step 1  Prepare the input\n        input = base64url(header) + "." + base64url(payload)\nStep 2  Hash the input\n        hash = SHA-256(input)\nStep 3  Sign the hash with the private key\n        signature = RS256_sign(private_key, hash)\nStep 4  Encode it as the JWT\'s 3rd part\n        base64url(signature) = UyiPk2jO5eUHGQT3cx3dauWU...   (shortened here)',
              },
              {
                label:
                  "Verifying the signature - on every request, by the resource server:",
                code: 'Step 1  Split the token at the dots into its three parts\nStep 2  Hash the first two parts exactly as they appear in the token\n        (still base64url text - not decoded)\n        A = SHA-256(1st_part + "." + 2nd_part)\nStep 3  Decode the 3rd part from base64url and recover the signed hash\n        with the public key\n        B = recover_hash(public_key, base64url_decode(3rd_part))\nStep 4  Compare\n        A == B  ->  genuine and unchanged\n        A != B  ->  401',
              },
            ],
            closing: [
              "The public key is used only to recover the hash from the signature. And since a public key cannot create a signature, publishing it (at /.well-known/jwks.json) does not let anyone forge a token. Nothing is stored or looked up for the token, so a login costs no database round-trip and any service holding the public key can verify a token on its own.",
            ],
          },
          {
            heading: "The finished JWT",
            body: [
              "The three parts, each in base64url, joined by dots, make up the JWT. This is the whole fixed demo token (shown here on separate lines for reading; it is one string). The JWT the authentication server returns at login has the same shape.",
            ],
            code: [
              {
                label: "header . payload . signature",
                code: "eyJhbGciOiJSUzI1NiIsImtpZCI6Im1YZmJOUEFmS0M0TUN1ZDAiLCJ0eXAiOiJKV1QifQ.\neyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJzdWIiOiJkZW1vIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZGVtbyIsImF1ZCI6Im5iLXF1aWNrc3RhcnRzLWFwaSIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjoyNTMzNzA3NjQ4MDB9.\nUyiPk2jO5eUHGQT3cx3dauWU...",
              },
            ],
            noteTitle: "About the fixed demo token",
            note: "This repository issues a fixed demo token for use in tests (contract tests, the mock, the MCP Inspector's config and so on). The fixed demo token and the signing key are in the repository, so anyone can create the same token. The fixed demo token is long-lived: its exp is in the year 9999 (a token a login hands out has the same shape, but expires a day later). Fixed tokens like this are generally expected to be limited to development and test environments. It is recommended not to issue a token like the fixed demo token in production, where each environment has its own keys and production verifies tokens only against its own key.",
          },
          {
            heading: "The authentication flow",
            body: [
              "The client gets the JWT at login and sends it with every later request. The token is issued by the authentication server, and the resource server, which serves the API, verifies it each time.",
            ],
            sequence: {
              summary:
                "Sequence diagram: the client logs in and the authentication server (which the Backend process also is) signs a JWT with its private key and returns it; on every later request the client sends the JWT as a bearer token and the resource server (the Backend) verifies the signature and claims with the public key, answering 200 or 401.",
              participants: [
                { id: "cl", label: "Client", sub: "browser / curl" },
                {
                  id: "auth",
                  label: "Authentication server",
                  sub: "also the Backend process",
                },
                {
                  id: "app",
                  label: "Resource server",
                  sub: "Backend (REST API)",
                },
              ],
              steps: [
                {
                  kind: "message",
                  from: "cl",
                  to: "auth",
                  text: "Log in",
                  detail: "POST /auth/login  {username, password}",
                },
                {
                  kind: "note",
                  at: "auth",
                  text: "Checks the password (401 if it does not match), then signs the claims with the private key",
                },
                {
                  kind: "message",
                  from: "auth",
                  to: "cl",
                  text: "Returns the JWT",
                  detail: '{"token": "eyJhbGci..."}',
                  dashed: true,
                },
                {
                  kind: "message",
                  from: "cl",
                  to: "app",
                  text: "Calls the API with the token",
                  detail: "Authorization: Bearer eyJhbGci...",
                },
                {
                  kind: "note",
                  at: "app",
                  text: "Verifies the signature with the public key, then iss, aud and exp - no database lookup",
                },
                {
                  kind: "message",
                  from: "app",
                  to: "cl",
                  text: "200 with the data - or 401 if any check fails",
                  dashed: true,
                },
              ],
              frames: [
                { from: 0, to: 2, label: "1. Log in (the token is issued)" },
                {
                  from: 3,
                  to: 5,
                  label: "2. Every later request (the token is verified)",
                },
              ],
            },
            closing: [
              'Once the signature checks out, the claims can be trusted. The resource server confirms the token is valid with iss (issued by the trusted authentication server), aud (meant for this API) and exp (not expired), and treats sub (here demo) as the user who made the request - GET /me, for one, returns the profile of that sub. Today the token carries no role or permission claim, so the resource server\'s authorization stops at "a valid token for a known user"; splitting operations by role would mean adding a role claim and checking it.',
            ],
          },
        ],
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
              "Places Kafka in front of the write path: kafka-bridge reads events from a topic and forwards each one to the backend through POST /transactions, the same write every other client uses. The same Locust load is sent down two paths - direct REST, which errors under the burst, and through Kafka - and the measured results are compared.",
            ],
          },
          {
            heading: "Scenario 4: Use Keycloak",
            href: "/docs/scenario-keycloak",
            body: [
              "Replaces the mock login with a real one: the login page gains a Keycloak option (with sign-up), the user authenticates at Keycloak, and the backend accepts the token Keycloak issued on the same POST /transactions route. The scenario then confirms that the backend performs the check.",
            ],
          },
          {
            heading: "Scenario 5: Use Vault",
            href: "/docs/scenario-vault",
            body: [
              "Removes the database password from the backend's configuration: the backend requests a credential from Vault at startup, and Vault creates a short-lived MySQL user for it on demand. The scenario shows the backend failing without Vault and working with it, then inspects the users Vault created.",
            ],
          },
          {
            heading: "Scenario 6: MCP access via agentgateway",
            href: "/docs/scenario-agentgateway",
            body: [
              "Provides a second route to the backend as MCP tools. Besides the backend's own /mcp, agentgateway builds MCP tools solely from the OpenAPI contract (openapi.yaml). A tool is called through the gateway and from a real MCP client, and the gateway's dashboard is reviewed.",
            ],
          },
          {
            heading: "Scenario 7: Observability",
            href: "/docs/scenario-observability",
            body: [
              "Enables the backend's OpenTelemetry export (traces, metrics and logs; off by default) and runs an HTTP overload while it is observed live in Grafana. The same run triggers alert rules that Alertmanager routes as notifications, a log line in Loki links to the trace of the request behind it, and Kong and agentgateway export telemetry as well.",
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
            "またはオプションでagentgatewayを経由してbackendに届きます。",
        ],
        slot: "architecture",
      },
      {
        heading: "デモアプリのデータモデル: イベントソーシング",
        body: [
          "イベントソーシングとは、変更のたびに、現在値を持つ1行をその場で上書きするのではなく、変更それ自体を" +
            "不変のイベントとしてログに追記していく方式です。現在値が必要になったときは、そこに至った" +
            "イベント群を再生(ここでは合計)して導出します — 真実の情報源はスナップショットではなく、ログそのものです。",
          "デモアプリはこれをそのまま実装しています。backendは残高を直接更新しません。" +
            "POST /transactionsは、符号付きの差分イベント(例: 支出の記録には-30000)を1件、追記専用の台帳に" +
            "追加し、GET /accountsは各名称に記録された全イベントの合計として現在の残高を導出します — " +
            "どのモジュールから呼ばれても、書き込みはこの1本の経路だけです。/accountsはそこから作られる" +
            "読み取り専用のビューで、直接書き込まれることはありません。",
        ],
        slot: "eventSourcing",
      },
      {
        heading: "JWTによる認証",
        body: [
          "デモアプリは、APIの認証にJWT(JSON Web Token、RFC 7519)を採用しています。REST・GraphQL・MCPのすべてのルートが、アクセストークンを必要とします。例外は、トークンなしで届く必要のあるログイン、ヘルスチェック、JWKSだけです。",
          "JWTを使う認証には、通常、3つの役割が登場します。クライアント(ブラウザなど)、JWTを作成する認証サーバー、そして、JWTを検証してAPIを提供するリソースサーバー(Backend)です。認証サーバーはログインを受け付けて秘密鍵でJWTに署名し、リソースサーバーは認証サーバーの公開鍵(JWKS)でそのJWTを検証します。一般的には、認証サーバーとリソースサーバーは別に構成します。",
          "このアプリでは、既定では独立した認証サーバーを置かず、Backendのプロセスが、認証サーバーの役割(ログイン、JWTの署名、公開鍵の公開)とリソースサーバーの役割(JWTの検証、APIの提供)を兼ねています。Keycloakを使う場合は、[シナリオ4](/docs/scenario-keycloak)で説明します。",
        ],
        slot: "jwtRoles",
        subsections: [
          {
            heading: "JWTの構造",
            body: [
              "JWTは、ヘッダー・ペイロード・署名という3つの部分を、ドット(.)でつないだ1本の文字列です。以降では、このアプリで実際に使っている固定デモトークンを例に、3つの部分を順に説明し、最後にそれらをつないで、1本のJWTにします。",
            ],
          },
          {
            heading: "ヘッダー",
            body: [
              "ヘッダーは、署名の方法を示すJSONです。アルゴリズム(alg、ここではRS256)と、署名した鍵のid(kid)が入ります。kidは、検証する側がJWKSのどの鍵を使うかを知るためのものです。base64urlでエンコードすると、JWTの1つ目の部分になります。",
            ],
            code: [
              {
                label: "固定デモトークンのヘッダー(JSON):",
                code: '{\n  "alg": "RS256",\n  "kid": "mXfbNPAfKC4MCud0",\n  "typ": "JWT"\n}',
              },
            ],
          },
          {
            heading: "ペイロード(クレーム)",
            body: [
              "ペイロードは、トークンの中身(クレーム)を入れるJSONです。誰のトークンか(sub)、誰が発行したか(iss)、どのAPI向けか(aud)、いつ発行したか(iat)、いつ期限が切れるか(exp)が入ります。base64urlでエンコードすると、2つ目の部分になります。エンコードされているだけで暗号化されていないため、トークンを持つ人は誰でも読めます。秘密情報は入れません。",
            ],
            code: [
              {
                label: "固定デモトークンのペイロード(JSON):",
                code: '{\n  "iss": "http://localhost:8080",\n  "sub": "demo",\n  "preferred_username": "demo",\n  "aud": "nb-quickstarts-api",\n  "iat": 1767225600,\n  "exp": 253370764800\n}',
              },
            ],
          },
          {
            heading: "署名",
            body: [
              "署名は、このトークンが「認証サーバーが発行したもので、途中で書き換えられていない」ことの証拠です。ログイン時に認証サーバーが、2段階で作ります。まず、base64urlにしたヘッダーとペイロードをドットでつないだ文字列から、SHA-256でハッシュ値を計算します。次に、そのハッシュ値に、秘密鍵で署名します(RS256)。暗号化ではないため、前の2つの部分は読めるままです。どちらか1文字でも変わるとハッシュ値が変わり、署名は合わなくなります。",
            ],
            code: [
              {
                label: "署名の作成 — ログイン時(認証サーバー):",
                code: '手順1  署名の対象を用意する\n       対象 = base64url(ヘッダー) + "." + base64url(ペイロード)\n手順2  対象をハッシュ化する\n       ハッシュ値 = SHA-256(対象)\n手順3  ハッシュ値に秘密鍵で署名する\n       署名 = RS256_sign(秘密鍵, ハッシュ値)\n手順4  JWTの3つ目の部分にする\n       base64url(署名) = UyiPk2jO5eUHGQT3cx3dauWU...   (長いので省略)',
              },
              {
                label: "署名の検証 — リクエストのたび(リソースサーバー):",
                code: '手順1  トークンをドットで3つの部分に分割する\n手順2  最初の2つの部分を、トークンにあるまま\n       (base64urlの文字列のまま、デコードせず)ハッシュ化する\n       A = SHA-256(1つ目 + "." + 2つ目)\n手順3  3つ目の部分をbase64urlデコードし、公開鍵で\n       署名されたハッシュ値を取り出す\n       B = recover_hash(公開鍵, base64url_decode(3つ目))\n手順4  AとBを比較する\n       A == B  ->  本物で、改ざんなし\n       A != B  ->  401',
              },
            ],
            closing: [
              "公開鍵は、署名からハッシュ値を取り出すためだけに使います。また、公開鍵では署名を作れないため、公開鍵を公開しても(/.well-known/jwks.json)、トークンを偽造することはできません。トークンについて保存や問い合わせは必要ないため、ログインでDBへの問い合わせが発生せず、公開鍵を持つサービスなら、単独でトークンを検証できます。",
            ],
          },
          {
            heading: "完成したJWT",
            body: [
              "3つの部分を、それぞれbase64urlにして、ドットでつないだものが、JWTです。これが、固定デモトークンの全体です(読みやすいように行を分けていますが、実際は1本の文字列です)。ログインで認証サーバーが返すJWTも、同じ形です。",
            ],
            code: [
              {
                label: "ヘッダー . ペイロード . 署名",
                code: "eyJhbGciOiJSUzI1NiIsImtpZCI6Im1YZmJOUEFmS0M0TUN1ZDAiLCJ0eXAiOiJKV1QifQ.\neyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJzdWIiOiJkZW1vIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZGVtbyIsImF1ZCI6Im5iLXF1aWNrc3RhcnRzLWFwaSIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjoyNTMzNzA3NjQ4MDB9.\nUyiPk2jO5eUHGQT3cx3dauWU...",
              },
            ],
            noteTitle: "固定デモトークンについて",
            note: "このリポジトリでは、テスト(コントラクトテスト、モック、MCP Inspectorの設定など)で使うために、固定デモトークンを発行しています。この固定デモトークンと署名鍵は、リポジトリに含まれており、誰でも同じトークンを作れます。固定デモトークンは長期有効で、expは9999年です(ログインで返るトークンも同じ形ですが、期限は1日後です)。このように固定したトークンは、一般的に、開発・テスト環境での利用に限定することが期待されます。本番環境には、固定デモトークンのようなトークンを発行しないことが推奨されます。環境ごとに鍵を分けて、本番は本番の鍵だけでトークンを検証します。",
          },
          {
            heading: "認証の流れ",
            body: [
              "クライアントはログインでJWTを受け取り、以降のすべてのリクエストに付けて送ります。トークンは認証サーバーが発行し、APIを提供するリソースサーバーが、そのたびに検証します。",
            ],
            sequence: {
              summary:
                "シーケンス図: クライアントがログインすると、認証サーバー(Backendのプロセスが兼ねる)が秘密鍵でJWTに署名して返し、以降のリクエストでクライアントがJWTをBearerトークンとして送ると、リソースサーバー(Backend)が公開鍵で署名とクレームを検証して200か401を返す流れ",
              participants: [
                { id: "cl", label: "クライアント", sub: "ブラウザ / curl" },
                { id: "auth", label: "認証サーバー", sub: "Backendが兼ねる" },
                {
                  id: "app",
                  label: "リソースサーバー",
                  sub: "Backend(REST API)",
                },
              ],
              steps: [
                {
                  kind: "message",
                  from: "cl",
                  to: "auth",
                  text: "ログインする",
                  detail: "POST /auth/login  {username, password}",
                },
                {
                  kind: "note",
                  at: "auth",
                  text: "パスワードを確認し(不一致なら401)、秘密鍵でクレームに署名する",
                },
                {
                  kind: "message",
                  from: "auth",
                  to: "cl",
                  text: "JWTを返す",
                  detail: '{"token": "eyJhbGci..."}',
                  dashed: true,
                },
                {
                  kind: "message",
                  from: "cl",
                  to: "app",
                  text: "トークンを付けてAPIを呼ぶ",
                  detail: "Authorization: Bearer eyJhbGci...",
                },
                {
                  kind: "note",
                  at: "app",
                  text: "公開鍵で署名を、続けてiss・aud・expを検証する — DBへの問い合わせなし",
                },
                {
                  kind: "message",
                  from: "app",
                  to: "cl",
                  text: "データ付きの200 — どれか1つでも失敗すれば401",
                  dashed: true,
                },
              ],
              frames: [
                { from: 0, to: 2, label: "1. ログイン(トークンの発行)" },
                {
                  from: 3,
                  to: 5,
                  label: "2. 以降のリクエスト(トークンの検証)",
                },
              ],
            },
            closing: [
              "署名が正しいと確認できれば、クレームの内容を信頼できます。リソースサーバーは、iss(信頼する認証サーバーが発行したか)、aud(このAPI向けか)、exp(期限内か)でトークンの正当性を確認し、sub(ここではdemo)を「リクエストしたユーザー」として扱います(たとえばGET /meは、そのsubのプロフィールを返します)。今のトークンにはロールや権限を表すクレームがないため、リソースサーバーの認可は「既知のユーザーの有効なトークンであること」までです。ロールで操作を分けるには、ロールのクレームを追加して、それを検査する必要があります。",
            ],
          },
        ],
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
              "書き込み経路の手前にKafkaを置きます。kafka-bridgeがトピックからイベントを読み、1件ずつPOST /transactionsでbackendへ転送します(他のすべてのクライアントと同じ書き込みです)。同じLocustの負荷を、バーストでエラーになるREST直接の経路と、Kafka経由の経路の2つに流し、測定結果を比較します。",
            ],
          },
          {
            heading: "シナリオ4: Keycloakの利用",
            href: "/docs/scenario-keycloak",
            body: [
              "モックのログインを本物に置き換えます。ログイン画面にKeycloakの選択肢(サインアップ付き)が加わり、Keycloakで認証すると、backendは同じPOST /transactionsでKeycloakが発行したトークンを受け付けます。そのうえで、backendが実際にトークンを検証していることを確認します。",
            ],
          },
          {
            heading: "シナリオ5: Vaultの利用",
            href: "/docs/scenario-vault",
            body: [
              "backendの設定からデータベースのパスワードを取り除きます。backendは起動時にVaultへ認証情報を要求し、Vaultがその場で短命なMySQLユーザーを作成します。Vaultなしではbackendが失敗し、Vaultありでは動作することを確認し、最後にVaultが作成したユーザーを確認します。",
            ],
          },
          {
            heading: "シナリオ6: agentgateway経由でのMCPアクセス",
            href: "/docs/scenario-agentgateway",
            body: [
              "backendへMCPツールとして到達する、もう1つの経路です。backend自身の/mcpとは別に、agentgatewayはMCPツールをOpenAPIのSpecファイル(openapi.yaml)だけから作成します。ゲートウェイ経由と実際のMCPクライアントからツールを呼び出し、ゲートウェイのダッシュボードを確認します。",
            ],
          },
          {
            heading: "シナリオ7: オブザーバビリティ",
            href: "/docs/scenario-observability",
            body: [
              "backendのOpenTelemetryエクスポート(トレース・メトリクス・ログ。既定ではオフ)を有効にし、HTTPの過負荷を実行して、その様子をGrafanaでライブに観察します。同じ実行でアラートルールが発火してAlertmanagerが通知に振り分け、Lokiのログ行からそのリクエストのトレースへ遷移でき、Kongとagentgatewayもテレメトリーを送信します。",
            ],
          },
        ],
      },
    ],
  },
};
