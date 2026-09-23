"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioKong } from "@/lib/docs/scenarioKong";

export default function DocsScenarioKongPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioKong[locale]} />;
}
