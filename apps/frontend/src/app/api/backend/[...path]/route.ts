import type { NextRequest } from "next/server";
import { forgetInstances, getMode, upstreamsFor } from "@/lib/server/backendResolver";

// The browser's way to the backend when NEXT_PUBLIC_API_BASE=/api/backend: it
// calls this same-origin route (no CORS), and *this server* finds the backend -
// at one fixed address, or through Consul - and forwards the request. The
// response carries X-Resolved-Via (direct | consul) and X-Upstream (which
// address answered) next to the backend's own X-Served-By.
//
// Node runtime, not edge: it opens ordinary TCP connections to the backend
// and to Consul.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Headers that describe one particular hop, not the message: not forwarded either way.
const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length"]);
// Node's fetch has already decoded the body, so these no longer describe it.
const DECODED = new Set(["content-encoding"]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const mode = getMode();

  let upstreams;
  try {
    upstreams = await upstreamsFor(mode);
  } catch (err) {
    return Response.json({ detail: `could not ask Consul: ${err instanceof Error ? err.message : err}` }, { status: 502 });
  }
  if (upstreams.length === 0) {
    return Response.json({ detail: "Consul knows of no healthy apps-backend instance" }, { status: 502 });
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key)) headers.set(key, value);
  });
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const target = `/${path.join("/")}${request.nextUrl.search}`;
  let lastError = "";
  for (const upstream of upstreams) {
    try {
      const response = await fetch(`${upstream.url}${target}`, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
      });
      const out = new Headers();
      response.headers.forEach((value, key) => {
        if (!HOP_BY_HOP.has(key) && !DECODED.has(key)) out.set(key, value);
      });
      out.set("x-resolved-via", mode);
      out.set("x-upstream", upstream.url.replace("http://", ""));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: out });
    } catch (err) {
      // Did not answer (stopped, or not reachable): try the next one, and stop trusting the cached list.
      lastError = err instanceof Error ? err.message : String(err);
      forgetInstances();
    }
  }
  return Response.json({ detail: `no backend answered (${mode}): ${lastError}` }, { status: 502 });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
