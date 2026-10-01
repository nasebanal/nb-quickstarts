import { readFile } from "node:fs/promises";

// Serves the contract for /api-specs' Scalar view straight from shared/
// (mounted read-only at /shared - see apps/docker-compose.yml), so the API
// reference doesn't depend on the backend being up. SHARED_OPENAPI_PATH
// overrides the location, e.g. for running `next dev` outside Docker.
const SPEC_PATH = process.env.SHARED_OPENAPI_PATH ?? "/shared/openapi/openapi.yaml";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const spec = await readFile(SPEC_PATH, "utf-8");
    return new Response(spec, { headers: { "Content-Type": "application/yaml; charset=utf-8" } });
  } catch {
    return new Response(`OpenAPI contract not found at ${SPEC_PATH}`, { status: 500 });
  }
}
