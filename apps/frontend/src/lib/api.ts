// Thin client for the backend (apps/backend, FastAPI). This runs in the
// browser, so it must use the host-published URL, not the container name.
// Exported read-only so the UI can show what it's actually talking to
// (see accounts/page.tsx) - useful since this can be repointed at Kong, a
// Specmatic stub, or a Microcks mock via NEXT_PUBLIC_API_BASE (see
// AGENTS.md's Kong section) without any other visible difference.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

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
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new UnauthorizedError(`${response.status} ${response.statusText}: ${body}`);
    }
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return (await response.json()) as T;
}

export function login(employeeCode: string): Promise<{ token: string; employeeCode: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ employeeCode }),
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
