"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { MermaidDiagram } from "@/components/docs/MermaidDiagram";
import { useLocale } from "@/components/LocaleProvider";
import { buildArchitectureDiagram } from "@/lib/docs/architectureDiagram";
import { overview } from "@/lib/docs/overview";

export default function DocsOverviewPage() {
  const { locale } = useLocale();
  return (
    <DocsArticle
      content={overview[locale]}
      extra={
        <MermaidDiagram
          chart={buildArchitectureDiagram(locale)}
          label={locale === "ja" ? "nb-quickstartsのアーキテクチャ図" : "nb-quickstarts architecture diagram"}
        />
      }
    />
  );
}
