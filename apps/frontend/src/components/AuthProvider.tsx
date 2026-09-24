"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getMe, type Profile } from "@/lib/api";
import { keycloakLogoutUrl } from "@/lib/oidc";
import { useLocale } from "./LocaleProvider";

// "mock" = the demo POST /auth/login (a username, no password);
// "keycloak" = a real OIDC login (lib/oidc.ts).
export type AuthProviderKind = "mock" | "keycloak";

interface AuthContextValue {
  token: string | null;
  username: string | null;
  provider: AuthProviderKind | null;
  // The user's profile (GET /me) - email, display name, language - loaded
  // once there is a token, and updated by the profile page after a save.
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  // True until the sessionStorage restore below has run once. Consumers
  // (e.g. the /accounts guard) must not redirect on a missing token while this
  // is true, or a plain page reload would bounce a logged-in viewer home
  // before the restore has a chance to run.
  initializing: boolean;
  setAuth: (token: string, username: string, extra?: { provider?: AuthProviderKind; idToken?: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "nb-quickstarts-auth";

// Persisted to sessionStorage (cleared when the tab/browser closes, unlike
// localStorage) rather than kept in-memory-only, so a full page reload -
// e.g. clicking the logo, which reloads whatever page you're already on -
// doesn't log the viewer out. Read back inside an effect (not during the
// initial render) since the server has no sessionStorage and an initial
// mismatch would break hydration.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [provider, setProvider] = useState<AuthProviderKind | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { setLocale } = useLocale();
  // The profile's language is applied once per login, not on every load of
  // the profile: after that the header's language toggle is free to differ
  // without the next fetch quietly undoing it.
  const languageAppliedFor = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as {
          token: string;
          username: string;
          provider?: AuthProviderKind;
          idToken?: string;
        };
        setToken(restored.token);
        setUsername(restored.username);
        setProvider(restored.provider ?? "mock");
        setIdToken(restored.idToken ?? null);
      }
    } catch {
      // Private browsing / storage disabled — fall back to in-memory only.
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      languageAppliedFor.current = null;
      return;
    }
    let cancelled = false;
    getMe(token)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        if (languageAppliedFor.current !== token) {
          languageAppliedFor.current = token;
          setLocale(loaded.language);
        }
      })
      .catch(() => {
        // An expired/invalid token is handled where a request is actually
        // made (the accounts page); the profile just stays empty until then.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setLocale is stable enough; re-run only when the token changes
  }, [token]);

  const setAuth = (
    nextToken: string,
    nextUsername: string,
    extra: { provider?: AuthProviderKind; idToken?: string } = {},
  ) => {
    const nextProvider = extra.provider ?? "mock";
    setToken(nextToken);
    setUsername(nextUsername);
    setProvider(nextProvider);
    setIdToken(extra.idToken ?? null);
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token: nextToken, username: nextUsername, provider: nextProvider, idToken: extra.idToken }),
      );
    } catch {
      // Ignore — the session just won't survive a reload.
    }
  };

  const logout = () => {
    const leavingKeycloak = provider === "keycloak" && idToken;
    setToken(null);
    setUsername(null);
    setProvider(null);
    setIdToken(null);
    setProfile(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    // A Keycloak login also has a session at Keycloak itself - end it too,
    // or "Log in with Keycloak" would sign the same user straight back in.
    if (leavingKeycloak) window.location.assign(keycloakLogoutUrl(idToken));
  };

  return (
    <AuthContext.Provider value={{ token, username, provider, profile, setProfile, initializing, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
