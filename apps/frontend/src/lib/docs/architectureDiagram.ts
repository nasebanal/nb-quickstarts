import type { Locale } from "@/lib/i18n";

// Node/edge labels for the Overview page's bird's-eye-view diagram -
// updated from the architecture picture in the nb-quickstarts blog post
// (nb-landing-page's "NASEBANAL Quickstarts" post) to also cover Keycloak,
// Vault, agentgateway and observability, all added since that post. Edge
// labels are deliberately short (no "(Scenario N)" suffixes) - which
// scenario covers which module is already in the sidebar and the
// Constituent modules table, so repeating it on every arrow just added
// clutter without adding information.
const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    appsNetwork: "apps-network",
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
    agentGroup: "Agent & observability",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "swap target",
    events: "events",
    discover: "discovers",
    jwt: "JWTs",
    credential: "credential",
    mcpTools: "MCP tools",
    otlp: "OTLP",
  },
  ja: {
    appsNetwork: "apps-network",
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
    agentGroup: "エージェント & 監視",
    agentgateway: "agentgateway",
    observability: "Observability",
    swapTarget: "切替先",
    events: "イベント",
    discover: "検出",
    jwt: "JWT",
    credential: "認証情報",
    mcpTools: "MCPツール",
    otlp: "OTLP",
  },
};

// Plain Mermaid flowchart syntax, built as a template string rather than
// via mermaid's JS API - keeps this file readable as a diagram (grouping
// mirrors the picture) instead of a sequence of builder calls, and keeps
// MermaidDiagram.tsx a dumb renderer that doesn't need to know the shape
// of this app's own architecture. Related modules are grouped into their
// own subgraphs (gateway/mocks, async, identity/secrets, agent/observability)
// - mermaid clusters a subgraph's members spatially, which cuts down edge
// crossings a lot more than listing all ten nodes flat ever did.
export function buildArchitectureDiagram(locale: Locale): string {
  const l = LABELS[locale];
  return `flowchart TD
  subgraph net["${l.appsNetwork}"]
    FE["${l.frontend}"]
    BE["${l.backend}"]
    DB[("${l.mysql}")]
    FE -->|REST| BE
    BE --> DB
  end

  subgraph gw["${l.gatewayGroup}"]
    Kong["${l.kong}"]
    Specmatic["${l.specmatic}"]
    Microcks["${l.microcks}"]
    Kong -.->|"${l.swapTarget}"| Specmatic
    Kong -.->|"${l.swapTarget}"| Microcks
  end
  Kong -->|"/api/*"| BE

  subgraph async["${l.asyncGroup}"]
    Kafka["${l.kafka}"] --> Bridge["${l.kafkaBridge}"]
  end
  Bridge -->|"${l.events}"| BE

  subgraph identity["${l.identityGroup}"]
    Consul["${l.consul}"]
    Keycloak["${l.keycloak}"]
    Vault["${l.vault}"]
  end
  Consul -.->|"${l.discover}"| BE
  Consul -.->|"${l.discover}"| DB
  Keycloak -.->|"${l.jwt}"| BE
  Vault -.->|"${l.credential}"| BE

  subgraph agent["${l.agentGroup}"]
    AG["${l.agentgateway}"]
    Obs["${l.observability}"]
  end
  AG -->|"${l.mcpTools}"| BE
  Obs -.->|"${l.otlp}"| BE
`;
}
