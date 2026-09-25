"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { scenarioTesting } from "@/lib/docs/scenarioTesting";

export default function DocsTestingPage() {
  const { locale } = useLocale();
  return <DocsArticle content={scenarioTesting[locale]} />;
}
