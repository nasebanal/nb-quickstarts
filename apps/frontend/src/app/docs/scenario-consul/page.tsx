"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioConsul } from "@/lib/docs/scenarioConsul";

export default function DocsScenarioConsulPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioConsul[locale]} />;
}
