import type { ReactNode } from "react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

// Shared by every /docs/* route (this file, not AppChrome, is what gives
// them the sidebar) - AppChrome already gives every route except
// /api-specs the normal Header/Footer, so that part needs no change here;
// this layout only adds the two-column docs shell inside it.
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container nb-docs-layout">
      <DocsSidebar />
      <div className="nb-docs-main">{children}</div>
    </main>
  );
}
