"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { LoginModal } from "@/components/LoginModal";
import { authorizeMcpClient, describeMcpClient } from "@/lib/api";
import {
  denialUrl,
  parseMcpAuthorizeRequest,
  rememberPendingMcpAuthorize,
  takePendingMcpAuthorize,
  type McpAuthorizeRequest,
} from "@/lib/mcpAuth";

// Where an MCP client's browser login lands (see lib/mcpAuth.ts): sign in with
// the app's usual login, then Allow hands an authorization code back to the
// client. The backend only issues it for a request whose client_id and
// redirect_uri it registered itself (POST /oauth/register).
export default function McpAuthorizePage() {
  const { t } = useLocale();
  const { token, username, initializing } = useAuth();
  const [request, setRequest] = useState<McpAuthorizeRequest | null>(null);
  const [parsed, setParsed] = useState(false);
  const [clientName, setClientName] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const found = parseMcpAuthorizeRequest(query);
    setRequest(found);
    setParsed(true);
    if (!found) return;
    rememberPendingMcpAuthorize(window.location.search);
    describeMcpClient(found.client_id)
      .then((client) => setClientName(client.client_name))
      .catch(() => undefined); // The name is only for display.
  }, []);

  // Not signed in (and the session has been asked for): open the login.
  useEffect(() => {
    if (!initializing && request && !token) setLoginOpen(true);
  }, [initializing, request, token]);

  const allow = async () => {
    if (!request || !token) return;
    setWorking(true);
    setError("");
    try {
      const { redirect_to } = await authorizeMcpClient(token, request);
      takePendingMcpAuthorize();
      window.location.assign(redirect_to);
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deny = () => {
    if (!request) return;
    takePendingMcpAuthorize();
    window.location.assign(denialUrl(request));
  };

  return (
    <main className="container">
      <div className="nb-panel">
        <div className="nb-content" data-testid="mcp-authorize">
          <h1>{t.login.mcpTitle}</h1>
          {parsed && !request && <p className="error">{t.login.mcpInvalidRequest}</p>}
          {request && !token && !initializing && (
            <>
              <p>{t.login.mcpNeedLogin}</p>
              <button type="button" className="nb-cta-button" onClick={() => setLoginOpen(true)} data-testid="mcp-login-open">
                {t.login.mcpOpenLogin}
              </button>
            </>
          )}
          {request && token && (
            <>
              <p>
                <strong>{clientName || t.login.mcpUnknownClient}</strong> {t.login.mcpIntro}
              </p>
              <p className="nb-login-hint">
                {t.login.mcpSignedInAs}: <strong data-testid="mcp-username">{username}</strong>
              </p>
              {working ? (
                <p>{t.login.mcpAuthorizing}</p>
              ) : (
                <div className="nb-button-row">
                  <button type="button" className="nb-cta-button" onClick={allow} data-testid="mcp-allow">
                    {t.login.mcpAllow}
                  </button>
                  <button type="button" className="nb-cta-button nb-cta-button-outline" onClick={deny} data-testid="mcp-deny">
                    {t.login.mcpDeny}
                  </button>
                </div>
              )}
            </>
          )}
          {error && (
            <p className="error" data-testid="mcp-error">
              {t.login.mcpFailed}: {error}
            </p>
          )}
        </div>
      </div>
      {loginOpen && !token && <LoginModal onClose={() => setLoginOpen(false)} onLoggedIn={() => setLoginOpen(false)} />}
    </main>
  );
}
