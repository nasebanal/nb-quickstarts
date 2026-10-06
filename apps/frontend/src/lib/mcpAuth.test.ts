import { describe, expect, it } from "vitest";
import { denialUrl, parseMcpAuthorizeRequest } from "./mcpAuth";

describe("parseMcpAuthorizeRequest", () => {
  it("reads the parameters an MCP client sends", () => {
    const query = new URLSearchParams({
      client_id: "nbm~abc~sig",
      redirect_uri: "http://localhost:54321/callback",
      code_challenge: "challenge",
      code_challenge_method: "S256",
      state: "xyz",
      response_type: "code",
    });
    expect(parseMcpAuthorizeRequest(query)).toEqual({
      client_id: "nbm~abc~sig",
      redirect_uri: "http://localhost:54321/callback",
      state: "xyz",
      code_challenge: "challenge",
      code_challenge_method: "S256",
    });
  });

  it("defaults the PKCE method to S256 and allows a missing state", () => {
    const query = new URLSearchParams({ client_id: "c", redirect_uri: "http://localhost:1/cb", code_challenge: "x" });
    expect(parseMcpAuthorizeRequest(query)).toMatchObject({ state: null, code_challenge_method: "S256" });
  });

  it("is null when the request is incomplete", () => {
    expect(parseMcpAuthorizeRequest(new URLSearchParams({ client_id: "c" }))).toBeNull();
    expect(parseMcpAuthorizeRequest(new URLSearchParams())).toBeNull();
  });
});

describe("denialUrl", () => {
  it("sends access_denied and the state back to the client", () => {
    const url = new URL(
      denialUrl({
        client_id: "c",
        redirect_uri: "http://localhost:54321/callback",
        state: "xyz",
        code_challenge: "x",
        code_challenge_method: "S256",
      }),
    );
    expect(url.origin + url.pathname).toBe("http://localhost:54321/callback");
    expect(url.searchParams.get("error")).toBe("access_denied");
    expect(url.searchParams.get("state")).toBe("xyz");
  });
});
