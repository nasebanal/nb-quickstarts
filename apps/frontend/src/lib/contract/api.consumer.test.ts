// A Consumer-side contract test: unlike api.test.ts (which mocks fetch
// entirely and never touches a real server) or Playwright's E2E tests
// (which exercise the real, currently-running backend), this file makes
// real HTTP requests against a Specmatic mock built from the shared
// checked-in contract (shared/openapi/openapi.yaml) and its
// examples - see shared/openapi/examples/. That answers a different question
// than either of those: "does this frontend's actual API usage - the
// paths it calls, the request shapes it sends, the response shapes it
// expects to parse - hold up against the *contract*, independent of
// whatever the real backend happens to be doing right now?"
//
// The mock returns our examples' exact values for requests that match one
// (e.g. GET /transactions/1), and schema-valid *random* values for
// anything else (e.g. plain GET /transactions or GET /accounts) - so most
// assertions here check shape/type, not specific values, except where an
// example guarantees one.
//
// Requires: make specmatic:mock-up (the mock reads the contract and its
// examples from shared/openapi/ - no real backend needed). Run via `make vitest:contract-test`, not
// `vitest:test` - this is deliberately a separate, opt-in command, since
// unlike every other vitest test it isn't self-contained (see vitest's
// own Makefile Note).
import { describe, expect, it } from "vitest";
import { API_BASE, createTransaction, listAccounts, listTransactions, login, UnauthorizedError } from "../api";

describe("api client against the Specmatic contract mock", () => {
  it("login returns a token and username", async () => {
    const result = await login("demo", "demo");
    expect(typeof result.token).toBe("string");
    expect(typeof result.username).toBe("string");
  });

  it("login with an incorrect password throws UnauthorizedError", async () => {
    const result = login("demo", "wrong");
    await expect(result).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(result).rejects.toThrow("invalid username or password");
  });

  it("listTransactions returns an array shaped like Transaction[]", async () => {
    const transactions = await listTransactions();
    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBeGreaterThan(0);
    for (const transaction of transactions) {
      expect(typeof transaction.id).toBe("number");
      expect(typeof transaction.name).toBe("string");
      expect(typeof transaction.quantity).toBe("number");
      expect(typeof transaction.source).toBe("string");
      expect(typeof transaction.createdAt).toBe("string");
    }
  });

  it("listAccounts returns an array shaped like AccountBalance[]", async () => {
    const balances = await listAccounts();
    expect(Array.isArray(balances)).toBe(true);
    expect(balances.length).toBeGreaterThan(0);
    for (const balance of balances) {
      expect(typeof balance.name).toBe("string");
      expect(typeof balance.balance).toBe("number");
      expect(typeof balance.eventCount).toBe("number");
    }
  });

  it("createTransaction with a valid token returns the created Transaction", async () => {
    // The body and Authorization header must match
    // shared/openapi/examples/post-transactions.json. Check the exact
    // example response so a generated fallback cannot silently pass.
    const { token } = await login("demo", "demo");
    const transaction = await createTransaction(token, { name: "Specmatic Test Account", quantity: 1 });
    expect(transaction).toEqual({
      id: 1,
      name: "Specmatic Test Account",
      quantity: 1,
      source: "api",
      createdAt: "2024-01-01T00:00:00Z",
    });
  });

  it.each(["invalid-token", "unrecognised-token", "nb1~ZGVtbw~invalid-signature"])(
    "createTransaction with token %s throws UnauthorizedError",
    async (token) => {
      // Use the successful example's body to check token matching independently.
      await expect(
        createTransaction(token, { name: "Specmatic Test Account", quantity: 1 }),
      ).rejects.toThrow(UnauthorizedError);
    },
  );

  it("POST /transactions without Authorization returns 401", async () => {
    // The API client always sends a bearer header, so send this request directly.
    const response = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Specmatic Test Account", quantity: 1 }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ detail: "invalid or missing token" });
  });
});
