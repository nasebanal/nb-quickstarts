import { describe, expect, it } from "vitest";
import { createPkcePair, decodeJwtPayload } from "./oidc";

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("createPkcePair", () => {
  it("makes a URL-safe verifier and a challenge that is its SHA-256", async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    expect(challenge).toBe(base64Url(new Uint8Array(digest)));
  });

  it("uses a fresh verifier each time", async () => {
    const [a, b] = await Promise.all([createPkcePair(), createPkcePair()]);
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe("decodeJwtPayload", () => {
  it("reads the claims, including non-ASCII ones", () => {
    const payload = { preferred_username: "keycloak-demo", name: "山田 太郎", exp: 1234 };
    const encoded = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
    expect(decodeJwtPayload(`header.${encoded}.signature`)).toEqual(payload);
  });
});
