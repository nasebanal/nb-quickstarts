"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { LanguageToggle } from "./LanguageToggle";
import { useLocale } from "./LocaleProvider";
import { LoginModal } from "./LoginModal";
import { ThemeToggle } from "./ThemeToggle";

// Self-contained: no external/private package (works air-gapped). The logo
// asset lives locally at public/logo.png. Title wording/colors match
// nb-dentiscope's navbar ("NASEBANAL" in --nb-logo-fg, "Demo" in the shared
// .nb-nav-brand-demo lime) without depending on @nasebanal/shared-navigation.
export function Header() {
  const { t } = useLocale();
  const { token, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <header className="nb-header">
      {/* Inner content shares the page's 1200px container so the navbar
          lines up with the hero/how-it-works content below it. */}
      <div className="container nb-header-inner">
        {/* Full reload of the current page (not a soft client nav, and not a
            navigation to "/") — matches nb-landing-page's logo-reloads-the-
            page behavior while staying on whatever route you're already on.
            The session survives because AuthProvider persists the token to
            sessionStorage (see AuthProvider.tsx). */}
        <button
          type="button"
          className="nb-header-brand nb-header-brand-button"
          onClick={() => {
            window.location.reload();
          }}
        >
          <Image src="/logo.png" alt="NASEBANAL" width={36} height={36} priority />
          <span className="nb-header-title">
            NASEBANAL <span className="nb-nav-brand-demo">Demo</span>
          </span>
        </button>
        <div className="nb-header-actions">
          <Link
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-header-nav-link"
            data-testid="api-docs-link"
          >
            API Docs
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          {token ? (
            <button type="button" className="nb-header-login-link" onClick={logout} data-testid="logout-link">
              {t.app.logoutButton}
            </button>
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
