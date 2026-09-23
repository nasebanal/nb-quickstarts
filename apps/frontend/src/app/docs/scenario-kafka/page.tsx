"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioKafka } from "@/lib/docs/scenarioKafka";

export default function DocsScenarioKafkaPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioKafka[locale]} />;
}
