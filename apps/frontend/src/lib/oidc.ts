// Keycloak login from the browser: OIDC Authorization Code flow with PKCE,
// written out by hand (a redirect out, a code back, one fetch) rather than
// pulled in from a library - the flow is short, and the point of this demo
// is to be able to see every step.
//
//   1. beginKeycloakLogin(): make a random code_verifier, send the browser to
//      Keycloak's login (or sign-up) page with the SHA-256 of it as the
//      code_challenge.
//   2. Keycloak authenticates the user itself - this app never sees the
//      password - and redirects back to /auth/callback with a one-time code.
//   3. completeKeycloakLogin(): trade that code + the original verifier for
//      the tokens at Keycloak's token endpoint. Only whoever started the
//      flow has the verifier, so a stolen code alone is useless.
//
// Off unless NEXT_PUBLIC_KEYCLOAK_ISSUER is set (the same KEYCLOAK_ISSUER the
// backend validates tokens against - see apps/docker-compose.yml), in which
// case none of this shows up in the UI at all.

export const KEYCLOAK_ISSUER = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ?? "";
export const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "apps-demo";
export const keycloakEnabled = KEYCLOAK_ISSUER !== "";

const PENDING_KEY = "nb-quickstarts-oidc-pending";

export interface KeycloakSession {
  token: string;
  username: string;
  idToken: string;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

// Only reads the claims (who this is) - it does not verify the signature.
// That's the backend's job (app/auth.py), against Keycloak's public keys;
// a browser has no reason to trust or re-check its own token.
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

// `signup` sends the browser to Keycloak's registration page instead of its
// login page - same flow after that (the new user is logged straight in).
export async function beginKeycloakLogin(mode: "login" | "signup", uiLocale: string): Promise<void> {
  const { verifier, challenge } = await createPkcePair();
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, verifier }));
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    ui_locales: uiLocale,
  });
  const endpoint = mode === "signup" ? "registrations" : "auth";
  window.location.assign(`${KEYCLOAK_ISSUER}/protocol/openid-connect/${endpoint}?${params}`);
}

export async function completeKeycloakLogin(query: URLSearchParams): Promise<KeycloakSession> {
  const error = query.get("error_description") ?? query.get("error");
  if (error) throw new Error(error);
  const code = query.get("code");
  const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null") as { state: string; verifier: string } | null;
  sessionStorage.removeItem(PENDING_KEY);
  if (!code || !pending || pending.state !== query.get("state")) {
    throw new Error("Login response did not match a login started in this browser tab");
  }
  const response = await fetch(`${KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KEYCLOAK_CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`Keycloak token request failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { access_token: string; id_token: string };
  const claims = decodeJwtPayload(body.access_token);
  const username = String(claims.preferred_username ?? claims.sub ?? "");
  return { token: body.access_token, username, idToken: body.id_token };
}

// Ends the Keycloak session too (not just this app's copy of the token), so
// the next "Log in with Keycloak" asks for credentials again instead of
// silently signing the same user back in.
export function keycloakLogoutUrl(idToken: string): string {
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: window.location.origin,
  });
  return `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout?${params}`;
}
