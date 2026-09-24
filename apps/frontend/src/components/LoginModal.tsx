"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { login } from "@/lib/api";
import { beginKeycloakLogin, keycloakEnabled } from "@/lib/oidc";
import { useAuth } from "./AuthProvider";
import { useLocale } from "./LocaleProvider";

type LoginMode = "mock" | "keycloak";
const MODE_KEY = "nb-quickstarts-login-mode";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLocale();
  const { setAuth } = useAuth();
  const router = useRouter();
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  // With Keycloak configured (KEYCLOAK_ISSUER - see apps/docker-compose.yml)
  // the modal offers both ways in and remembers which you picked last;
  // without it there is only the demo login and no toggle at all. The demo
  // login stays the default even then, so the existing browser tests (and
  // anyone used to it) still find the username field first.
  const [mode, setMode] = useState<LoginMode>("mock");

  useEffect(() => {
    if (!keycloakEnabled) return;
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "mock" || saved === "keycloak") setMode(saved);
    } catch {
      // Storage disabled - keep the default.
    }
  }, []);

  const chooseMode = (next: LoginMode) => {
    setMode(next);
    setError("");
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Ignore - it just isn't remembered.
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const result = await login(usernameInput, passwordInput);
      setAuth(result.token, result.username);
      onClose();
      router.push("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const goToKeycloak = async (kind: "login" | "signup") => {
    setError("");
    try {
      await beginKeycloakLogin(kind, locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="nb-modal-overlay" data-testid="login-modal-overlay" onClick={onClose}>
      <div
        className="nb-modal"
        data-testid="login-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="nb-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{t.hero.loginButton}</h2>
        {keycloakEnabled && (
          <div className="nb-login-toggle" role="tablist" data-testid="login-mode-toggle">
            {(["mock", "keycloak"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={mode === option}
                className={mode === option ? "nb-login-toggle-active" : undefined}
                onClick={() => chooseMode(option)}
                data-testid={`login-mode-${option}`}
              >
                {option === "mock" ? t.login.modeMock : t.login.modeKeycloak}
              </button>
            ))}
          </div>
        )}
        {mode === "mock" ? (
          <>
            {keycloakEnabled && <p className="nb-login-hint">{t.login.mockHint}</p>}
            <form data-testid="login-form" onSubmit={onSubmit}>
              <label htmlFor="username">{t.hero.usernameLabel}</label>
              <input
                id="username"
                name="username"
                data-testid="username-input"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                required
                autoFocus
              />
              <label htmlFor="password">{t.hero.passwordLabel}</label>
              <input
                id="password"
                name="password"
                type="password"
                data-testid="password-input"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                required
              />
              <button type="submit" className="nb-cta-button" data-testid="login-submit">
                {t.hero.loginButton}
              </button>
            </form>
            <p className="nb-login-hint" data-testid="demo-credentials-hint">
              {t.login.demoCredentialsHint}
            </p>
          </>
        ) : (
          <div data-testid="keycloak-login-panel">
            <p className="nb-login-hint">{t.login.keycloakDescription}</p>
            <button
              type="button"
              className="nb-cta-button"
              onClick={() => goToKeycloak("login")}
              data-testid="keycloak-login-button"
            >
              {t.login.keycloakButton}
            </button>
            <button
              type="button"
              className="nb-modal-secondary"
              onClick={() => goToKeycloak("signup")}
              data-testid="keycloak-signup-button"
            >
              {t.login.signupButton}
            </button>
            <p className="nb-login-hint">{t.login.demoUserHint}</p>
          </div>
        )}
        <p className="error" data-testid="auth-error">
          {error}
        </p>
      </div>
    </div>
  );
}
