import { getMode, setMode, status, type ResolverMode } from "@/lib/server/backendResolver";

// What the /api/backend proxy is doing right now, and the switch between the
// two ways it finds the backend (see lib/server/backendResolver.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(await status());
}

export async function PUT(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  if (body.mode !== "direct" && body.mode !== "consul") {
    return Response.json({ detail: "mode must be 'direct' or 'consul'" }, { status: 422 });
  }
  setMode(body.mode as ResolverMode);
  return Response.json({ ...(await status()), mode: getMode() });
}
