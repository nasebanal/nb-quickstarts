import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccount, getMe, listAccounts, listBalances, login, updateProfile } from "./api";

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: async () => body,
      text: async () => JSON.stringify(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("login posts username and password and returns the token", async () => {
    mockFetchOnce({ token: "abc123", username: "demo" });
    const result = await login("demo", "demo");
    expect(result.token).toBe("abc123");

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/auth/login");
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ username: "demo", password: "demo" });
  });

  it("listAccounts returns the parsed account list", async () => {
    mockFetchOnce([{ id: 1, name: "A", quantity: 1, source: "seed", createdAt: "now" }]);
    const accounts = await listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("A");
  });

  it("listBalances returns the summed-per-name balances", async () => {
    mockFetchOnce([{ name: "A", balance: 12, eventCount: 3 }]);
    const balances = await listBalances();
    expect(balances).toHaveLength(1);
    expect(balances[0]).toEqual({ name: "A", balance: 12, eventCount: 3 });
  });

  it("createAccount sends a bearer auth header", async () => {
    mockFetchOnce({ id: 2, name: "B", quantity: 2, source: "api", createdAt: "now" });
    await createAccount("token123", { name: "B", quantity: 2 });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token123");
  });

  it("throws on a non-OK response", async () => {
    mockFetchOnce({ detail: "invalid" }, false, 401);
    await expect(login("bad", "wrong")).rejects.toThrow(/401/);
  });

  it("getMe sends the bearer token and returns the profile", async () => {
    const profile = { username: "demo", email: "demo@nasebanal.com", displayName: "Demo User", language: "ja", provider: "demo" };
    mockFetchOnce(profile);
    expect(await getMe("tok")).toEqual(profile);

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/me");
    expect((options as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("updateProfile PUTs only what it is given", async () => {
    mockFetchOnce({ username: "demo", email: null, displayName: "New", language: "en", provider: "demo" });
    await updateProfile("tok", { displayName: "New", language: "en" });

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/me/profile");
    expect((options as RequestInit).method).toBe("PUT");
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ displayName: "New", language: "en" });
  });
});
