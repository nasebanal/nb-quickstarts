"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { stripLocalePrefix } from "@/lib/i18n";
import { Footer } from "./Footer";
import { Header } from "./Header";

// /api-specs renders Scalar's own full-page reference UI (its own sidebar,
// header, theme toggle - see ScalarDoc.tsx), same as nb-api-specs. Our own
// Header/Footer on top of that just doubles up chrome and pushes Scalar's
// own "Powered by Scalar" + dark-mode toggle out of the viewport, so this
// route opts out of both entirely rather than stacking two navbars.
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // stripLocalePrefix first - a locale-prefixed visit (/ja/api-specs) would
  // otherwise never match this check and show doubled-up chrome.
  const hideChrome = stripLocalePrefix(pathname).startsWith("/api-specs");

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
