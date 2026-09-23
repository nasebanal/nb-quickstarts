"use client";

import { DocsArticle } from "@/components/docs/DocsArticle";
import { useLocale } from "@/components/LocaleProvider";
import { gettingStarted } from "@/lib/docs/gettingStarted";

export default function DocsGettingStartedPage() {
  const { locale } = useLocale();
  return <DocsArticle content={gettingStarted[locale]} />;
}
