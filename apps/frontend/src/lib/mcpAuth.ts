// The browser half of the MCP login (backend app/mcp_oauth.py). An MCP client
// such as Claude Code, told by /mcp's 401 where to log in, opens
// /mcp-authorize?client_id=...&redirect_uri=...&code_challenge=...&state=...
// in the browser. That page signs the user in with the app's usual login (demo
// or Keycloak), asks for consent, and sends the browser back to the client's
// redirect_uri with a code.
//
// A Keycloak login leaves this app for Keycloak's page and comes back through
// /auth/callback, which would drop the query string - so the request is parked
// in sessionStorage first, and the callback picks it up (takePendingMcpAuthorize).

export const MCP_AUTHORIZE_PATH = "/mcp-authorize";
const PENDING_KEY = "nb-quickstarts-mcp-pending";

export interface McpAuthorizeRequest {
  client_id: string;
  redirect_uri: string;
  state: string | null;
  code_challenge: string;
  code_challenge_method: string;
}

// Null when the query is not a (complete) authorization request.
export function parseMcpAuthorizeRequest(query: URLSearchParams): McpAuthorizeRequest | null {
  const clientId = query.get("client_id");
  const redirectUri = query.get("redirect_uri");
  const codeChallenge = query.get("code_challenge");
  if (!clientId || !redirectUri || !codeChallenge) return null;
  return {
    client_id: clientId,
    redirect_uri: redirectUri,
    state: query.get("state"),
    code_challenge: codeChallenge,
    code_challenge_method: query.get("code_challenge_method") ?? "S256",
  };
}

export function rememberPendingMcpAuthorize(search: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, `${MCP_AUTHORIZE_PATH}${search}`);
  } catch {
    // Storage disabled - a Keycloak login just won't resume the MCP request.
  }
}

// The page to go back to (path + query), once; null if no MCP login is pending.
export function takePendingMcpAuthorize(): string | null {
  try {
    const pending = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return pending;
  } catch {
    return null;
  }
}

// Where to send the browser when the user says no: the client's redirect_uri
// with the standard error, so it stops waiting instead of hanging.
export function denialUrl(request: McpAuthorizeRequest): string {
  const url = new URL(request.redirect_uri);
  url.searchParams.set("error", "access_denied");
  if (request.state) url.searchParams.set("state", request.state);
  return url.toString();
}
