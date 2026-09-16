"use client";

import { useLocale } from "./LocaleProvider";

const GITHUB_URL = "https://github.com/nasebanal/nb-quickstarts";
const NASEBANAL_URL = "https://www.nasebanal.com";
const LICENSE_URL = "https://github.com/nasebanal/nb-quickstarts/blob/main/LICENSE";

// Layout/classes/colors mirror nb-shared-navigation's Footer.tsx +
// .nb-footer* styles — links adapted for an OSS tool (no About/Terms/
// Privacy/Contact pages here) instead of copied verbatim.
export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();
  const links = [
    { href: GITHUB_URL, label: "GitHub" },
    { href: NASEBANAL_URL, label: t.footer.nasebanalStack },
    { href: LICENSE_URL, label: t.footer.license },
  ];

  return (
    <footer className="nb-footer">
      <div className="nb-footer-container container">
        <p>
          © {year} NASEBANAL. {t.footer.rightsReserved}
        </p>
        <p className="nb-footer-links">
          {links.map((link, i) => (
            <span key={link.href}>
              {i > 0 && <span className="nb-footer-link-separator"> | </span>}
              <a href={link.href} className="nb-footer-link" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
