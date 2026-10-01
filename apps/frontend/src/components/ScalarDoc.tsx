"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

// Same Scalar setup as nb-api-specs' ScalarDoc.tsx (modern layout, no
// client-generator button). Unlike nb-api-specs, the spec isn't bundled at
// build time: it's read from shared/openapi/openapi.yaml (mounted into the
// container) by the /api-specs/openapi.yaml route, so no backend is needed.
//
// Deliberately not locale-aware: Scalar's own UI chrome (search, nav
// labels, "Test Request", ...) ships no built-in Japanese translation (its
// `ApiReferenceBuiltInLocale` union: en/ru/es/fr/de/zh-CN/ar/pt, no ja), so
// passing this app's locale through here always rendered the exact same
// English chrome either way - no visible difference, just a confusing
// implication that /ja/api-specs was meant to be Japanese when it can't be.
// English, plainly, is simpler and equally accurate. The API's own content
// (descriptions, etc.) is unaffected either way - that always renders in
// whatever language openapi.yaml itself was written in, a documentation-
// authoring decision for that file, not something this component controls.
export function ScalarDoc({ url, server }: { url: string; server: string }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <ApiReferenceReact
        configuration={{
          url,
          servers: [{ url: server, description: "apps/backend" }],
          layout: "modern",
          hideClientButton: true,
        }}
      />
    </div>
  );
}
