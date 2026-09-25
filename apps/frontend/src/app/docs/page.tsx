"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { ArchitectureDiagram } from "@/components/docs/ArchitectureDiagram";
import { useLocale } from "@/components/LocaleProvider";
import { overview } from "@/lib/docs/overview";

export default function DocsOverviewPage() {
  const { locale } = useLocale();
  return (
    <DocsArticle
      content={overview[locale]}
      slots={{
        // Rendered inside the Overview's "Structure" section (see slot: "architecture" in lib/docs/overview.ts).
        architecture: (
          <>
            <ArchitectureDiagram
              label={locale === "ja" ? "nb-quickstartsのアーキテクチャ図" : "nb-quickstarts architecture diagram"}
            />
            <ArchitectureDiagram
              variant="mcp"
              label={locale === "ja" ? "MCPアクセス経路の図" : "MCP access path diagram"}
            />
          </>
        ),
      }}
    />
  );
}
