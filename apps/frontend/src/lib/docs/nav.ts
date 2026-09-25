import type { Locale } from "@/lib/i18n";

export interface DocsNavItem {
  href: string;
  labelEn: string;
  labelJa: string;
  children?: DocsNavItem[];
}

// The sidebar's tree: two top-level pages, then one "Scenarios" group
// (a heading, not a page of its own - no href) holding the seven walkthroughs
// in the order the user asked for them. Scenario 1 (verifying the demo app with the test tools)
// lives at /docs/scenario-testing, named like the other scenario pages.
// DocsSidebar.tsx renders this straight through with nested <ul>s; nothing here decides layout.
export const DOCS_NAV: DocsNavItem[] = [
  { href: "/docs", labelEn: "Overview", labelJa: "概要" },
  { href: "/docs/getting-started", labelEn: "Getting Started", labelJa: "Getting Started" },
  {
    href: "",
    labelEn: "Scenarios",
    labelJa: "シナリオ",
    children: [
      { href: "/docs/scenario-testing", labelEn: "1. Verify the demo app", labelJa: "シナリオ1: デモアプリの動作検証" },
      { href: "/docs/scenario-kong", labelEn: "2. Switch to Kong", labelJa: "シナリオ2: Kong経由への切り替え" },
      { href: "/docs/scenario-kafka", labelEn: "3. Switch to Kafka", labelJa: "シナリオ3: Kafka経由への切り替え" },
      {
        href: "/docs/scenario-observability",
        labelEn: "4. Observability",
        labelJa: "シナリオ4: オブザーバビリティ",
      },
      { href: "/docs/scenario-keycloak", labelEn: "5. Keycloak", labelJa: "シナリオ5: Keycloakの利用" },
      { href: "/docs/scenario-vault", labelEn: "6. Vault", labelJa: "シナリオ6: Vaultの利用" },
      {
        href: "/docs/scenario-agentgateway",
        labelEn: "7. agentgateway (MCP)",
        labelJa: "シナリオ7: agentgateway経由でのMCPアクセス",
      },
    ],
  },
];

export function navLabel(item: DocsNavItem, locale: Locale): string {
  return locale === "ja" ? item.labelJa : item.labelEn;
}
