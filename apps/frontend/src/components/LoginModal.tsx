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
  const [employeeCodeInput, setEmployeeCodeInput] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const result = await login(employeeCodeInput);
      setAuth(result.token, result.employeeCode);
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
          <label htmlFor="employee-code">{t.hero.usernameLabel}</label>
          <input
            id="employee-code"
            name="employeeCode"
            data-testid="employee-code-input"
            value={employeeCodeInput}
            onChange={(event) => setEmployeeCodeInput(event.target.value)}
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
