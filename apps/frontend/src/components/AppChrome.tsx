"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

// /api-specs renders Scalar's own full-page reference UI (its own sidebar,
// header, theme toggle - see ScalarDoc.tsx), same as nb-api-specs. Our own
// Header/Footer on top of that just doubles up chrome and pushes Scalar's
// own "Powered by Scalar" + dark-mode toggle out of the viewport, so this
// route opts out of both entirely rather than stacking two navbars.
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith("/api-specs");

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
