"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { testing } from "@/lib/docs/testing";

export default function DocsTestingPage() {
  const { locale } = useLocale();
  return <DocsArticle content={testing[locale]} />;
}
