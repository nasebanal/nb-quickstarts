// How the frontend *server* finds the backend - server-side only (the browser
// cannot ask Consul), used by the /api/backend proxy route.
//
// Two ways, switchable at runtime (GET/PUT /api/resolver, and the toggle on
// the accounts page) so the difference can be seen without a restart:
//
//   direct - one fixed address, BACKEND_DIRECT_URL (default http://backend:8080):
//            written down in configuration, the same instance every time;
//   consul - ask Consul (CONSUL_HTTP_ADDR) who the healthy `apps-backend`
//            instances are, and take them in turn. If one does not answer,
//            the next healthy one is tried. Nothing is written down: instances
//            can be added or stopped and this picks it up (within ~1s, the
//            length of the little cache).
//
// The mode a fresh server starts in comes from BACKEND_RESOLVER (direct or
// consul, default direct).

export type ResolverMode = "direct" | "consul";

export interface Upstream {
  /** "direct", or the Consul service ID (apps-backend-2). */
  id: string;
  /** Base URL, no trailing slash. */
  url: string;
}

const CACHE_TTL_MS = 1000;

let runtimeMode: ResolverMode | null = null;
let cache: { at: number; instances: Upstream[] } | null = null;
let turn = 0;

export function directUrl(): string {
  return (process.env.BACKEND_DIRECT_URL || "http://backend:8080").replace(/\/+$/, "");
}

export function consulAddr(): string {
  return (process.env.CONSUL_HTTP_ADDR || "http://consul:8500").replace(/\/+$/, "");
}

export function getMode(): ResolverMode {
  return runtimeMode ?? (process.env.BACKEND_RESOLVER === "consul" ? "consul" : "direct");
}

export function setMode(mode: ResolverMode): void {
  runtimeMode = mode;
}

export function forgetInstances(): void {
  cache = null;
}

export function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items;
  const start = ((by % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

interface ConsulHealthEntry {
  Service: { ID: string; Address: string; Port: number };
}

// The healthy instances Consul knows of right now (`?passing` leaves out any
// whose health check is failing), cached for a second so a burst of requests
// makes one lookup, not one each.
export async function healthyInstances(fetchFn: typeof fetch = fetch, now: number = Date.now()): Promise<Upstream[]> {
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.instances;
  const response = await fetchFn(`${consulAddr()}/v1/health/service/apps-backend?passing`, {
    signal: AbortSignal.timeout(2000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Consul answered HTTP ${response.status}`);
  const entries = (await response.json()) as ConsulHealthEntry[];
  const instances = entries
    .map((entry) => ({ id: entry.Service.ID, url: `http://${entry.Service.Address}:${entry.Service.Port}` }))
    .sort((a, b) => a.id.localeCompare(b.id));
  cache = { at: now, instances };
  return instances;
}

// The addresses to try for one request, in order. `direct` has exactly one.
// `consul` has every healthy instance, starting from a different one each
// time (round robin) - the rest are the fallbacks if the first does not answer.
export async function upstreamsFor(mode: ResolverMode, fetchFn: typeof fetch = fetch): Promise<Upstream[]> {
  if (mode === "direct") return [{ id: "direct", url: directUrl() }];
  const instances = await healthyInstances(fetchFn);
  return rotate(instances, turn++);
}

export interface ResolverStatus {
  mode: ResolverMode;
  directUrl: string;
  /** Instance names (backend-1, ...) - the same names X-Served-By reports - not addresses. */
  consul: { address: string; instances: string[] | null; error?: string };
}

// Consul service ID apps-backend-2 -> instance name backend-2 (what X-Served-By says).
export function instanceName(id: string): string {
  return id.replace(/^apps-/, "");
}

export async function status(fetchFn: typeof fetch = fetch): Promise<ResolverStatus> {
  let healthy: Upstream[] | null = null;
  let error: string | undefined;
  try {
    healthy = await healthyInstances(fetchFn);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return {
    mode: getMode(),
    directUrl: directUrl(),
    consul: { address: consulAddr(), instances: healthy ? healthy.map((instance) => instanceName(instance.id)) : null, error },
  };
}
