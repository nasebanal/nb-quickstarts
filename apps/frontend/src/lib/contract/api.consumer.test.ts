// Consumer contract tests make real HTTP requests through the frontend's
// API client against Specmatic's mock of shared/openapi/openapi.yaml.
// Expected values are hardcoded to match the shared examples, so a
// schema-valid generated response cannot silently pass these tests.
// Requires: make specmatic:mock-up, then make vitest:contract-test.
import { describe, expect, it } from "vitest";
import { API_BASE, createTransaction, listAccounts, listTransactions, login, UnauthorizedError } from "../api";

async function expectUnauthorized(result: Promise<unknown>, detail: string) {
  const error = await result.catch((error: unknown) => error);
  expect(error).toBeInstanceOf(UnauthorizedError);
  const message = (error as UnauthorizedError).message;
  const separator = message.indexOf(": ");
  expect(message.slice(0, separator)).toBe("401 Unauthorized");
  // Compare the complete JSON body independently of the mock's formatting.
  expect(JSON.parse(message.slice(separator + 2))).toEqual({ detail });
}

describe("api client against the Specmatic contract mock", () => {
  it("login returns a token and username", async () => {
    const result = await login("demo", "demo");
    expect(result).toEqual({
      token: "eyJhbGciOiJSUzI1NiIsImtpZCI6Im1YZmJOUEFmS0M0TUN1ZDAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJzdWIiOiJkZW1vIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZGVtbyIsImF1ZCI6Im5iLXF1aWNrc3RhcnRzLWFwaSIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjoyNTMzNzA3NjQ4MDB9.UyiPk2jO5eUHGQT3cx3dauWURkwn72UAqnObzYigkNtado0WUhAOiCfdPwZUeL4wOLLLTVMd7Tw3nEROLWB4Y0QFpXNgrjO_160-yhXafwUIyIrL0oBy56RI0wdFtRQ2Q6H3FFgv3BzRVdgPFezHXc6edRJ65i4dInaunGwpfx1xFKlSwlTCEUFNZOddTZsGOazT4xQqUxJylgFiIWssoXeNgxK3GiVvWo0RYwCmzYGQQ94dX25EabUHDyd-NkOh4A-wXmwxgWa-KqSivNf21lyBMXN3yqiittK_UV5QHj3pfxuclLnK6fAjXqSBIVHtnKPpfR8EsQO4lHQigZ6gOg",
      username: "demo",
    });
  });

  it("login with an incorrect password throws UnauthorizedError", async () => {
    await expectUnauthorized(login("demo", "wrong"), "invalid username or password");
  });

  it("listTransactions returns an array of Transactions", async () => {
    const { token } = await login("demo", "demo");
    expect(await listTransactions(token)).toEqual([
      { id: 1, name: "Cash", quantity: 100000, source: "seed", createdAt: "2024-01-01T00:00:00Z" },
      { id: 2, name: "Rent Expense", quantity: 30000, source: "seed", createdAt: "2024-01-01T00:00:00Z" },
    ]);
  });

  it("listAccounts returns an array of AccountBalance", async () => {
    const { token } = await login("demo", "demo");
    expect(await listAccounts(token)).toEqual([
      { name: "Cash", balance: 120000, eventCount: 3 },
      { name: "Rent Expense", balance: 30000, eventCount: 1 },
      { name: "Sales Revenue", balance: 50000, eventCount: 1 },
    ]);
  });

  it("listTransactions and listAccounts with an invalid token throw UnauthorizedError", async () => {
    // The mock answers 401 for the token written into the contract's 401 examples.
    await expectUnauthorized(listTransactions("invalid-token"), "invalid or missing token");
    await expectUnauthorized(listAccounts("invalid-token"), "invalid or missing token");
  });

  it("createTransaction with a valid token returns the created Transaction", async () => {
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

  it.each(["invalid-token", "unrecognised-token", "a.b.invalid-signature"])(
    "createTransaction with token %s throws UnauthorizedError",
    async (token) => {
      // Use the successful example's body to check token matching independently.
      await expectUnauthorized(
        createTransaction(token, { name: "Specmatic Test Account", quantity: 1 }),
        "invalid or missing token",
      );
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
