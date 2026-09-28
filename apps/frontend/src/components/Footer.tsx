"use client";

import { ExternalLinkIcon } from "./icons";
import { useLocale } from "./LocaleProvider";

const NASEBANAL_URL = "https://www.nasebanal.com";
const LICENSE_URL = "https://github.com/nasebanal/nb-quickstarts/blob/main/LICENSE";

// Unified with nb-recorder's footer (companyHome/terms/privacy/contact,
// nasebanal.com/{lang}#about + /{lang}#contact) rather than nb-shared-
// navigation's own Footer.tsx directly - same shape, without the private
// package (see Header.tsx's own note on why this repo stays self-contained).
// No Terms of Service or Privacy Policy page exists for this demo tool, so
// License stands in for both. This repo's own source (GitHub) lives in the
// header instead (an icon-only button, next to LanguageToggle/ThemeToggle) -
// no reason to say it twice. What NASEBANAL Stack actually is lives on the
// pre-login landing page instead (HowItWorks.tsx), with an explanation next
// to it - "About Us" here is just the company pointer, not that.
export function Footer() {
  const { t, locale } = useLocale();
  const year = new Date().getFullYear();
  const links = [
    { href: `${NASEBANAL_URL}/${locale}#about`, label: t.footer.operatedBy },
    { href: LICENSE_URL, label: t.footer.license },
    { href: `${NASEBANAL_URL}/${locale}#contact`, label: t.footer.contact },
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
                <ExternalLinkIcon />
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
