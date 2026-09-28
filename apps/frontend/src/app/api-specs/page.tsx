"use client";

import { useLocale } from "@/components/LocaleProvider";
import { ScalarDoc } from "@/components/ScalarDoc";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export default function ApiSpecsPage() {
  const { locale } = useLocale();
  return <ScalarDoc url={`${API_BASE}/openapi.json`} server={API_BASE} locale={locale} />;
}
