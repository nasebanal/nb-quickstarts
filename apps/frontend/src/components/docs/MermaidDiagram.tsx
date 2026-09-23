"use client";

import { useEffect, useId, useRef, useState } from "react";

// Mirrors the no-flash theme script in layout.tsx and ThemeToggle.tsx: theme
// state lives only as data-theme on <html> (no React context for it), so
// this reads that attribute directly instead of introducing one just for
// this component.
function resolveIsDark(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Dynamically imported (mermaid is ~500KB) - only the Overview page renders
// a diagram at all, so every other /docs page shouldn't pay for it.
export function MermaidDiagram({ chart, label }: { chart: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [isDark, setIsDark] = useState<boolean | null>(null);

  // Tracks data-theme (ThemeToggle) and, for "system"/unset, the OS
  // preference - either one changing should re-render the diagram in the
  // matching mermaid theme.
  useEffect(() => {
    setIsDark(resolveIsDark());
    const observer = new MutationObserver(() => setIsDark(resolveIsDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setIsDark(resolveIsDark());
    media.addEventListener("change", onMediaChange);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  useEffect(() => {
    if (isDark === null || !containerRef.current) return;
    let cancelled = false;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: "Arial, sans-serif",
      });
      const { svg } = await mermaid.render(`mermaid-${rawId}`, chart);
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chart, isDark, rawId]);

  return (
    <div className="nb-docs-diagram" data-testid="architecture-diagram">
      <div ref={containerRef} role="img" aria-label={label} />
    </div>
  );
}
