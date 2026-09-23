"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioObservability } from "@/lib/docs/scenarioObservability";

export default function DocsScenarioObservabilityPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioObservability[locale]} />;
}
