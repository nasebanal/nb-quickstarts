"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { ArchitectureDiagram } from "@/components/docs/ArchitectureDiagram";
import { ErDiagram } from "@/components/docs/ErDiagram";
import { useLocale } from "@/components/LocaleProvider";
import { overview } from "@/lib/docs/overview";

export default function DocsOverviewPage() {
  const { locale } = useLocale();
  return (
    <DocsArticle
      content={overview[locale]}
      extra={
        <>
          <ArchitectureDiagram
            label={locale === "ja" ? "nb-quickstartsのアーキテクチャ図" : "nb-quickstarts architecture diagram"}
          />
          <ArchitectureDiagram
            variant="consul"
            label={locale === "ja" ? "Consul(サービス検出)の図" : "Consul service discovery diagram"}
          />
          <ArchitectureDiagram
            variant="mcp"
            label={locale === "ja" ? "MCPアクセス経路の図" : "MCP access path diagram"}
          />
          <ErDiagram />
        </>
      }
    />
  );
}
