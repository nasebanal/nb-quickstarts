"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const STORAGE_KEY = "nb-theme";
type ThemeChoice = "system" | "light" | "dark";
const CHOICES: { value: ThemeChoice; label: string; icon: () => React.JSX.Element }[] = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

// Dropdown menu (System / Light / Dark) — same interaction as
// nb-shared-navigation's theme switcher.
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light" || current === "system") {
      setTheme(current);
    }
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const choose = (next: ThemeChoice) => {
    setTheme(next);
    setOpen(false);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — theme still applies for this page view
    }
  };

  const ActiveIcon = CHOICES.find((c) => c.value === theme)?.icon ?? SunIcon;

  return (
    <div className="nb-dropdown" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nb-icon-button${open ? " nb-icon-button-active" : ""}`}
        aria-label="Change color theme"
        aria-expanded={open}
      >
        <ActiveIcon />
      </button>
      {open && (
        <div className="nb-dropdown-menu" role="menu">
          {CHOICES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={`nb-dropdown-item${value === theme ? " nb-dropdown-item-active" : ""}`}
              onClick={() => choose(value)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
