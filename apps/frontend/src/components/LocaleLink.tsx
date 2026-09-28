"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { LOCALES } from "@/lib/i18n";

function hasLocalePrefix(href: string): boolean {
  const first = href.split("/")[1] ?? "";
  return (LOCALES as string[]).includes(first);
}

interface LocaleLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

// A locale-prefixed href (build one with useLocale()'s localePath) can't
// use next/link: confirmed empirically that the App Router's client-side
// navigation does not resolve next.config.ts's /:lang(en|ja)/:path*
// rewrite when the destination is a different page than the current one -
// clicking it silently no-ops (no request is even sent, the URL never
// changes) even though a full navigation to that exact same URL is served
// correctly (the rewrite is applied server-side either way). Rendering a
// plain <a> instead sidesteps next/link's own client-side interception
// entirely, so the click is always a real, full navigation - see
// LocaleProvider.tsx's navigate() for the equivalent for a programmatic
// router.push/replace. An unprefixed href is unaffected by any of this and
// keeps next/link's normal soft navigation.
export function LocaleLink({ href, children, ...rest }: LocaleLinkProps) {
  if (hasLocalePrefix(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
