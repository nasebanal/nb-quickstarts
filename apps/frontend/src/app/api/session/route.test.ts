import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "./route";
import { SESSION_COOKIE, seal, unseal } from "../../../lib/server/sessionCookie";

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims: object) => `${b64url({ alg: "RS256" })}.${b64url(claims)}.signature`;
const IN_AN_HOUR = Math.floor(Date.now() / 1000) + 3600;
const TOKEN = jwt({ sub: "demo", exp: IN_AN_HOUR });
const URL_ = "http://localhost:5173/api/session";
const SAME_ORIGIN = { host: "localhost:5173", origin: "http://localhost:5173" };

const request = (method: string, init: { headers?: Record<string, string>; body?: unknown } = {}) =>
  new NextRequest(URL_, {
    method,
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const backendAnswers = (status: number, body: unknown = {}) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

const cookieValue = (response: Response): string => {
  const header = response.headers.get("set-cookie") ?? "";
  return decodeURIComponent(header.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`))?.[1] ?? "");
};

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/session", () => {
  it("asks the backend who the token belongs to and sets an HttpOnly cookie that holds the session", async () => {
    backendAnswers(200, { username: "demo", provider: "demo" });
    const response = await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ username: "demo", provider: "mock" });
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\//i);
    expect(header).toMatch(/Max-Age=\d+/i);
    expect(header).not.toMatch(/Secure/i); // http://localhost
    expect(unseal(cookieValue(response))).toMatchObject({ token: TOKEN, username: "demo", provider: "mock", idToken: null });
  });

  it("sends the token to the backend as a bearer, at SESSION_BACKEND_URL", async () => {
    vi.stubEnv("SESSION_BACKEND_URL", "http://backend.test:9000");
    backendAnswers(200, { username: "demo", provider: "demo" });
    await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://backend.test:9000/me");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    vi.unstubAllEnvs();
  });

  it("keeps the Keycloak id token, and the user name comes from the backend, not from the page", async () => {
    backendAnswers(200, { username: "keycloak-demo", provider: "keycloak" });
    const response = await POST(
      request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN, idToken: "id.token", username: "someone-else" } }),
    );
    expect(unseal(cookieValue(response))).toMatchObject({ username: "keycloak-demo", provider: "keycloak", idToken: "id.token" });
  });

  it("is Secure behind https", async () => {
    backendAnswers(200, { username: "demo", provider: "demo" });
    const response = await POST(
      request("POST", { headers: { ...SAME_ORIGIN, "x-forwarded-proto": "https" }, body: { token: TOKEN } }),
    );
    expect(response.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it("refuses a request from another site, and sets nothing", async () => {
    backendAnswers(200, { username: "demo", provider: "demo" });
    const response = await POST(
      request("POST", { headers: { host: "localhost:5173", origin: "https://evil.example" }, body: { token: TOKEN } }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a request the browser marks cross-site", async () => {
    const response = await POST(request("POST", { headers: { host: "localhost:5173", "sec-fetch-site": "cross-site" }, body: { token: TOKEN } }));
    expect(response.status).toBe(403);
  });

  it("answers 401 for a token the backend rejects, and sets nothing", async () => {
    backendAnswers(401, { detail: "invalid or missing token" });
    const response = await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("answers 502 when the backend is down or answers something else", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connection refused"); }));
    expect((await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }))).status).toBe(502);
    backendAnswers(500);
    expect((await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }))).status).toBe(502);
    backendAnswers(200, { nothing: "useful" });
    expect((await POST(request("POST", { headers: SAME_ORIGIN, body: { token: TOKEN } }))).status).toBe(502);
  });

  it("answers 400 without a token or with a body that is not JSON", async () => {
    expect((await POST(request("POST", { headers: SAME_ORIGIN, body: {} }))).status).toBe(400);
    const notJson = new NextRequest(URL_, { method: "POST", headers: SAME_ORIGIN, body: "not json" });
    expect((await POST(notJson)).status).toBe(400);
  });

  it("does not set a cookie for a token that has already expired", async () => {
    backendAnswers(200, { username: "demo", provider: "demo" });
    const expired = jwt({ sub: "demo", exp: Math.floor(Date.now() / 1000) - 10 });
    const response = await POST(request("POST", { headers: SAME_ORIGIN, body: { token: expired } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("GET /api/session", () => {
  const session = { token: TOKEN, username: "demo", provider: "mock" as const, idToken: null };

  it("returns the session the cookie holds, and is not cacheable", async () => {
    const response = await GET(request("GET", { headers: { cookie: `${SESSION_COOKIE}=${seal(session)}` } }));
    expect(await response.json()).toEqual({ session });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns no session without a cookie", async () => {
    const response = await GET(request("GET"));
    expect(await response.json()).toEqual({ session: null });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns no session for a cookie that does not open, and clears it", async () => {
    const response = await GET(request("GET", { headers: { cookie: `${SESSION_COOKIE}=v1.garbage` } }));
    expect(await response.json()).toEqual({ session: null });
    expect(response.headers.get("set-cookie")).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });
});

describe("DELETE /api/session", () => {
  it("clears the cookie", async () => {
    const response = await DELETE(request("DELETE", { headers: SAME_ORIGIN }));
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
    expect(header).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("refuses a request from another site", async () => {
    const response = await DELETE(request("DELETE", { headers: { host: "localhost:5173", origin: "https://evil.example" } }));
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
