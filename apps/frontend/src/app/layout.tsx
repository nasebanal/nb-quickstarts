import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";
import { AuthProvider } from "@/components/AuthProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

// "NASEBANAL <product> | <description>" — same convention as
// nb-dentiscope/nb-recorder's generateMetadata (e.g. `NASEBANAL Dentiscope
// | ${dict.page.description}`).
const PAGE_DESCRIPTION = "Verification toolkit for the NASEBANAL Stack";

export const metadata: Metadata = {
  title: `NASEBANAL Quickstarts | ${PAGE_DESCRIPTION}`,
  description: PAGE_DESCRIPTION,
  icons: { icon: "/logo.png" },
};

// Sets data-theme before hydration so there's no flash of the wrong theme
// (same idea as nb-recorder/nb-dentiscope's inline theme script). The
// stored value is the literal choice ("system" | "light" | "dark") — CSS
// resolves "system" via prefers-color-scheme, so no resolution happens here.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('nb-theme');
    var theme = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <LocaleProvider>
          <AuthProvider>
            <AppChrome>{children}</AppChrome>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
