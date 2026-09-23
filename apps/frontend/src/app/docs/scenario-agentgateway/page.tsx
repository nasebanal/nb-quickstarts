"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioAgentgateway } from "@/lib/docs/scenarioAgentgateway";

export default function DocsScenarioAgentgatewayPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioAgentgateway[locale]} />;
}
