"use client";

import { ScalarDoc } from "@/components/ScalarDoc";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export default function ApiDocsPage() {
  return <ScalarDoc url={`${API_BASE}/openapi.json`} server={API_BASE} />;
}
