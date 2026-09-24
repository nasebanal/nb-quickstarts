import { recordServed } from "./servedBy";

// Thin client for the backend (apps/backend, FastAPI). This runs in the
// browser, so it must use the host-published URL, not the container name.
// Exported read-only so the UI can show what it's actually talking to
// (see accounts/page.tsx) - useful since this can be repointed at Kong, a
// Specmatic stub, or a Microcks mock via NEXT_PUBLIC_API_BASE (see
// AGENTS.md's Kong section) without any other visible difference.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

// True when API_BASE is a path on this app itself (e.g. /api/backend) rather
// than a URL of the backend/Kong: the browser then calls the frontend server,
// which finds the backend (one fixed address, or through Consul) and forwards
// - see lib/server/backendResolver.ts.
export const VIA_FRONTEND_SERVER = API_BASE.startsWith("/");

// Event-sourced: each Account is one quantity-change event, not a
// standalone row with an absolute quantity. `quantity` is a signed delta -
// see apps/backend/app/models.py. A name's current balance is the sum of
// all its events (AccountBalance, from /accounts/balances).
export interface Account {
  id: number;
  name: string;
  quantity: number;
  source: string;
  createdAt: string;
}

export interface AccountInput {
  name: string;
  quantity: number;
}

export interface AccountBalance {
  name: string;
  balance: number;
  eventCount: number;
}

// Thrown specifically for a 401, so callers can tell "your session is no
// longer valid" (e.g. the backend restarted and its in-memory token store
// - see auth.py - was wiped, but sessionStorage still has the old token)
// apart from any other failure, and react to it (log out, prompt a fresh
// login) instead of just surfacing the raw response as a generic error.
export class UnauthorizedError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  recordServed(response.headers);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new UnauthorizedError(`${response.status} ${response.statusText}: ${body}`);
    }
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return (await response.json()) as T;
}

// Kong adds a `Via: kong/<version>` header to every response it proxies -
// a direct connection to the backend has no such header, so this is a
// real, verifiable signal (not just inferring from API_BASE's port
// number) of whether requests are actually going through Kong right now.
// Requires the backend's CORSMiddleware to expose_headers=["Via"] (see
// app/main.py) - by default, browsers hide non-safelisted response
// headers from JS on a cross-origin request, which this is (different
// port = different origin), so fetch()'s response.headers.get("via")
// silently returns null without that.
export async function checkViaKong(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/health`);
  return (response.headers.get("via") ?? "").toLowerCase().includes("kong");
}

const KAFKA_BRIDGE_HEALTH_URL =
  process.env.NEXT_PUBLIC_KAFKA_BRIDGE_HEALTH_URL ?? "http://localhost:8090";

// kafka-bridge (make kafka:bridge-up) is a separate, opt-in container with
// its own health endpoint (kafka/bridge/consumer.py's _HealthHandler) -
// not proxied through the backend or Kong, so apps/backend keeps zero
// Kafka dependency even for this check. Not running at all (kafka:up
// alone doesn't start it) is the common case, not an error, so this
// resolves false on any failure (connection refused, timeout, ...) rather
// than throwing - a caller checking "is it up" doesn't need to
// distinguish "not running" from "network error" here.
export async function checkKafkaBridge(): Promise<boolean> {
  try {
    const response = await fetch(`${KAFKA_BRIDGE_HEALTH_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function login(username: string, password: string): Promise<{ token: string; username: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// The current user's profile (GET /me). The email is recorded but not
// editable: it comes from the seed data for a demo user, and is mirrored from
// the token for a Keycloak user.
export interface Profile {
  username: string;
  email: string | null;
  displayName: string | null;
  language: "ja" | "en";
  provider: "demo" | "keycloak";
}

export interface ProfileInput {
  displayName?: string | null;
  language?: "ja" | "en";
}

export function getMe(token: string): Promise<Profile> {
  return request("/me", { headers: { Authorization: `Bearer ${token}` } });
}

export function updateProfile(token: string, input: ProfileInput): Promise<Profile> {
  return request("/me/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function listAccounts(): Promise<Account[]> {
  return request("/accounts");
}

export function listBalances(): Promise<AccountBalance[]> {
  return request("/accounts/balances");
}

export function createAccount(token: string, input: AccountInput): Promise<Account> {
  return request("/accounts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}
