"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { stripLocalePrefix } from "@/lib/i18n";
import { useAuth } from "./AuthProvider";
import { ExternalLinkIcon, GitHubIcon } from "./icons";
import { LanguageToggle } from "./LanguageToggle";
import { LocaleLink } from "./LocaleLink";
import { useLocale } from "./LocaleProvider";
import { LoginModal } from "./LoginModal";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const GITHUB_URL = "https://github.com/nasebanal/nb-quickstarts";

// Self-contained: no external/private package (works air-gapped). The logo
// asset lives locally at public/logo.png. Title wording/colors match
// nb-dentiscope's navbar ("NASEBANAL" in --nb-logo-fg, "Demo" in the shared
// .nb-nav-brand-demo lime) without depending on @nasebanal/shared-navigation.
export function Header() {
  const { t, localePath, navigate } = useLocale();
  const { token } = useAuth();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  // stripLocalePrefix first - a locale-prefixed visit (/ja/docs/...) would
  // otherwise never match this check.
  const inDocs = stripLocalePrefix(pathname).startsWith("/docs");

  return (
    <header className="nb-header">
      {/* Inner content shares the page's 1200px container so the navbar
          lines up with the hero/how-it-works content below it. */}
      <div className="container nb-header-inner">
        {/* Everywhere else: a full reload of the current page (not a soft
            client nav, and not a navigation to "/") — matches
            nb-landing-page's logo-reloads-the-page behavior while staying on
            whatever route you're already on. The session survives because
            AuthProvider persists the token to sessionStorage (see
            AuthProvider.tsx).
            Inside /docs specifically: a soft nav back to /docs (the Overview
            page) instead - the Docs link opens this whole section in its own
            tab/window (see the header link below), so the logo there acts as
            that tab's own "home", the same way it acts as the app's home
            everywhere else. Reloading whatever scenario subpage you're deep
            in wouldn't do that; only navigating back to /docs itself does. */}
        <button
          type="button"
          className="nb-header-brand nb-header-brand-button"
          onClick={() => {
            if (inDocs) {
              navigate("/docs");
            } else {
              window.location.reload();
            }
          }}
        >
          <Image src="/logo.png" alt="NASEBANAL" width={36} height={36} priority />
          <span className="nb-header-title">
            NASEBANAL <span className="nb-nav-brand-demo">Demo</span>
          </span>
        </button>
        <div className="nb-header-actions">
          <LocaleLink
            href={localePath("/api-specs")}
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="api-docs-link"
            title={t.hero.opensInNewWindow}
          >
            {t.hero.apiReferenceLabel}
            <ExternalLinkIcon />
            <span className="nb-sr-only"> ({t.hero.opensInNewWindow})</span>
          </LocaleLink>
          {/* Same treatment as API Reference above - opens in a separate
              window/tab rather than navigating away, since /docs shares this
              same Header/Footer chrome (AppChrome only opts /api-specs out of
              it) and losing your place on whatever page you're on to read
              docs would be an unwelcome navigation. The icon/title/sr-only
              text (both here and above) make that explicit up front, rather
              than only being obvious after clicking. */}
          <LocaleLink
            href={localePath("/docs")}
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="docs-link"
            title={t.hero.opensInNewWindow}
          >
            {t.hero.docsLabel}
            <ExternalLinkIcon />
            <span className="nb-sr-only"> ({t.hero.opensInNewWindow})</span>
          </LocaleLink>
          {/* Points at the repo itself rather than a contact form - questions/
              discussion happen on GitHub (issues/discussions), same as any
              other OSS project. Icon-only, not text+ExternalLinkIcon like API
              Reference/Docs above: more compact, matches the icon-only shape
              LanguageToggle/ThemeToggle already use here, and GitHub's mark
              is recognizable enough on its own not to need a label - a
              pattern worth reusing as-is in any other NASEBANAL OSS app's
              header, unlike the rest of this one (built around this app's
              own routes/copy). */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nb-icon-button"
            data-testid="source-code-link"
            aria-label={t.hero.sourceCodeLabel}
            title={`${t.hero.sourceCodeLabel} (${t.hero.opensInNewWindow})`}
          >
            <GitHubIcon />
          </a>
          <LanguageToggle />
          <ThemeToggle />
          {token ? (
            <UserMenu />
          ) : (
            <button
              type="button"
              className="nb-header-login-link"
              onClick={() => setModalOpen(true)}
              data-testid="header-login-link"
            >
              {t.hero.loginButton}
            </button>
          )}
        </div>
      </div>
      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}
    </header>
  );
}
