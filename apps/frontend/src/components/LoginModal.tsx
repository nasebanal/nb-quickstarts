"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { login } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import { useLocale } from "./LocaleProvider";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { setAuth } = useAuth();
  const router = useRouter();
  const [usernameInput, setUsernameInput] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const result = await login(usernameInput);
      setAuth(result.token, result.username);
      onClose();
      router.push("/accounts");
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
          <button type="submit" className="nb-cta-button" data-testid="login-submit">
            {t.hero.loginButton}
          </button>
        </form>
        <p className="error" data-testid="auth-error">
          {error}
        </p>
      </div>
    </div>
  );
}
