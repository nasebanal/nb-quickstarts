// Thin client for the backend (apps/backend, FastAPI). This runs in the
// browser, so it must use the host-published URL, not the container name.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export interface Item {
  id: number;
  name: string;
  quantity: number;
  source: string;
  createdAt: string;
}

export interface ItemInput {
  name: string;
  quantity: number;
}

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

export function listItems(): Promise<Item[]> {
  return request("/items");
}

export function createItem(token: string, input: ItemInput): Promise<Item> {
  return request("/items", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}
