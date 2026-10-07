import { describe, expect, it } from "vitest";
import { seal, sessionCookieOptions, sessionMaxAge, sessionSecret, unseal } from "./sessionCookie";
import type { StoredSession } from "../session";

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims: object) => `${b64url({ alg: "RS256" })}.${b64url(claims)}.signature`;
const NOW = 1_800_000_000_000;
const SECRET = "a-test-secret-that-is-at-least-32-characters-long";
const session = (extra: Partial<StoredSession> = {}): StoredSession => ({
  token: jwt({ sub: "demo", exp: 1_800_000_000 + 3600 }),
  username: "demo",
  provider: "mock",
  idToken: null,
  ...extra,
});

describe("seal / unseal", () => {
  it("round-trips a session", () => {
    expect(unseal(seal(session(), SECRET), SECRET, NOW)).toEqual(session());
  });

  it("is ciphertext: nothing of the session can be read from the value", () => {
    const sealed = seal(session({ username: "very-recognisable-name" }), SECRET);
    expect(sealed).not.toContain("very-recognisable-name");
    expect(Buffer.from(sealed.split(".")[1], "base64url").toString("utf8")).not.toContain("demo");
  });

  it("uses a fresh IV, so the same session seals to a different value each time", () => {
    expect(seal(session(), SECRET)).not.toBe(seal(session(), SECRET));
  });

  it("does not open with another secret", () => {
    expect(unseal(seal(session(), SECRET), "another-secret-that-is-at-least-32-characters", NOW)).toBeNull();
  });

  it("does not open once a single character was changed", () => {
    const sealed = seal(session(), SECRET);
    const i = sealed.length - 5;
    const tampered = sealed.slice(0, i) + (sealed[i] === "A" ? "B" : "A") + sealed.slice(i + 1);
    expect(unseal(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects nothing, garbage, another version and a truncated value", () => {
    expect(unseal(undefined, SECRET, NOW)).toBeNull();
    expect(unseal("", SECRET, NOW)).toBeNull();
    expect(unseal("not-a-sealed-value", SECRET, NOW)).toBeNull();
    expect(unseal("v2." + "A".repeat(80), SECRET, NOW)).toBeNull();
    expect(unseal("v1.AAAA", SECRET, NOW)).toBeNull();
  });

  it("drops a session whose token has expired", () => {
    expect(unseal(seal(session(), SECRET), SECRET, NOW + 2 * 3600 * 1000)).toBeNull();
  });

  it("keeps the Keycloak id token, and sheds it only when the cookie would not fit", () => {
    const small = seal(session({ provider: "keycloak", idToken: "id.token.value" }), SECRET);
    expect(unseal(small, SECRET, NOW)?.idToken).toBe("id.token.value");
    // Random text does not compress, so this id token cannot fit in a cookie.
    const huge = Buffer.from(Array.from({ length: 6000 }, () => Math.floor(Math.random() * 256))).toString("base64url");
    const shed = seal(session({ provider: "keycloak", idToken: huge }), SECRET);
    expect(shed.length).toBeLessThanOrEqual(3800);
    expect(unseal(shed, SECRET, NOW)).toMatchObject({ username: "demo", provider: "keycloak", idToken: null });
  });
});

describe("sessionMaxAge", () => {
  it("follows the token, at most a day", () => {
    expect(sessionMaxAge(session({ token: jwt({ exp: 1_800_000_000 + 300 }) }), NOW)).toBe(300);
    expect(sessionMaxAge(session({ token: jwt({ exp: 1_800_000_000 + 10 * 86400 }) }), NOW)).toBe(86400);
  });

  it("gives a token without a readable expiry the full day, and an expired one nothing", () => {
    expect(sessionMaxAge(session({ token: "opaque" }), NOW)).toBe(86400);
    expect(sessionMaxAge(session({ token: jwt({ exp: 1_700_000_000 }) }), NOW)).toBe(0);
  });
});

describe("sessionSecret", () => {
  it("uses SESSION_SECRET when it is long enough", () => {
    expect(sessionSecret({ SESSION_SECRET: SECRET })).toBe(SECRET);
  });

  it("falls back to a development value outside production", () => {
    expect(sessionSecret({}).length).toBeGreaterThanOrEqual(32);
    expect(sessionSecret({ SESSION_SECRET: "short" }).length).toBeGreaterThanOrEqual(32);
  });

  it("refuses to run in production without a real secret", () => {
    expect(() => sessionSecret({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
    expect(() => sessionSecret({ NODE_ENV: "production", SESSION_SECRET: "short" })).toThrow();
  });
});

describe("sessionCookieOptions", () => {
  it("is HttpOnly and SameSite=Lax, and Secure only over https", () => {
    expect(sessionCookieOptions(false, 60)).toEqual({ httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 });
    expect(sessionCookieOptions(true, 60).secure).toBe(true);
  });
});
