"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { GlobeIcon } from "./icons";
import { useLocale } from "./LocaleProvider";

const LABELS: Record<Locale, string> = { en: "English", ja: "日本語" };

// Dropdown menu (not a plain toggle) — same interaction as
// nb-shared-navigation's language switcher: click the globe, pick a
// language from the list, active one highlighted.
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="nb-dropdown" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nb-icon-button${open ? " nb-icon-button-active" : ""}`}
        aria-label="Switch language"
        aria-expanded={open}
      >
        <GlobeIcon />
      </button>
      {open && (
        <div className="nb-dropdown-menu" role="menu">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              className={`nb-dropdown-item${l === locale ? " nb-dropdown-item-active" : ""}`}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
