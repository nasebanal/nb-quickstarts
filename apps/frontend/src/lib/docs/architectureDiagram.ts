import type { Locale } from "@/lib/i18n";

// Node/edge labels for the Overview page's bird's-eye-view diagram -
// updated from the architecture picture in the nb-quickstarts blog post
// (nb-landing-page's "NASEBANAL Quickstarts" post) to also cover Keycloak,
// Vault, agentgateway and observability, all added since that post. Edge
// labels are deliberately short (no "(Scenario N)" suffixes) - which
// scenario covers which module is already in the sidebar and in the
// Overview's scenario descriptions, so repeating it on every arrow just
// added clutter without adding information.
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
    keycloak: "Keycloak",
    vault: "Vault",
    agentGroup: "Monitoring",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "swap target",
    via: "via",
    load: "load",
    events: "events",
    jwt: "JWTs",
    credential: "fetch credential",
    mcpTools: "MCP tools",
    otlp: "OTLP",
    jwks: "fetch keys (JWKS)",
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
      "drawn in Scenario 5's sequence diagram; the MCP path (agentgateway) is the diagram below.",
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
    keycloak: "Keycloak",
    vault: "Vault",
    agentGroup: "監視",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "切替先",
    via: "経由",
    load: "負荷",
    events: "イベント",
    jwt: "JWT",
    credential: "認証情報を取得",
    mcpTools: "MCPツール",
    otlp: "OTLP",
    jwks: "公開鍵を取得(JWKS)",
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
      "MCPの経路(agentgateway)は下の図に描いています。",
    captionMcp:
      "MCPアクセスの経路を、上の図と同じ列位置で描いているので、上下で見比べられます: MCPクライアント" +
      "(アクセント色がMCP)はFrontendを経由せず、backend内蔵の/mcpで、または任意でagentgateway(点線、" +
      "Kongと同じ位置づけ)経由でbackendに到達します。agentgatewayはOpenAPI契約からMCPツールを作ってREST APIを" +
      "呼びます。KeycloakとVaultも同じ位置で連携します: クライアントはKeycloakでログインし、そのJWTは" +
      "backendで検証されます(agentgatewayのゲートウェイ側でも検証できますが、シナリオ7では未設定です)。" +
      "backendのDB接続情報はVaultから取得します。",
  },
};
