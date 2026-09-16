"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

// Same Scalar setup as nb-api-specs' ScalarDoc.tsx (modern layout, no
// client-generator button). Unlike nb-api-specs, the backend serves its own
// live openapi.json, so this points Scalar at that URL directly instead of
// bundling a spec file at build time.
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
