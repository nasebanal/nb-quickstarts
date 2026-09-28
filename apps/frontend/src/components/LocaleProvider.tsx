"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dictionaries, LOCALES, type Dictionary, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "nb-locale";
// Marks that the *next* page load's locale was just explicitly chosen via
// setLocale()'s own navigation, for consumeManualLocaleChoice() below.
const MANUAL_LOCALE_KEY = "nb-quickstarts-manual-locale";

interface LocaleContextValue {
  locale: Locale;
  // The URL's own /en or /ja segment, or null when the current path carries
  // none. Exposed so a consumer that might otherwise override `locale` from
  // some other source (AuthProvider.tsx's profile-language sync) can tell
  // whether the URL itself is already dictating the language and defer to
  // it - the URL prefix is meant to always win once present, same as
  // localeFromPathname()'s own doc comment says.
  urlLocale: Locale | null;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  // Prefixes `target` with the current URL's own /en or /ja segment, if it
  // has one - for building an href that should keep whatever locale-
  // prefixed (or unprefixed) "mode" the visitor is already in. Pair with
  // LocaleLink (not next/link) for an actual clickable link - see its own
  // comment for why.
  localePath: (target: string) => string;
  // Same idea as localePath, but for a programmatic navigation
  // (router.push/replace) instead of a Link's href - see its own comment
  // for why this can't just be `router.push(localePath(target))`.
  navigate: (target: string, options?: { replace?: boolean }) => void;
  // For AuthProvider.tsx's profile-language sync only - see its own
  // definition for why this must not navigate the way setLocale does.
  applyProfileLocale: (locale: Locale) => void;
  // For AuthProvider.tsx's profile-language sync only - see its own
  // definition for why it needs this.
  consumeManualLocaleChoice: () => boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// A leading /en or /ja path segment (see next.config.ts's rewrite, which
// makes e.g. /ja/accounts transparently serve the existing /accounts route)
// is the URL's own way of specifying the language, and wins whenever it's
// present - it's what makes /[lang] mean anything. A pathname with no such
// segment (a plain /accounts, or a bookmark from before this existed) has
// nothing to read, so the caller falls back to localStorage instead.
function localeFromPathname(pathname: string | null): Locale | null {
  const first = pathname?.split("/")[1] ?? "";
  return (LOCALES as string[]).includes(first) ? (first as Locale) : null;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Same SSR-safe shape as before this existed: every route here is a
  // static/client component, so the server (and the client's first,
  // hydration-matching render) has no reliable way to know the real
  // locale yet - starting at "en" and correcting below, after mount,
  // avoids a hydration mismatch between the server-rendered "en" markup
  // and a client render that jumped straight to "ja".
  const [locale, setLocaleState] = useState<Locale>("en");
  const urlLocale = localeFromPathname(pathname);

  useEffect(() => {
    if (urlLocale) {
      setLocaleState(urlLocale);
      // Remember it for the next unprefixed visit.
      try {
        window.localStorage.setItem(STORAGE_KEY, urlLocale);
      } catch {
        // ignore — per-viewer convenience only
      }
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ja") {
        setLocaleState(stored);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to "en".
    }
  }, [urlLocale]);

  // <html lang> starts as the root layout's static "en" (a server component
  // can't know the URL's locale segment before this provider mounts) -
  // corrected here once the real locale is known, same NO_FLASH_THEME_SCRIPT-
  // style direct DOM write RootLayout already uses for the theme attribute.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const localePath = (target: string): string => {
    if (!urlLocale) return target;
    // Avoid a double slash for the home path specifically (target === "/")
    // - next.config.ts's rewrite has a separate, exact rule for bare
    // /en or /ja, not just the /:lang/:path* one, so this keeps the two in
    // sync rather than relying on trailing-slash normalization to fix it up.
    return target === "/" ? `/${urlLocale}` : `/${urlLocale}${target}`;
  };

  // A locale-prefixed target can't reliably go through router.push/replace:
  // confirmed empirically that the App Router's client-side navigation does
  // not resolve next.config.ts's /:lang(en|ja)/:path* rewrite when the
  // destination is a different page than the current one - router.push
  // silently no-ops (no request is even sent, the URL never changes) even
  // though a full navigation to that exact same URL is served correctly (the
  // rewrite is applied server-side either way). A full navigation sidesteps
  // that entirely - see LocaleLink.tsx for the equivalent for a <Link>'s href.
  const navigate = (target: string, options?: { replace?: boolean }) => {
    const path = localePath(target);
    if (urlLocale) {
      if (options?.replace) window.location.replace(path);
      else window.location.assign(path);
      return;
    }
    if (options?.replace) router.replace(path);
    else router.push(path);
  };

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — per-viewer convenience only
    }
    // If the current URL already carries a locale segment, keep it in sync
    // too - /ja/accounts + picking English lands on /en/accounts, not a
    // mismatch between the address bar and what's displayed. A pathname with
    // no segment (the pre-existing, unprefixed routes) is left alone. A full
    // navigation, same reasoning as navigate() above.
    // urlLocale !== next matters, not just urlLocale being present: this
    // also used to be called on every login (before applyProfileLocale
    // existed) whenever the URL was already prefixed, and without this
    // check a login while already on the matching locale (next ===
    // urlLocale, nothing to change) would still window.location.assign the
    // exact URL already showing, forcing a full reload for no reason.
    if (pathname && urlLocale && urlLocale !== next) {
      // Mark that the page this navigates to was explicitly chosen, not
      // just landed on - see consumeManualLocaleChoice()'s own comment for
      // why AuthProvider.tsx needs to tell the two apart.
      try {
        sessionStorage.setItem(MANUAL_LOCALE_KEY, next);
      } catch {
        // ignore — worst case AuthProvider.tsx's sync runs once more than ideal
      }
      window.location.assign(`/${next}${pathname.slice(urlLocale.length + 1)}`);
    }
  };

  // Same as setLocale, but never navigates - for AuthProvider.tsx's
  // "apply the signed-in user's saved profile language" sync.
  // **Discovered empirically**: that sync runs from an async fetch
  // (GET /me) that resolves *after* LoginModal's own post-login
  // navigate("/accounts") has already fired - both this provider and the
  // page it's rendering into can be mid-unload by the time it resolves, so
  // a second window.location.assign here races the first one (observed:
  // the login redirect landing back on a bare locale root instead of
  // /accounts, because the profile-sync's own navigation won that race and
  // both then have to re-navigate to /accounts, which occasionally never
  // reconverges before a test's timeout). Login already carries you to
  // whatever locale prefix the URL already had (LoginModal's own navigate()
  // uses localePath, not the profile's language) - the profile's saved
  // language only needs to change what's displayed from here on, not force
  // a second, racing navigation on top of the first.
  const applyProfileLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — per-viewer convenience only
    }
  };

  // Whether *this* page load is the direct result of setLocale()'s own
  // navigation (the manual toggle) - and, if so, consumes (clears) the
  // marker so it doesn't also suppress some *later*, unrelated page's own
  // sync. AuthProvider.tsx's profile-language sync calls this to decide
  // whether to skip applyProfileLocale(): the profile's saved language is
  // meant to keep winning on every ordinary navigation while logged in
  // (matching this app's behavior from before per-page locale prefixes
  // existed at all, where nothing ever navigated on login and the display
  // simply carried over as React state) - it should lose exactly once,
  // immediately after the viewer explicitly picked something else via the
  // toggle, not for the rest of the session and not before.
  const consumeManualLocaleChoice = (): boolean => {
    try {
      const marked = sessionStorage.getItem(MANUAL_LOCALE_KEY);
      if (marked && marked === urlLocale) {
        sessionStorage.removeItem(MANUAL_LOCALE_KEY);
        return true;
      }
    } catch {
      // ignore — treat as no manual choice to honor
    }
    return false;
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        urlLocale,
        setLocale,
        t: dictionaries[locale],
        localePath,
        navigate,
        applyProfileLocale,
        consumeManualLocaleChoice,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
