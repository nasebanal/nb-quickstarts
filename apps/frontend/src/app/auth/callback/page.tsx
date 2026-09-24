"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { completeKeycloakLogin } from "@/lib/oidc";

// Where Keycloak sends the browser back to after login/sign-up
// (redirect_uri in lib/oidc.ts): trades the one-time ?code for tokens,
// stores the session, and moves on to /accounts.
export default function AuthCallbackPage() {
  const { t } = useLocale();
  const { setAuth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  // The code can be redeemed once; React strict mode runs effects twice in dev.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeKeycloakLogin(new URLSearchParams(window.location.search))
      .then((session) => {
        setAuth(session.token, session.username, { provider: "keycloak", idToken: session.idToken });
        router.replace("/accounts");
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  return (
    <main className="container">
      <div className="nb-content" data-testid="auth-callback">
        {error ? (
          <>
            <p className="error" data-testid="auth-callback-error">
              {t.login.callbackError}: {error}
            </p>
            <button type="button" className="nb-cta-button" onClick={() => router.replace("/")}>
              {t.login.backToHome}
            </button>
          </>
        ) : (
          <p>{t.login.callbackWorking}</p>
        )}
      </div>
    </main>
  );
}
