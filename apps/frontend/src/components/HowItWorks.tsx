"use client";

import { GitHubIcon } from "./icons";
import { useLocale } from "./LocaleProvider";

// The repository itself, not its README: the details live in /docs now, so the
// pointer here is to the source.
const GITHUB_URL = "https://github.com/nasebanal/nb-quickstarts";

// Icon shapes/colors and card styling mirror nb-dentiscope's "How It Works"
// section (60x60 rounded-2xl icon tile, light-blue gradient, #47b1e8
// stroke, .nb-feature-card).
const STEP_ICON_PATHS = [
  // up arrow — "start the stack"
  <path key="up" d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  // magnifying glass — "verify it"
  <>
    <circle key="c" cx="11" cy="11" r="7" />
    <line key="l" x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
  // down arrow — "tear it down"
  <path key="down" d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
];

export function HowItWorks() {
  const { t } = useLocale();

  return (
    <section className="nb-how-it-works container">
      <h2>{t.howItWorks.title}</h2>
      <div className="nb-feature-grid">
        {t.howItWorks.steps.map((step, i) => (
          <div key={step.title} className="nb-feature-card">
            <div className="nb-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#47b1e8" strokeWidth="2" width="28" height="28">
                {STEP_ICON_PATHS[i]}
              </svg>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
      <p className="nb-how-it-works-readme">
        {t.howItWorks.sourceNote}{" "}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="nb-source-link" data-testid="github-link">
          <GitHubIcon />
          {t.howItWorks.sourceLinkLabel}
        </a>
        {t.howItWorks.sourceNoteAfter}
      </p>
    </section>
  );
}
