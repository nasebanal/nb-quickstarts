import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, seal, sessionCookieOptions, sessionMaxAge, unseal } from "../../../lib/server/sessionCookie";
import type { StoredSession } from "../../../lib/session";

// The login session in an HttpOnly cookie (see lib/server/sessionCookie.ts). The page's JavaScript cannot read the
// cookie; it asks this route instead:
//   GET    -> the session the cookie holds ({ session: null } when there is none), so a new tab, or a reload, finds
//             out it is signed in. This is where the access token reaches the page - the same as nb-*, where a server
//             component hands it down - and it is exactly what a script injected into the page could ask for too.
//   POST   -> after a login (the demo login, or Keycloak's code exchange) the page hands over the tokens it got; the
//             backend is asked who they belong to (GET /me) and the cookie is set.
//   DELETE -> the logout: the cookie is removed.
// Writes (POST, DELETE) refuse a request that comes from another site. The cookie is SameSite=Lax as well.

export const dynamic = "force-dynamic";

// The backend as the Next.js server reaches it (inside the compose network), not the address the browser uses.
const backendUrl = () => process.env.SESSION_BACKEND_URL || "http://backend:8080";

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isSecure(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

// A browser sends `Origin` on a POST/DELETE; it must be this site. `Sec-Fetch-Site` says the same, as the browser
// sees it. A request with neither (curl, a script) is not a browser being tricked, so it is let through.
function crossSite(request: NextRequest): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return true;
    } catch {
      return true;
    }
  }
  return request.headers.get("sec-fetch-site") === "cross-site";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = unseal(cookie);
  const response = json({ session });
  // A cookie that no longer opens (expired token, another secret, an old version) is cleared.
  if (cookie && !session) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (crossSite(request)) return json({ error: "cross-site request" }, 403);
  let body: { token?: unknown; idToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return json({ error: "token is required" }, 400);

  // Who do these tokens belong to? Not taken from the page: the backend says (it accepts its own tokens and Keycloak's).
  let profile: { username?: unknown; provider?: unknown };
  try {
    const answer = await fetch(`${backendUrl()}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (answer.status === 401) return json({ error: "invalid or missing token" }, 401);
    if (!answer.ok) return json({ error: "the backend refused the request" }, 502);
    profile = await answer.json();
  } catch {
    return json({ error: "the backend cannot be reached" }, 502);
  }
  if (typeof profile.username !== "string" || !profile.username) return json({ error: "unexpected answer" }, 502);

  const provider = profile.provider === "keycloak" ? "keycloak" : "mock";
  const session: StoredSession = {
    token,
    username: profile.username,
    provider,
    idToken: provider === "keycloak" && typeof body.idToken === "string" ? body.idToken : null,
  };
  const maxAge = sessionMaxAge(session);
  if (maxAge <= 0) return json({ error: "the token has expired" }, 401);

  const response = json({ username: session.username, provider });
  response.cookies.set(SESSION_COOKIE, seal(session), sessionCookieOptions(isSecure(request), maxAge));
  return response;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (crossSite(request)) return json({ error: "cross-site request" }, 403);
  const response = json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
