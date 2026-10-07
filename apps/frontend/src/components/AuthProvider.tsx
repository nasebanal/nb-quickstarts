"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getMe, type Profile } from "@/lib/api";
import { keycloakLogoutUrl } from "@/lib/oidc";
import { type AuthProviderKind, type StoredSession } from "@/lib/session";
import { useLocale } from "./LocaleProvider";

// "mock" = the demo POST /auth/login (a username and a password);
// "keycloak" = a real OIDC login (lib/oidc.ts).
export type { AuthProviderKind };

interface AuthContextValue {
  token: string | null;
  username: string | null;
  provider: AuthProviderKind | null;
  // The user's profile (GET /me) - email, display name, language - loaded
  // once there is a token, and updated by the profile page after a save.
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  // True until the session has been asked for once (GET /api/session). Consumers
  // (e.g. the /accounts guard) must not redirect on a missing token while this
  // is true, or a plain page reload would bounce a logged-in viewer home
  // before the session has a chance to come back.
  initializing: boolean;
  // Both finish only once the server has set / cleared the cookie, so a caller that goes on to navigate (a full page
  // load, which asks the server for the session at once) is never ahead of the cookie.
  setAuth: (token: string, username: string, extra?: { provider?: AuthProviderKind; idToken?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The session lives in an HttpOnly cookie that only the Next.js server reads (app/api/session/route.ts), the same
// idea as nb-*'s shared session cookie: it survives a reload, is shared by every tab of the browser, and is not in
// sessionStorage or anywhere else the page's JavaScript could read it from. The page asks the server for it
// (GET /api/session) when it loads and whenever another tab says it changed. It used to be kept in sessionStorage,
// which is per tab - a login in one tab meant a login in every other, and the MCP login page (opened in a new tab by
// the client) always asked for the password again.
const CHANNEL = "nb-quickstarts-auth";

async function fetchSession(): Promise<StoredSession | null> {
  const response = await fetch("/api/session", { cache: "no-store" });
  if (!response.ok) return null;
  const { session } = (await response.json()) as { session: StoredSession | null };
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [provider, setProvider] = useState<AuthProviderKind | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { applyProfileLocale, consumeManualLocaleChoice, urlLocale } = useLocale();
  // Guards against re-fetching the profile pointlessly on every render this
  // effect happens to run for the same token - not a "once per login"
  // locale guard (that's consumeManualLocaleChoice()'s job now, since a ref
  // does not survive the full reloads a locale-prefixed URL involves - see
  // LocaleProvider.tsx's own comment on the bug that caused).
  const fetchedFor = useRef<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  // Counts the sign-ins and sign-outs this tab has done itself. An answer from the server that was asked for
  // before one of them is stale - e.g. the question the page asks when it loads can come back after the Keycloak
  // callback has already signed the user in, and would sign them out again - so it is dropped.
  const localChanges = useRef(0);

  const apply = (session: StoredSession | null) => {
    setToken(session?.token ?? null);
    setUsername(session?.username ?? null);
    setProvider(session?.provider ?? null);
    setIdToken(session?.idToken ?? null);
  };

  useEffect(() => {
    // Ask the server who is signed in, now and whenever another tab signs in or out.
    const refresh = () => {
      const askedAt = localChanges.current;
      return fetchSession()
        .then((session) => {
          if (localChanges.current === askedAt) apply(session);
        })
        .catch(() => {
          // The server cannot be reached - keep what the page has.
        });
    };
    let live = true;
    refresh().finally(() => {
      if (live) setInitializing(false);
    });
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = () => void refresh();
    }
    return () => {
      live = false;
      channel.current?.close();
      channel.current = null;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      fetchedFor.current = null;
      return;
    }
    if (fetchedFor.current === token) return;
    fetchedFor.current = token;
    let cancelled = false;
    getMe(token)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        // The profile's saved language keeps winning on every ordinary
        // navigation while logged in (same as before per-page locale
        // prefixes existed at all - nothing ever navigated on login back
        // then, so the display just carried over as React state) - it only
        // ever loses right after the viewer explicitly picked something
        // else via the language toggle, which is exactly what
        // consumeManualLocaleChoice() tells apart (see its own comment).
        // A page reached via its own /en or /ja URL segment is a third case
        // neither of the above covers: urlLocale is what makes that prefix
        // mean anything at all (see LocaleProvider.tsx's own
        // localeFromPathname() comment), so it must keep winning over a
        // saved profile language too, not just over a just-made manual
        // toggle - otherwise visiting /en/accounts while signed in to an
        // account with a Japanese-language profile silently redisplayed
        // Japanese anyway, contradicting what the URL itself asked for.
        if (!urlLocale && !consumeManualLocaleChoice()) {
          applyProfileLocale(loaded.language);
        }
      })
      .catch(() => {
        // An expired/invalid token is handled where a request is actually
        // made (the accounts page); the profile just stays empty until then.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyProfileLocale/consumeManualLocaleChoice are stable enough; re-run only when the token changes
  }, [token]);

  const setAuth = async (
    nextToken: string,
    nextUsername: string,
    extra: { provider?: AuthProviderKind; idToken?: string } = {},
  ) => {
    localChanges.current += 1;
    // The page knows at once...
    apply({ token: nextToken, username: nextUsername, provider: extra.provider ?? "mock", idToken: extra.idToken ?? null });
    // ...and the server keeps it: it asks the backend who the token belongs to and sets the cookie.
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: nextToken, idToken: extra.idToken }),
      });
      if (response.ok) channel.current?.postMessage("changed");
    } catch {
      // Without the cookie the session lasts until the page is closed.
    }
  };

  const logout = async () => {
    const leavingKeycloak = provider === "keycloak" && idToken;
    localChanges.current += 1;
    // The cookie goes first: a page that loads next must not find the old session again.
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {
      // Ignore - the page is signed out either way.
    }
    apply(null);
    setProfile(null);
    channel.current?.postMessage("changed");
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
