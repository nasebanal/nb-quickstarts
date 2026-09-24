import type { Locale } from "@/lib/i18n";

// Node/edge labels for the Overview page's bird's-eye-view diagram -
// updated from the architecture picture in the nb-quickstarts blog post
// (nb-landing-page's "NASEBANAL Quickstarts" post) to also cover Keycloak,
// Vault, agentgateway and observability, all added since that post. Edge
// labels are deliberately short (no "(Scenario N)" suffixes) - which
// scenario covers which module is already in the sidebar and the
// Constituent modules table, so repeating it on every arrow just added
// clutter without adding information.
//
// The geometry lives in ArchitectureDiagram.tsx, not here: the diagram used
// to be a Mermaid flowchart, but Mermaid's auto-layout can't be told "put
// this group above, that one to the upper right", and the result had edges
// crossing straight through unrelated nodes.
export const ARCHITECTURE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    appsNetwork: "apps-network",
    browser: "Browser",
    locust: "Locust",
    frontend: "Frontend",
    backend: "Backend",
    mysql: "MySQL",
    gatewayGroup: "Gateway & mocks",
    kong: "Kong",
    specmatic: "Specmatic",
    microcks: "Microcks",
    asyncGroup: "Async",
    kafka: "Kafka",
    kafkaBridge: "kafka-bridge",
    identityGroup: "Identity & secrets",
    consul: "Consul",
    keycloak: "Keycloak",
    vault: "Vault",
    agentGroup: "Monitoring",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "swap target",
    via: "via",
    load: "load",
    events: "events",
    discover: "discovers",
    jwt: "JWTs",
    credential: "fetch credential",
    mcpTools: "MCP tools",
    otlp: "OTLP",
    jwks: "fetch keys (JWKS)",
    healthChecks: "health checks",
    mcpClient: "MCP client",
    mcpProtocol: "MCP",
    mcpNative: "MCP (built-in /mcp)",
    noFrontend: "(no Frontend in this path)",
    legendRest: "REST (HTTP)",
    legendMcp: "MCP",
    legendOptional: "optional",
    agentGatewayGroup: "Agent gateway",
    openapiToTools: "OpenAPI -> MCP tools",
    loginToken: "login -> JWT",
    dbUsers: "creates DB users",
    captionStack:
      "The shared apps-network and the modules around it, over REST. Arrows point from the caller to what " +
      "it calls (the label says what comes back); dashed lines are integrations that are off by default. Frontend <-> Keycloak (login) is " +
      "drawn in Scenario 5's sequence diagram; Consul (service discovery) and the MCP path (agentgateway) are the diagrams below.",
    frontendServer: "Frontend (server)",
    backendGroup: "Backend (3 instances)",
    fixedTarget: "a fixed address points here",
    consulAsk: "which backends are healthy?",
    healthEvery2s: "health checks (every 2s)",
    legendConsul: "Consul (asks / health checks)",
    captionConsul:
      "Service discovery, on the same columns as the diagrams above. Consul health-checks every backend " +
      "instance and MySQL, and keeps the list of the healthy ones. The Frontend's server asks Consul which " +
      "backends are healthy and sends each request to one of them (round robin) - instead of a fixed address, " +
      "which always points at one instance. A stopped instance fails its health check and drops out of the " +
      "answer by itself. The registration is made by make consul:register-apps.",
    captionMcp:
      "The MCP access path, on the same columns as the diagram above so the two read one over the other: " +
      "an MCP client (accent color = MCP) reaches the Backend through its built-in /mcp, skipping the " +
      "Frontend, or optionally through agentgateway (dashed, like Kong), which builds MCP tools from the " +
      "OpenAPI contract and calls the REST API. Keycloak and Vault sit in the same place: the client logs in " +
      "at Keycloak and its JWT is verified at the Backend (agentgateway can verify it at the gateway too - " +
      "supported, not configured in Scenario 7), and the Backend gets its DB credential from Vault.",
  },
  ja: {
    appsNetwork: "apps-network",
    browser: "ブラウザ",
    locust: "Locust",
    frontend: "Frontend",
    backend: "Backend",
    mysql: "MySQL",
    gatewayGroup: "ゲートウェイ & モック",
    kong: "Kong",
    specmatic: "Specmatic",
    microcks: "Microcks",
    asyncGroup: "非同期",
    kafka: "Kafka",
    kafkaBridge: "kafka-bridge",
    identityGroup: "認証・シークレット",
    consul: "Consul",
    keycloak: "Keycloak",
    vault: "Vault",
    agentGroup: "監視",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "切替先",
    via: "経由",
    load: "負荷",
    events: "イベント",
    discover: "検出",
    jwt: "JWT",
    credential: "認証情報を取得",
    mcpTools: "MCPツール",
    otlp: "OTLP",
    jwks: "公開鍵を取得(JWKS)",
    healthChecks: "ヘルスチェック",
    mcpClient: "MCPクライアント",
    mcpProtocol: "MCP",
    mcpNative: "MCP(内蔵の/mcp)",
    noFrontend: "(Frontendは経由しない)",
    legendRest: "REST(HTTP)",
    legendMcp: "MCP",
    legendOptional: "任意",
    agentGatewayGroup: "エージェントゲートウェイ",
    openapiToTools: "OpenAPI→MCPツール変換",
    loginToken: "ログイン→JWT",
    dbUsers: "DBユーザーを作成",
    captionStack:
      "共通のapps-networkと周辺モジュール(通信はREST)。矢印は呼び出す側から呼び出される側へ向かい、点線は" +
      "既定ではオフの連携です。Frontend<->Keycloak(ログイン)のやりとりはシナリオ5のシーケンス図に、" +
      "Consul(サービス検出)とMCPの経路(agentgateway)は下の図に描いています。",
    frontendServer: "Frontend(サーバー)",
    backendGroup: "Backend(3インスタンス)",
    fixedTarget: "固定アドレスの向き先",
    consulAsk: "健全なbackendは?",
    healthEvery2s: "ヘルスチェック(2秒ごと)",
    legendConsul: "Consul(問い合わせ・ヘルスチェック)",
    captionConsul:
      "サービス検出の図です(上の図と同じ列位置)。Consulは、backendの各インスタンスとMySQLを" +
      "ヘルスチェックして、健全なものの一覧を持ちます。Frontendのサーバーは、健全なbackendをConsulに尋ね、" +
      "その中の1つ(ラウンドロビン)へリクエストを送ります — 常に1つのインスタンスを指す固定アドレスの" +
      "代わりです。止まったインスタンスは、ヘルスチェックに失敗して、回答から自動で外れます。" +
      "登録はmake consul:register-appsで行います。",
    captionMcp:
      "MCPアクセスの経路を、上の図と同じ列位置で描いているので、上下で見比べられます: MCPクライアント" +
      "(アクセント色がMCP)はFrontendを経由せず、backend内蔵の/mcpで、または任意でagentgateway(点線、" +
      "Kongと同じ位置づけ)経由でbackendに到達します。agentgatewayはOpenAPI契約からMCPツールを作ってREST APIを" +
      "呼びます。KeycloakとVaultも同じ位置で連携します: クライアントはKeycloakでログインし、そのJWTは" +
      "backendで検証されます(agentgatewayのゲートウェイ側でも検証できますが、シナリオ7では未設定です)。" +
      "backendのDB接続情報はVaultから取得します。",
  },
};
