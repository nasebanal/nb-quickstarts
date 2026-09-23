// A Consumer-side contract test: unlike api.test.ts (which mocks fetch
// entirely and never touches a real server) or Playwright's E2E tests
// (which exercise the real, currently-running backend), this file makes
// real HTTP requests against a Specmatic stub built from apps/backend's
// checked-in contract (apps/backend/openapi.yaml) - see
// specmatic/bin/prepare_contract.sh. That answers a different question
// than either of those: "does this frontend's actual API usage - the
// paths it calls, the request shapes it sends, the response shapes it
// expects to parse - hold up against the *contract*, independent of
// whatever the real backend happens to be doing right now?"
//
// The stub returns our examples' exact values for requests that match one
// (e.g. GET /accounts/1), and schema-valid *random* values for anything
// else (e.g. plain GET /accounts) - so most assertions here check shape/
// type, not specific values, except where an example guarantees one.
//
// Requires: make apps:up (the stub still needs the real backend once, to
// fetch the schema + build examples from - see specmatic:stub-up) and
// make specmatic:stub-up. Run via `make vitest:contract-test`, not
// `vitest:test` - this is deliberately a separate, opt-in command, since
// unlike every other vitest test it isn't self-contained (see vitest's
// own Makefile Note).
import { describe, expect, it } from "vitest";
import { createAccount, listAccounts, listBalances, login, UnauthorizedError } from "../api";

describe("api client against the Specmatic contract stub", () => {
  it("login returns a token and username", async () => {
    const result = await login("E001");
    expect(typeof result.token).toBe("string");
    expect(typeof result.username).toBe("string");
  });

  it("listAccounts returns an array shaped like Account[]", async () => {
    const accounts = await listAccounts();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThan(0);
    for (const account of accounts) {
      expect(typeof account.id).toBe("number");
      expect(typeof account.name).toBe("string");
      expect(typeof account.quantity).toBe("number");
      expect(typeof account.source).toBe("string");
      expect(typeof account.createdAt).toBe("string");
    }
  });

  it("listBalances returns an array shaped like AccountBalance[]", async () => {
    const balances = await listBalances();
    expect(Array.isArray(balances)).toBe(true);
    expect(balances.length).toBeGreaterThan(0);
    for (const balance of balances) {
      expect(typeof balance.name).toBe("string");
      expect(typeof balance.balance).toBe("number");
      expect(typeof balance.eventCount).toBe("number");
    }
  });

  it("createAccount with a valid token returns the created Account", async () => {
    // Body must match prepare_contract.sh's post-accounts.json example
    // exactly - the stub only returns its canned 201 for a matching body,
    // regardless of the token's actual value (confirmed empirically: the
    // stub doesn't validate auth, it dispatches purely on method+path+body
    // shape/value, falling back to a schema-random response - not
    // necessarily 201 - for anything that doesn't match an example).
    const { token } = await login("E001");
    const account = await createAccount(token, { name: "Specmatic Test Account", quantity: 1 });
    expect(typeof account.id).toBe("number");
    expect(typeof account.name).toBe("string");
    expect(typeof account.quantity).toBe("number");
    expect(typeof account.source).toBe("string");
    expect(typeof account.createdAt).toBe("string");
  });

  it("createAccount with an invalid token throws UnauthorizedError", async () => {
    // Body must match prepare_contract.sh's post-accounts-401.json example
    // exactly, same reasoning as above - the 401 is keyed off this exact
    // body, not off the (deliberately nonsense) token value.
    await expect(createAccount("not-a-real-token", { name: "x", quantity: 1 })).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
