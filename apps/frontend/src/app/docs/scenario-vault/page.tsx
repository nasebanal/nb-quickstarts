"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioVault } from "@/lib/docs/scenarioVault";

export default function DocsScenarioVaultPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioVault[locale]} />;
}
