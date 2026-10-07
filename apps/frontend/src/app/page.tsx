"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { HowItWorks } from "@/components/HowItWorks";
import { useLocale } from "@/components/LocaleProvider";
import { LoginModal } from "@/components/LoginModal";
import { TerminalIllustration } from "@/components/TerminalIllustration";

export default function Home() {
  const { t, navigate } = useLocale();
  const { token, initializing } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Someone who is already signed in (the session cookie is shared by every tab) has nothing to do on the landing
  // page - it only offers a login - so they go straight on to the app. Waits for the session to be asked for
  // (`initializing`), or a reload would send a signed-in viewer nowhere.
  useEffect(() => {
    if (!initializing && token) navigate("/accounts", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate is stable enough (same convention as accounts/page.tsx); re-run only when the session changes
  }, [initializing, token]);

  return (
    <main>
      <div className="container">
        <div className="nb-hero">
          <div className="nb-hero-content">
            <h1>{t.hero.title}</h1>
            <p>{t.hero.description}</p>
            <button
              type="button"
              className="nb-cta-button"
              data-testid="login-open"
              onClick={() => setModalOpen(true)}
            >
              {t.hero.loginButton}
            </button>
          </div>

          <div className="nb-hero-visual">
            <div className="nb-hero-visual-card">
              <TerminalIllustration />
            </div>
            <div className="nb-hero-endpoints">
              <p className="nb-hero-endpoints-title">{t.hero.endpointsTitle}</p>
              <ul>
                <li>
                  Frontend —{" "}
                  <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer">
                    localhost:5173
                  </a>
                </li>
                <li>
                  Backend (REST + GraphQL) —{" "}
                  <a href="/api-specs" target="_blank" rel="noopener noreferrer">
                    localhost:8080
                  </a>
                </li>
                <li>MySQL — localhost:3306</li>
                <li>
                  MCP Server —{" "}
                  <a href="http://localhost:8080/mcp" target="_blank" rel="noopener noreferrer">
                    localhost:8080/mcp
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <HowItWorks />
      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}
