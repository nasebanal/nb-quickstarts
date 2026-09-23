import type { Locale } from "@/lib/i18n";

export interface DocsNavItem {
  href: string;
  labelEn: string;
  labelJa: string;
  children?: DocsNavItem[];
}

// The sidebar's tree: two top-level pages, then one "Scenarios" group
// (a heading, not a page of its own - no href) holding the six walkthroughs
// in the order the user asked for them. DocsSidebar.tsx renders this
// straight through with nested <ul>s; nothing here decides layout.
export const DOCS_NAV: DocsNavItem[] = [
  { href: "/docs", labelEn: "Overview", labelJa: "概要" },
  { href: "/docs/getting-started", labelEn: "Getting Started", labelJa: "Getting Started" },
  {
    href: "",
    labelEn: "Scenarios",
    labelJa: "シナリオ",
    children: [
      { href: "/docs/scenario-kong", labelEn: "1. Switch to Kong", labelJa: "シナリオ1: Kong経由への切り替え" },
      { href: "/docs/scenario-kafka", labelEn: "2. Switch to Kafka", labelJa: "シナリオ2: Kafka経由への切り替え" },
      {
        href: "/docs/scenario-observability",
        labelEn: "3. Observability",
        labelJa: "シナリオ3: オブザーバビリティ",
      },
      { href: "/docs/scenario-keycloak", labelEn: "4. Keycloak", labelJa: "シナリオ4: Keycloakの利用" },
      { href: "/docs/scenario-vault", labelEn: "5. Vault", labelJa: "シナリオ5: Vaultの利用" },
      {
        href: "/docs/scenario-agentgateway",
        labelEn: "6. agentgateway (MCP)",
        labelJa: "シナリオ6: agentgateway経由でのMCPアクセス",
      },
    ],
  },
];

export function navLabel(item: DocsNavItem, locale: Locale): string {
  return locale === "ja" ? item.labelJa : item.labelEn;
}
