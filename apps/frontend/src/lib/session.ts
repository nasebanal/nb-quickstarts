// The signed-in session as it is kept in the browser (AuthProvider.tsx). Pure helpers, so they can be tested without
// a DOM: reading what was stored back, and not trusting a token that has already expired.

export type AuthProviderKind = "mock" | "keycloak";

export interface StoredSession {
  token: string;
  username: string;
  provider: AuthProviderKind;
  idToken: string | null;
}

// The `exp` claim of a JWT in milliseconds, or null when the token is not a JWT or has no `exp`.
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payload.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

// What was stored, or null when there is nothing usable: no entry, unreadable JSON, a missing token or username, or a
// token that has expired (it would only send the user to a 401 and a logout on the first request). A token whose
// expiry cannot be read is kept - the backend is the one that decides.
export function parseStoredSession(raw: string | null, now: number = Date.now()): StoredSession | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<StoredSession> & { provider?: AuthProviderKind };
    if (!stored.token || !stored.username) return null;
    const expiresAt = tokenExpiresAt(stored.token);
    if (expiresAt !== null && expiresAt <= now) return null;
    return {
      token: stored.token,
      username: stored.username,
      provider: stored.provider ?? "mock",
      idToken: stored.idToken ?? null,
    };
  } catch {
    return null;
  }
}
