"use client";

import { useState } from "react";
import { HowItWorks } from "@/components/HowItWorks";
import { useLocale } from "@/components/LocaleProvider";
import { LoginModal } from "@/components/LoginModal";
import { TerminalIllustration } from "@/components/TerminalIllustration";

export default function Home() {
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

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
                  <a href="/api-docs" target="_blank" rel="noopener noreferrer">
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
