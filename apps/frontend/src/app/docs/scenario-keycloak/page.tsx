"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioKeycloak } from "@/lib/docs/scenarioKeycloak";

export default function DocsScenarioKeycloakPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioKeycloak[locale]} />;
}
