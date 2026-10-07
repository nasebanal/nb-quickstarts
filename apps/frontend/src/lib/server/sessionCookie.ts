import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { parseStoredSession, tokenExpiresAt, type StoredSession } from "../session";

// The login session, kept in an HttpOnly cookie that only this Next.js server can read (the same idea as
// nb-*'s `__session_nasebanal`, which @auth0/nextjs-auth0 writes): the browser sends the cookie back to the
// server on every page request and the JavaScript on the page never sees it. What is inside is the session
// itself - the access token, the user name, the provider, the Keycloak id token - not a session id, so nothing
// is stored on the server. It is sealed with AES-256-GCM under a key derived (HKDF) from SESSION_SECRET: the
// browser can show the cookie in its developer tools, but without the secret the value is only ciphertext and
// changing a single byte of it makes it fail to open. Server-only: this file imports node:crypto.

export const SESSION_COOKIE = "nb_session";

const VERSION = "v1";
const INFO = "nb-quickstarts session cookie";
const AAD = Buffer.from(`${VERSION} ${SESSION_COOKIE}`);
// A cookie is limited to about 4KB; a sealed value past this keeps the session but drops the Keycloak id token
// (it is only the hint for Keycloak's logout).
const MAX_VALUE_LENGTH = 3800;
const MAX_AGE_SECONDS = 24 * 60 * 60;

// Only for `next dev` and the tests. In production a missing secret is an error, not a silent fallback to a value
// that is in the repository (the same reason the dev signing key must never reach production).
const DEV_SECRET = "nb-quickstarts-dev-session-secret-not-for-production";

export function sessionSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (at least 32 characters) in production");
  }
  return DEV_SECRET;
}

function keyFor(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "", INFO, 32));
}

function sealOnce(session: StoredSession, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(JSON.stringify(session)))), cipher.final()]);
  return `${VERSION}.${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")}`;
}

export function seal(session: StoredSession, secret: string = sessionSecret()): string {
  const sealed = sealOnce(session, secret);
  return sealed.length <= MAX_VALUE_LENGTH ? sealed : sealOnce({ ...session, idToken: null }, secret);
}

// The session a cookie value holds, or null for anything unusable: no value, another version, the wrong secret, a
// value that was changed, or a token that has expired.
export function unseal(
  value: string | undefined,
  secret: string = sessionSecret(),
  now: number = Date.now(),
): StoredSession | null {
  if (!value || !value.startsWith(`${VERSION}.`)) return null;
  try {
    const raw = Buffer.from(value.slice(VERSION.length + 1), "base64url");
    if (raw.length < 12 + 16 + 1) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), raw.subarray(0, 12));
    decipher.setAAD(AAD);
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = inflateRawSync(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])).toString("utf8");
    return parseStoredSession(json, now);
  } catch {
    return null;
  }
}

// How long the cookie lives: as long as the token, at most a day (the backend's login token lasts a day; a Keycloak
// access token only minutes). A token whose expiry cannot be read gets the full day.
export function sessionMaxAge(session: StoredSession, now: number = Date.now()): number {
  const expiresAt = tokenExpiresAt(session.token);
  const seconds = expiresAt === null ? MAX_AGE_SECONDS : Math.floor((expiresAt - now) / 1000);
  return Math.max(0, Math.min(seconds, MAX_AGE_SECONDS));
}

export function sessionCookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge };
}
