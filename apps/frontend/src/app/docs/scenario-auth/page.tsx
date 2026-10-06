"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioAuth } from "@/lib/docs/scenarioAuth";

export default function DocsScenarioAuthPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioAuth[locale]} />;
}
