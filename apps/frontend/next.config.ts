import type { NextConfig } from "next";

// Keep this pattern in sync with LOCALES in src/lib/i18n.ts. Written out as a
// plain string (not imported from i18n.ts) because next.config.ts runs before
// the rest of the app is compiled - a literal regex fragment is one line to
// keep in sync by hand, and avoids depending on the app's own module graph
// being buildable at config-load time.
const LOCALE_PATTERN = "en|ja";

const nextConfig: NextConfig = {
  // Scenario 1's page moved from /docs/testing to /docs/scenario-testing, named like the other
  // scenario pages. The old path keeps working for bookmarks and links already shared - including
  // ones with a locale prefix, since the rewrite below only strips a leading /en or /ja and does
  // nothing to redirect a stale path underneath it.
  async redirects() {
    return [
      { source: "/docs/testing", destination: "/docs/scenario-testing", permanent: true },
      {
        source: `/:lang(${LOCALE_PATTERN})/docs/testing`,
        destination: "/:lang/docs/scenario-testing",
        permanent: true,
      },
    ];
  },
  // A leading /en or /ja segment is how a URL specifies the demo app's
  // language (LocaleProvider.tsx reads it back out via stripLocalePrefix in
  // src/lib/i18n.ts). Rather than duplicating every page under app/[lang]
  // (which would also mean rewriting every internal link in src/lib/docs'
  // static content, and touching the Keycloak OIDC redirect_uri), this
  // rewrite is transparent to the browser: the address bar keeps showing
  // /ja/accounts while Next actually serves the existing /accounts route
  // underneath it - runs for both full page loads and client-side <Link>/
  // router navigation. Redirects above still run first, so an old
  // /ja/docs/testing bookmark lands on /ja/docs/scenario-testing, not on
  // this rewrite's unprefixed destination.
  async rewrites() {
    return [
      { source: `/:lang(${LOCALE_PATTERN})`, destination: "/" },
      { source: `/:lang(${LOCALE_PATTERN})/:path*`, destination: "/:path*" },
    ];
  },
};

export default nextConfig;
