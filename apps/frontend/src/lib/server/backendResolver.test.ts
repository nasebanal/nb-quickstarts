import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetInstances, getMode, healthyInstances, rotate, setMode, upstreamsFor } from "./backendResolver";

function consulAnswering(ids: string[]): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ids.map((id) => ({ Service: { ID: id, Address: id.replace("apps-", ""), Port: 8080 } })),
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  forgetInstances();
  delete process.env.BACKEND_RESOLVER;
  delete process.env.BACKEND_DIRECT_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rotate", () => {
  it("starts from a different item each turn and keeps the rest as fallbacks", () => {
    expect(rotate(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
    expect(rotate(["a", "b", "c"], 1)).toEqual(["b", "c", "a"]);
    expect(rotate(["a", "b", "c"], 4)).toEqual(["b", "c", "a"]);
  });
  it("copes with nothing to rotate", () => {
    expect(rotate([], 3)).toEqual([]);
  });
});

describe("direct mode", () => {
  it("is always the one configured address", async () => {
    process.env.BACKEND_DIRECT_URL = "http://backend-2:8080/";
    const first = await upstreamsFor("direct");
    const second = await upstreamsFor("direct");
    expect(first).toEqual([{ id: "direct", url: "http://backend-2:8080" }]);
    expect(second).toEqual(first);
  });

  it("does not need Consul at all", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await upstreamsFor("direct", fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("consul mode", () => {
  it("asks Consul for the passing instances only", async () => {
    const fetchFn = consulAnswering(["apps-backend-1"]);
    await healthyInstances(fetchFn);
    expect(vi.mocked(fetchFn).mock.calls[0][0]).toContain("/v1/health/service/apps-backend?passing");
  });

  it("takes the instances in turn, each request starting from the next one", async () => {
    const fetchFn = consulAnswering(["apps-backend-1", "apps-backend-2", "apps-backend-3"]);
    const firsts: string[] = [];
    for (let i = 0; i < 6; i++) firsts.push((await upstreamsFor("consul", fetchFn))[0].id);
    expect(new Set(firsts)).toEqual(new Set(["apps-backend-1", "apps-backend-2", "apps-backend-3"]));
    expect(firsts[0]).not.toBe(firsts[1]);
  });

  it("offers every healthy instance, so a failure can fall back to the next", async () => {
    const list = await upstreamsFor("consul", consulAnswering(["apps-backend-1", "apps-backend-2"]));
    expect(list.map((u) => u.url).sort()).toEqual(["http://backend-1:8080", "http://backend-2:8080"]);
  });

  it("caches the answer for a moment, so a burst is one lookup", async () => {
    const fetchFn = consulAnswering(["apps-backend-1"]);
    await healthyInstances(fetchFn, 1000);
    await healthyInstances(fetchFn, 1500);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await healthyInstances(fetchFn, 2500);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when Consul cannot be asked", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(upstreamsFor("consul", fetchFn)).rejects.toThrow(/HTTP 500/);
  });
});

describe("the mode", () => {
  it("starts from BACKEND_RESOLVER and can be switched at runtime", () => {
    process.env.BACKEND_RESOLVER = "consul";
    expect(getMode()).toBe("consul");
    setMode("direct");
    expect(getMode()).toBe("direct");
  });
});
