"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import type { Locale } from "@/lib/i18n";

// Same Scalar setup as nb-api-specs' ScalarDoc.tsx (modern layout, no
// client-generator button). Unlike nb-api-specs, the backend serves its own
// live openapi.json, so this points Scalar at that URL directly instead of
// bundling a spec file at build time.
export function ScalarDoc({ url, server, locale }: { url: string; server: string; locale: Locale }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <ApiReferenceReact
        configuration={{
          url,
          servers: [{ url: server, description: "apps/backend" }],
          layout: "modern",
          hideClientButton: true,
          // Scalar's own UI chrome (search, nav labels, "Test Request",
          // ...), not the API's own content, which always renders in
          // whatever language openapi.yaml itself was written in (English) -
          // translating that is a documentation-authoring decision for that
          // file, not something this page can do for it. Scalar ships no
          // built-in Japanese translation (its `ApiReferenceBuiltInLocale`
          // union has none), only en/ru/es/fr/de/zh-CN/ar/pt, so "ja" here
          // falls back to Scalar's own English default rather than being a
          // literal no-op - still worth passing through (matches this app's
          // language automatically the day Scalar adds one, and this page
          // wasn't locale-aware in any way before this) rather than a much
          // larger, easy-to-get-wrong undertaking: a full custom Japanese
          // translations object for every one of Scalar's ~150 UI strings
          // (localization.translations), typed but unverified against the
          // actual rendered UI.
          localization: { locale },
        }}
      />
    </div>
  );
}
