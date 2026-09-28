import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

// Same shape as nb-landing-page's src/middleware.ts (and nb-recorder's own
// app/[lang] entry): only the bare "/" gets redirected, based on
// Accept-Language - every other path is left alone. A path that already
// carries a /en or /ja segment says what it wants; an unprefixed non-root
// path (an old bookmark, or a page reached before this existed) keeps
// working exactly as it did before, via next.config.ts's rewrite, which
// already makes /en and /ja mean something on every route, not just "/".
function preferredLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const languages = acceptLanguage
    .split(",")
    .map((entry) => {
      const [rawLocale, rawQuality] = entry.trim().split(";");
      const quality = rawQuality ? parseFloat(rawQuality.replace("q=", "")) : 1;
      return { locale: rawLocale.split("-")[0], quality: Number.isNaN(quality) ? 0 : quality };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { locale } of languages) {
    if ((LOCALES as string[]).includes(locale)) return locale as Locale;
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}`;
  return NextResponse.redirect(url);
}

// Only the exact root path - see the comment above for why every other
// unprefixed path is left alone rather than matched here too.
export const config = {
  matcher: "/",
};
