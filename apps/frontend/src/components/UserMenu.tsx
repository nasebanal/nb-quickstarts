"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useLocale } from "./LocaleProvider";

// Self-contained re-implementation of nb-shared-navigation's profile
// icon/dropdown (same plain inline person-glyph SVG, same dropdown shape:
// name header, red Logout row) — not a dependency on the private package,
// see Header.tsx's own note on why.
export function UserMenu() {
  const { t } = useLocale();
  const { username, provider, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="nb-nav-user-menu" ref={menuRef}>
      <button
        type="button"
        className="nb-nav-user-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t.app.userMenuLabel}
        aria-expanded={open}
        data-testid="user-menu-button"
      >
        <svg
          className="nb-nav-user-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
        </svg>
      </button>
      {open && (
        <div className="nb-nav-dropdown" data-testid="user-menu-dropdown">
          <div className="nb-nav-dropdown-header">
            <div className="nb-nav-dropdown-name" data-testid="user-menu-name">
              {profile?.displayName || username}
            </div>
            {profile?.displayName && (
              <div className="nb-nav-dropdown-sub" data-testid="user-menu-username">
                {username}
              </div>
            )}
            {provider === "keycloak" && (
              <div className="nb-provider-badge" data-testid="user-menu-provider">
                {t.login.keycloakBadge}
              </div>
            )}
          </div>
          <div className="nb-nav-dropdown-footer">
            <Link
              href="/profile"
              className="nb-nav-dropdown-item"
              onClick={() => setOpen(false)}
              data-testid="profile-link"
            >
              {t.profile.menuLabel}
            </Link>
            <button
              type="button"
              className="nb-nav-dropdown-item nb-nav-dropdown-logout"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              data-testid="logout-link"
            >
              {t.app.logoutButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
