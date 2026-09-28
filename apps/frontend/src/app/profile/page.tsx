"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { updateProfile, UnauthorizedError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

// The signed-in user's profile: email (recorded, not editable - it comes from
// the seed data, or from Keycloak), display name and language. Saved to the
// backend (PUT /me/profile) into the users table; the language is also
// applied to the UI straight away, and again the next time this user logs in.
export default function ProfilePage() {
  const { t, applyProfileLocale, navigate } = useLocale();
  const { token, initializing, profile, setProfile, username, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<Locale>("en");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initializing && !token) navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate is stable enough (same convention as AuthProvider.tsx's setLocale); re-run only when auth state changes
  }, [initializing, token]);

  // Fill the form once the profile has loaded.
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setLanguage(profile.language);
  }, [profile]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setStatus(null);
    try {
      const saved = await updateProfile(token, { displayName, language });
      setProfile(saved);
      // Not setLocale: this must apply in place, right here, so the success
      // message below is still what the viewer sees next - the same reason
      // AuthProvider.tsx's own profile-language sync uses this instead of
      // setLocale (see its own comment). The saved language is also
      // reflected on the next login and the next unprefixed visit either way.
      applyProfileLocale(saved.language);
      setStatus({ ok: true, message: t.profile.updateSuccess });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        logout();
        return;
      }
      setStatus({ ok: false, message: t.profile.updateFailed });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  return (
    <main className="container">
      <div className="nb-content nb-profile" data-testid="profile-page">
        <h1>{t.profile.title}</h1>
        {!profile ? (
          <p>{t.profile.loading}</p>
        ) : (
          <form onSubmit={onSubmit} data-testid="profile-form">
            <div className="nb-profile-field">
              <label htmlFor="profile-username">{t.profile.username}</label>
              <input id="profile-username" value={username ?? profile.username} readOnly data-testid="profile-username" />
            </div>
            <div className="nb-profile-field">
              <label htmlFor="profile-email">{t.profile.email}</label>
              <input id="profile-email" value={profile.email ?? ""} readOnly data-testid="profile-email" />
              <p className="nb-profile-hint">{t.profile.emailDescription}</p>
            </div>
            <div className="nb-profile-field">
              <label htmlFor="profile-display-name">{t.profile.displayName}</label>
              <input
                id="profile-display-name"
                value={displayName}
                maxLength={64}
                placeholder={t.profile.displayNamePlaceholder}
                onChange={(event) => setDisplayName(event.target.value)}
                data-testid="profile-display-name"
              />
            </div>
            <div className="nb-profile-field">
              <label htmlFor="profile-language">{t.profile.language}</label>
              <select
                id="profile-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Locale)}
                data-testid="profile-language"
              >
                <option value="ja">{t.profile.languageJa}</option>
                <option value="en">{t.profile.languageEn}</option>
              </select>
            </div>
            <div className="nb-profile-field">
              <label>{t.profile.signedInVia}</label>
              <p className="nb-profile-hint" data-testid="profile-provider">
                {profile.provider === "keycloak" ? t.profile.providerKeycloak : t.profile.providerDemo}
              </p>
            </div>
            <button type="submit" className="nb-cta-button" disabled={saving} data-testid="profile-save">
              {t.profile.save}
            </button>
            {status && (
              <p className={status.ok ? "nb-profile-status-ok" : "error"} data-testid="profile-status">
                {status.message}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
