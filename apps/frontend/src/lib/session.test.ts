import { describe, expect, it } from "vitest";
import { parseStoredSession, tokenExpiresAt } from "./session";

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims: object) => `${b64url({ alg: "RS256" })}.${b64url(claims)}.signature`;
const NOW = 1_800_000_000_000; // ms

describe("tokenExpiresAt", () => {
  it("reads exp (seconds) of a JWT as milliseconds", () => {
    expect(tokenExpiresAt(jwt({ exp: 1_800_000_100 }))).toBe(1_800_000_100_000);
  });

  it("returns null for anything that is not a JWT with a numeric exp", () => {
    expect(tokenExpiresAt("opaque-token")).toBeNull();
    expect(tokenExpiresAt("a.not-base64-json.c")).toBeNull();
    expect(tokenExpiresAt(jwt({ sub: "demo" }))).toBeNull();
    expect(tokenExpiresAt(jwt({ exp: "soon" }))).toBeNull();
  });
});

describe("parseStoredSession", () => {
  const valid = (extra: object = {}) =>
    JSON.stringify({ token: jwt({ exp: 1_800_000_100 }), username: "demo", provider: "mock", ...extra });

  it("restores a stored session", () => {
    expect(parseStoredSession(valid(), NOW)).toMatchObject({ username: "demo", provider: "mock", idToken: null });
  });

  it("keeps the Keycloak id token", () => {
    expect(parseStoredSession(valid({ provider: "keycloak", idToken: "id.token" }), NOW)).toMatchObject({
      provider: "keycloak",
      idToken: "id.token",
    });
  });

  it("defaults the provider to the demo login for an older entry", () => {
    expect(parseStoredSession(JSON.stringify({ token: "t", username: "demo" }), NOW)?.provider).toBe("mock");
  });

  it("drops an expired token", () => {
    expect(parseStoredSession(valid(), NOW + 200_000)).toBeNull();
  });

  it("keeps a token whose expiry cannot be read - the backend decides", () => {
    expect(parseStoredSession(JSON.stringify({ token: "opaque", username: "demo" }), NOW)).not.toBeNull();
  });

  it("returns null for nothing usable", () => {
    expect(parseStoredSession(null, NOW)).toBeNull();
    expect(parseStoredSession("", NOW)).toBeNull();
    expect(parseStoredSession("{not json", NOW)).toBeNull();
    expect(parseStoredSession(JSON.stringify({ username: "demo" }), NOW)).toBeNull();
    expect(parseStoredSession(JSON.stringify({ token: "t" }), NOW)).toBeNull();
  });
});
