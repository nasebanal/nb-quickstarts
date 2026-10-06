import type { LocalizedDocsPage } from "./types";

// Scenario 2: the backend's JWT authentication, checked by hand (curl) and by the automated tests.
// The commands and outputs below are real runs against `make apps:up`.

const LOGIN_COMMAND =
  "TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \\\n" +
  "  -d '{\"username\":\"demo\",\"password\":\"demo\"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"token\"])')";

const DECODE_COMMAND =
  "echo $TOKEN | cut -d. -f2 | python3 -c 'import sys,base64,json;p=sys.stdin.read().strip();\\\n" +
  "print(json.dumps(json.loads(base64.urlsafe_b64decode(p+\"=\"*(-len(p)%4))),indent=2))'";

const VERIFY_COMMAND =
  "docker exec -i -e TOKEN=\"$TOKEN\" nb-backend python - <<'EOF'\n" +
  "import os, jwt\n" +
  "from jwt import PyJWKClient\n" +
  "key = PyJWKClient(\"http://localhost:8080/.well-known/jwks.json\").get_signing_key_from_jwt(os.environ[\"TOKEN\"])\n" +
  "claims = jwt.decode(os.environ[\"TOKEN\"], key.key, algorithms=[\"RS256\"],\n" +
  "                    audience=\"nb-quickstarts-api\", issuer=\"http://localhost:8080\")\n" +
  "print(\"verified, sub =\", claims[\"sub\"])\n" +
  "EOF";

const ROUTES_COMMAND =
  "for route in /health /.well-known/jwks.json /accounts /transactions /transactions/1 /me; do\n" +
  "  without=$(curl -s -o /dev/null -w '%{http_code}' localhost:8080$route)\n" +
  "  with=$(curl -s -o /dev/null -w '%{http_code}' -H \"Authorization: Bearer $TOKEN\" localhost:8080$route)\n" +
  "  printf '%-26s %s  %s\\n' $route $without $with\n" +
  "done";

const REFUSED_COMMAND =
  "TAMPERED=\"${TOKEN%?}x\"        # the signature's last character changed\n" +
  "EXPIRED=$(docker exec nb-backend python -c \"from app.jwt_tokens import issue_token; print(issue_token('demo', ttl_seconds=-10))\")\n" +
  "NONE=$(python3 -c 'import base64,json;b=lambda d:base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b\"=\").decode();print(b({\"alg\":\"none\",\"typ\":\"JWT\"})+\".\"+b({\"sub\":\"demo\",\"iss\":\"http://localhost:8080\",\"aud\":\"nb-quickstarts-api\",\"iat\":1,\"exp\":4102444800})+\".\")')\n" +
  "for name in TAMPERED EXPIRED NONE; do\n" +
  "  eval \"t=\\$$name\"\n" +
  "  printf '%-9s %s\\n' $name \"$(curl -s -w ' %{http_code}' -H \"Authorization: Bearer $t\" localhost:8080/accounts)\"\n" +
  "done";

export const scenarioAuth: LocalizedDocsPage = {
  en: {
    title: "Scenario 2: Verify JWT authentication",
    description:
      "Every API route needs an access token - an RS256 JWT the backend signs at login and publishes the " +
      "public key for. This scenario checks that by hand: read a token, verify it against the published key, " +
      "see which routes refuse a request without one, throw tokens at the API that must be refused, watch a " +
      "token expire - and then run the automated tests that keep all of it true.",
    sections: [
      {
        heading: "Why JWT authentication",
        body: [
          "A realistic API does not trust a request because of where it came from, but because of a token it " +
            "carries. Here that token is a JWT, and the whole API - REST, GraphQL and MCP - checks it.",
        ],
        bullets: [
          "Signed with a private key, verified with the public one: a gateway or another service can check a token from " +
            "/.well-known/jwks.json without sharing any secret - the same way it would check a Keycloak token (Scenario 5).",
          "Self-describing: the token says who it is for (sub), who issued it (iss), which API it is meant for (aud) and when " +
            "it stops being valid (exp), so a token for another API, or an old one, is refused.",
          "One contract: shared/openapi/openapi.yaml marks every operation as needing the token except the three that must " +
            "be reachable without one - login, the health check and the JWKS - and lists the 401 each one answers.",
        ],
      },
      {
        heading: "1. Log in and read the token",
        body: [
          "Start the apps stack (make apps:up), then log in as the demo user and keep the token in a variable. " +
            "A JWT is three base64url parts joined by dots; the middle one holds the claims, readable by anyone.",
        ],
        code: [{ label: "Log in:", code: LOGIN_COMMAND }, { label: "Read the claims (the middle part):", code: DECODE_COMMAND }],
        terminal: {
          lines: [
            { text: "{", tone: "muted" },
            { text: '  "iss": "http://localhost:8080",' },
            { text: '  "sub": "demo",' },
            { text: '  "preferred_username": "demo",' },
            { text: '  "aud": "nb-quickstarts-api",' },
            { text: '  "iat": 1791276677,' },
            { text: '  "exp": 1791363077' },
            { text: "}", tone: "muted" },
          ],
        },
        closing: [
          "exp minus iat is 86400 seconds: a login lasts a day (APPS_JWT_TTL_SECONDS changes it). The first part of the token " +
            "(its header) says alg RS256 and a kid, the id of the key that signed it.",
        ],
        noteTitle: "JWT: JSON Web Token (RFC 7519)",
        noteHref: "https://www.rfc-editor.org/rfc/rfc7519",
        note:
          "A JWT is a signed set of claims. iss (issuer), sub (subject), aud (audience), iat (issued at) and exp " +
          "(expiration time) are registered claim names; the backend requires exp, iat and sub and checks iss, aud and exp " +
          "on every request.",
      },
      {
        heading: "2. Verify the token with the public key",
        body: [
          "The backend publishes the public half of its signing key as a JWKS. Anyone who can reach it can verify a token without " +
            "asking the backend about that token:",
        ],
        code: [
          { label: "The published key (shown below with n shortened):", code: "curl -s localhost:8080/.well-known/jwks.json" },
          { label: "Verify the token against it, with PyJWT (run inside the backend container, which has it):", code: VERIFY_COMMAND },
        ],
        terminal: {
          lines: [
            { text: '{ "keys": [ { "kty": "RSA", "use": "sig", "alg": "RS256", "kid": "mXfbNPAfKC4MCud0", "n": "vG017uolFi2_...", "e": "AQAB" } ] }', tone: "muted" },
            { text: "verified, sub = demo", tone: "success" },
          ],
        },
        closing: [
          "kid in the token's header matches the key in the JWKS. This is what a gateway would do: agentgateway's " +
            "mcpAuthentication, or Kong's jwt plugin, can be pointed at this URL to check the same tokens.",
        ],
        noteTitle: "JWKS: JSON Web Key Set (RFC 7517)",
        noteHref: "https://www.rfc-editor.org/rfc/rfc7517",
        note:
          "A JWKS is a JSON document listing public keys, each with a kid (key id). A verifier picks the key whose kid " +
          "matches the token's header, so the signing key can be rotated without reconfiguring anyone who reads the JWKS.",
      },
      {
        heading: "3. See which routes need a token",
        body: [
          "Call a few routes without a token and then with the one you have. The two columns are the status codes:",
        ],
        code: [{ code: ROUTES_COMMAND }],
        terminal: {
          lines: [
            { text: "/health                    200  200", tone: "success" },
            { text: "/.well-known/jwks.json     200  200", tone: "success" },
            { text: "/accounts                  401  200", tone: "info" },
            { text: "/transactions              401  200", tone: "info" },
            { text: "/transactions/1            401  200", tone: "info" },
            { text: "/me                        401  200", tone: "info" },
          ],
        },
        closing: [
          "Only the health check and the JWKS answer without a token (and POST /auth/login, which is how you get one). " +
            "GraphQL is no different: POST /graphql answers 401 without a token and 200 with it. The 401 body is always " +
            "{\"detail\":\"invalid or missing token\"}.",
        ],
      },
      {
        heading: "4. Try tokens that must be refused",
        body: [
          "Send three bad tokens to a protected route: one with its signature changed, one that has expired, and an " +
            "unsigned one (alg none - the classic trick of a token that claims it needs no signature):",
        ],
        code: [{ code: REFUSED_COMMAND }],
        terminal: {
          lines: [
            { text: 'TAMPERED  {"detail":"invalid or missing token"} 401', tone: "error" },
            { text: 'EXPIRED   {"detail":"invalid or missing token"} 401', tone: "error" },
            { text: 'NONE      {"detail":"invalid or missing token"} 401', tone: "error" },
          ],
        },
        closing: [
          "All three get the same answer on purpose: the response never says why a token was refused, so it does not help " +
            "someone probing for a way in. The automated tests below also try a token signed by another key, a token for another " +
            "issuer or audience, and an HS256 token signed with the public key as the secret (the algorithm-confusion attack).",
        ],
      },
      {
        heading: "5. Watch a token expire",
        body: [
          "Give tokens a 20-second life, restart the backend, and use one before and after it runs out:",
        ],
        code: [
          { label: ".env (remove it again when you are done):", code: "APPS_JWT_TTL_SECONDS=20" },
          { code: "make apps:restart" },
          {
            code:
              LOGIN_COMMAND +
              "\n" +
              "curl -s -o /dev/null -w '%{http_code}\\n' -H \"Authorization: Bearer $TOKEN\" localhost:8080/accounts\n" +
              "sleep 22\n" +
              "curl -s -w ' [%{http_code}]\\n' -H \"Authorization: Bearer $TOKEN\" localhost:8080/accounts",
          },
        ],
        terminal: {
          lines: [
            { text: "200", tone: "success" },
            { text: '{"detail":"invalid or missing token"} [401]', tone: "error" },
          ],
        },
        closing: [
          "The same token worked a moment ago and is refused now, with nothing changed on the server: the backend only compared " +
            "exp with the clock. The frontend handles this too - a rejected token ends the session and sends you back to the login.",
        ],
      },
      {
        heading: "6. Run the automated tests",
        body: [
          "Everything above is also checked by the test tools, so it stays true as the API changes:",
        ],
        bullets: [
          "make pytest:test - test_auth_required.py walks every route the app registers and asserts that each one except the " +
            "public ones answers 401 without a token, so a new route that forgets authentication fails a test; test_jwt_auth.py covers " +
            "the claims, expiry, tampering, a foreign key, issuer and audience, alg none, HS256 confusion, and the JWKS.",
          "make specmatic:test - the contract's 401 examples (a missing token, an invalid one) are sent to the real backend, so the " +
            "documented responses are the real ones.",
          "make zap:api-scan - ZAP logs in first and sends the token with every request (zap/hooks/bearer_token.py), so the " +
            "active scan exercises the protected routes instead of only seeing 401s.",
        ],
        code: [{ code: "make pytest:test\nmake specmatic:test\nmake zap:api-scan" }],
        terminal: {
          lines: [
            { text: "tests/test_auth_required.py::test_a_protected_route_answers_401_without_a_token[GET-/accounts] PASSED", tone: "success" },
            { text: "tests/test_jwt_auth.py::test_an_expired_token_is_rejected PASSED", tone: "success" },
            { text: "tests/test_jwt_auth.py::test_the_jwks_verifies_the_tokens_the_backend_issues PASSED", tone: "success" },
            { text: "✅ [pytest] PASS", tone: "success" },
          ],
        },
      },
      {
        heading: "Cleanup",
        body: [
          "Nothing was started for this scenario. Forget the token, and if you set APPS_JWT_TTL_SECONDS in step 5, remove it from " +
            ".env and restart the backend so logins last a day again.",
        ],
        code: [{ code: "unset TOKEN TAMPERED EXPIRED NONE\n# .env: remove APPS_JWT_TTL_SECONDS\nmake apps:restart" }],
      },
    ],
  },
  ja: {
    title: "シナリオ2: JWT認証の検証",
    description:
      "APIはすべてアクセストークンが必要です。トークンは、backendがログイン時に署名して発行するRS256のJWTで、" +
      "公開鍵も公開されています。このシナリオでは、トークンを読み、公開された鍵で検証し、トークンなしのリクエストを" +
      "拒否するルートを確かめ、拒否されるべきトークンをAPIに送り、トークンが期限切れになる様子を見て、" +
      "最後にこれらを保証する自動テストを実行します。",
    sections: [
      {
        heading: "JWT認証を使うメリット",
        body: [
          "現実のAPIは、リクエストの出どころではなく、持っているトークンでリクエストを信頼します。ここではそのトークンがJWTで、" +
            "REST・GraphQL・MCPのすべてが検証します。",
        ],
        bullets: [
          "秘密鍵で署名し、公開鍵で検証します。ゲートウェイや他のサービスは、秘密を共有せずに/.well-known/jwks.jsonから" +
            "トークンを検証できます。Keycloakのトークンを検証するのと同じやり方です(シナリオ5)。",
          "トークン自身が内容を持ちます。誰のものか(sub)、誰が発行したか(iss)、どのAPI向けか(aud)、いつまで有効か(exp)が" +
            "分かるため、別のAPI向けのトークンや古いトークンは拒否されます。",
          "契約は1つです。shared/openapi/openapi.yamlは、トークンなしで届く必要のある3つ(ログイン、ヘルスチェック、JWKS)以外の" +
            "すべてのオペレーションにトークンが必要だと示し、それぞれが返す401も記載しています。",
        ],
      },
      {
        heading: "1. ログインしてトークンを読む",
        body: [
          "appsスタックを起動し(make apps:up)、デモユーザーでログインして、トークンを変数に入れます。" +
            "JWTはドットでつないだ3つのbase64urlの部分で、真ん中がクレームで、誰でも読めます。",
        ],
        code: [{ label: "ログインする:", code: LOGIN_COMMAND }, { label: "クレーム(真ん中の部分)を読む:", code: DECODE_COMMAND }],
        terminal: {
          lines: [
            { text: "{", tone: "muted" },
            { text: '  "iss": "http://localhost:8080",' },
            { text: '  "sub": "demo",' },
            { text: '  "preferred_username": "demo",' },
            { text: '  "aud": "nb-quickstarts-api",' },
            { text: '  "iat": 1791276677,' },
            { text: '  "exp": 1791363077' },
            { text: "}", tone: "muted" },
          ],
        },
        closing: [
          "expからiatを引くと86400秒で、ログインは1日有効です(APPS_JWT_TTL_SECONDSで変えられます)。トークンの最初の部分(ヘッダー)には、" +
            "algがRS256であることと、署名した鍵のidであるkidが入っています。",
        ],
        noteTitle: "JWT: JSON Web Token (RFC 7519)",
        noteHref: "https://www.rfc-editor.org/rfc/rfc7519",
        note:
          "JWTは、署名つきのクレームの集まりです。iss(発行者)、sub(主体)、aud(対象)、iat(発行時刻)、exp(有効期限)は" +
          "登録済みのクレーム名で、backendはexp・iat・subを必須とし、リクエストごとにiss・aud・expを検証します。",
      },
      {
        heading: "2. 公開鍵でトークンを検証する",
        body: [
          "backendは、署名鍵の公開側をJWKSとして公開しています。アクセスできる人なら誰でも、そのトークンについてbackendに" +
            "問い合わせずに検証できます:",
        ],
        code: [
          { label: "公開されている鍵(下の出力ではnを短縮):", code: "curl -s localhost:8080/.well-known/jwks.json" },
          { label: "それでトークンを検証する(PyJWTがあるbackendコンテナの中で実行):", code: VERIFY_COMMAND },
        ],
        terminal: {
          lines: [
            { text: '{ "keys": [ { "kty": "RSA", "use": "sig", "alg": "RS256", "kid": "mXfbNPAfKC4MCud0", "n": "vG017uolFi2_...", "e": "AQAB" } ] }', tone: "muted" },
            { text: "verified, sub = demo", tone: "success" },
          ],
        },
        closing: [
          "トークンのヘッダーのkidは、JWKSの鍵と一致します。ゲートウェイがやることもこれで、agentgatewayのmcpAuthenticationや" +
            "Kongのjwtプラグインに、このURLを向ければ同じトークンを検証できます。",
        ],
        noteTitle: "JWKS: JSON Web Key Set (RFC 7517)",
        noteHref: "https://www.rfc-editor.org/rfc/rfc7517",
        note:
          "JWKSは、公開鍵(それぞれにkid=鍵id)を並べたJSON文書です。検証側はトークンのヘッダーのkidに一致する鍵を選ぶので、" +
          "署名鍵を入れ替えても、JWKSを読む側の設定を変える必要がありません。",
      },
      {
        heading: "3. トークンが必要なルートを確かめる",
        body: [
          "いくつかのルートを、トークンなしと、手元のトークンありで呼びます。2つの列がステータスコードです:",
        ],
        code: [{ code: ROUTES_COMMAND }],
        terminal: {
          lines: [
            { text: "/health                    200  200", tone: "success" },
            { text: "/.well-known/jwks.json     200  200", tone: "success" },
            { text: "/accounts                  401  200", tone: "info" },
            { text: "/transactions              401  200", tone: "info" },
            { text: "/transactions/1            401  200", tone: "info" },
            { text: "/me                        401  200", tone: "info" },
          ],
        },
        closing: [
          "トークンなしで答えるのは、ヘルスチェックとJWKSだけです(それとトークンを得るためのPOST /auth/login)。GraphQLも同じで、" +
            "POST /graphqlはトークンなしなら401、ありなら200です。401の本文は常に{\"detail\":\"invalid or missing token\"}です。",
        ],
      },
      {
        heading: "4. 拒否されるべきトークンを試す",
        body: [
          "保護されたルートに、3つの不正なトークンを送ります。署名を変えたもの、期限切れのもの、署名のないもの" +
            "(alg none — 署名は要らないと主張するトークンという、典型的な手口)です:",
        ],
        code: [{ code: REFUSED_COMMAND }],
        terminal: {
          lines: [
            { text: 'TAMPERED  {"detail":"invalid or missing token"} 401', tone: "error" },
            { text: 'EXPIRED   {"detail":"invalid or missing token"} 401', tone: "error" },
            { text: 'NONE      {"detail":"invalid or missing token"} 401', tone: "error" },
          ],
        },
        closing: [
          "3つとも同じ応答なのは意図的です。拒否した理由を応答に書かないので、侵入の糸口を探る相手の役に立ちません。" +
            "下の自動テストは、別の鍵で署名したトークン、別の発行者や対象のトークン、公開鍵を秘密として署名したHS256のトークン" +
            "(アルゴリズム混同攻撃)も試します。",
        ],
      },
      {
        heading: "5. トークンが期限切れになる様子を見る",
        body: [
          "トークンの寿命を20秒にしてbackendを再起動し、切れる前と後で同じトークンを使います:",
        ],
        code: [
          { label: ".env(終わったらまた消す):", code: "APPS_JWT_TTL_SECONDS=20" },
          { code: "make apps:restart" },
          {
            code:
              LOGIN_COMMAND +
              "\n" +
              "curl -s -o /dev/null -w '%{http_code}\\n' -H \"Authorization: Bearer $TOKEN\" localhost:8080/accounts\n" +
              "sleep 22\n" +
              "curl -s -w ' [%{http_code}]\\n' -H \"Authorization: Bearer $TOKEN\" localhost:8080/accounts",
          },
        ],
        terminal: {
          lines: [
            { text: "200", tone: "success" },
            { text: '{"detail":"invalid or missing token"} [401]', tone: "error" },
          ],
        },
        closing: [
          "さっきまで使えたトークンが、サーバー側を何も変えていないのに拒否されます。backendはexpと時計を比べただけです。" +
            "frontendもこれに対応していて、トークンが拒否されるとセッションを終えてログイン画面に戻します。",
        ],
      },
      {
        heading: "6. 自動テストを実行する",
        body: [
          "ここまでに確かめたことは、テストツールでも検証されるので、APIが変わっても成り立ち続けます:",
        ],
        bullets: [
          "make pytest:test — test_auth_required.pyは、アプリが登録した全ルートを巡回し、公開のもの以外がトークンなしで401を返すことを" +
            "確かめます。認証を忘れた新しいルートはテストが失敗します。test_jwt_auth.pyは、クレーム、期限切れ、改ざん、別の鍵、発行者と対象、" +
            "alg none、HS256の混同、JWKSを確かめます。",
          "make specmatic:test — 契約にある401のexample(トークンなし、不正なトークン)を実backendに送り、書かれている応答が" +
            "実際の応答であることを確かめます。",
          "make zap:api-scan — ZAPが先にログインし、すべてのリクエストにトークンを付けて(zap/hooks/bearer_token.py)送るので、" +
            "アクティブスキャンは401だけでなく、保護されたルートの中まで試します。",
        ],
        code: [{ code: "make pytest:test\nmake specmatic:test\nmake zap:api-scan" }],
        terminal: {
          lines: [
            { text: "tests/test_auth_required.py::test_a_protected_route_answers_401_without_a_token[GET-/accounts] PASSED", tone: "success" },
            { text: "tests/test_jwt_auth.py::test_an_expired_token_is_rejected PASSED", tone: "success" },
            { text: "tests/test_jwt_auth.py::test_the_jwks_verifies_the_tokens_the_backend_issues PASSED", tone: "success" },
            { text: "✅ [pytest] PASS", tone: "success" },
          ],
        },
      },
      {
        heading: "環境のクリーンアップ",
        body: [
          "このシナリオのために起動したものはありません。トークンを忘れ、手順5でAPPS_JWT_TTL_SECONDSを設定したなら、.envから消して" +
            "backendを再起動し、ログインが1日有効に戻るようにします。",
        ],
        code: [{ code: "unset TOKEN TAMPERED EXPIRED NONE\n# .env: APPS_JWT_TTL_SECONDSを消す\nmake apps:restart" }],
      },
    ],
  },
};
