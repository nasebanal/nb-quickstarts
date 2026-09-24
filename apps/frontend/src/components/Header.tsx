"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { ExternalLinkIcon } from "./icons";
import { LanguageToggle } from "./LanguageToggle";
import { useLocale } from "./LocaleProvider";
import { LoginModal } from "./LoginModal";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

// Self-contained: no external/private package (works air-gapped). The logo
// asset lives locally at public/logo.png. Title wording/colors match
// nb-dentiscope's navbar ("NASEBANAL" in --nb-logo-fg, "Demo" in the shared
// .nb-nav-brand-demo lime) without depending on @nasebanal/shared-navigation.
export function Header() {
  const { t, locale } = useLocale();
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const inDocs = pathname?.startsWith("/docs") ?? false;

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
              router.push("/docs");
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
          <Link
            href="/api-specs"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="api-docs-link"
            title={t.hero.opensInNewWindow}
          >
            {t.hero.apiReferenceLabel}
            <ExternalLinkIcon />
            <span className="nb-sr-only"> ({t.hero.opensInNewWindow})</span>
          </Link>
          {/* Same treatment as API Reference above - opens in a separate
              window/tab rather than navigating away, since /docs shares this
              same Header/Footer chrome (AppChrome only opts /api-specs out of
              it) and losing your place on whatever page you're on to read
              docs would be an unwelcome navigation. The icon/title/sr-only
              text (both here and above) make that explicit up front, rather
              than only being obvious after clicking. */}
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="docs-link"
            title={t.hero.opensInNewWindow}
          >
            {t.hero.docsLabel}
            <ExternalLinkIcon />
            <span className="nb-sr-only"> ({t.hero.opensInNewWindow})</span>
          </Link>
          {/* nasebanal.com's own contact form (its landing page has one section per
              language: /ja#contact, /en#contact) - an external link, so same
              treatment as API Reference / Docs above: new tab, icon, sr-only note. */}
          <a
            href={`https://www.nasebanal.com/${locale}#contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="contact-link"
            title={t.hero.opensInNewWindow}
          >
            {t.hero.contactLabel}
            <ExternalLinkIcon />
            <span className="nb-sr-only"> ({t.hero.opensInNewWindow})</span>
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
