"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { DOCS_NAV, navLabel, type DocsNavItem } from "@/lib/docs/nav";
import { stripLocalePrefix } from "@/lib/i18n";

function NavItem({ item, pathname }: { item: DocsNavItem; pathname: string | null }) {
  const { locale } = useLocale();
  const label = navLabel(item, locale);

  // A group heading (Scenarios) has no href of its own - just its children.
  if (!item.href) {
    return (
      <li className="nb-docs-nav-group">
        <span className="nb-docs-nav-group-label">{label}</span>
        {item.children && (
          <ul>
            {item.children.map((child) => (
              <NavItem key={child.href} item={child} pathname={pathname} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = pathname === item.href;
  return (
    <li>
      <Link href={item.href} className="nb-docs-nav-link" aria-current={active ? "page" : undefined}>
        {label}
      </Link>
    </li>
  );
}

// A plain nested <ul> tree (see nav.ts) - two top-level pages plus one
// "Scenarios" group holding the seven walkthroughs, in the order requested.
// Active-link highlighting is exact-pathname, not prefix-matching: each
// scenario is its own leaf page, not a sub-route of another one.
export function DocsSidebar() {
  // stripLocalePrefix first - item.href values (nav.ts) are unprefixed, so
  // a locale-prefixed visit (/ja/docs/scenario-kong) would otherwise never
  // match and the active link would never highlight.
  const pathname = stripLocalePrefix(usePathname());

  return (
    <nav className="nb-docs-sidebar" aria-label="Docs navigation" data-testid="docs-sidebar">
      <ul>
        {DOCS_NAV.map((item) => (
          <NavItem key={item.href || item.labelEn} item={item} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}
