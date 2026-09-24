import { expect, test } from "@playwright/test";

// The frontend's own server can find the backend two ways (a fixed address, or
// Consul) and forwards /api/backend/* to it. Consul is optional in this repo,
// so only the fixed-address path is exercised here; the mode is put back the
// way it was found.
test("the frontend server forwards to the backend at a fixed address", async ({ request }) => {
  const before = (await (await request.get("/api/resolver")).json()).mode;
  try {
    const set = await request.put("/api/resolver", { data: { mode: "direct" } });
    expect(set.ok()).toBeTruthy();
    expect((await set.json()).mode).toBe("direct");

    const health = await request.get("/api/backend/health");
    expect(health.status()).toBe(200);
    expect(health.headers()["x-resolved-via"]).toBe("direct");
    expect(health.headers()["x-served-by"]).toBeTruthy();
    expect(health.headers()["x-upstream"]).toBeTruthy();
  } finally {
    await request.put("/api/resolver", { data: { mode: before } });
  }
});

test("the resolver rejects an unknown mode", async ({ request }) => {
  const res = await request.put("/api/resolver", { data: { mode: "carrier-pigeon" } });
  expect(res.status()).toBe(422);
});
