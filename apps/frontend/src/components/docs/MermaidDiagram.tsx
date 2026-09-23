"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LightboxOverlay, useLightbox } from "./Lightbox";

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

// mermaid.render()'s own SVG carries width="100%" (a percentage) - fine
// for the thumbnail, where its container is a normal block box with a real
// resolved width, but inside the lightbox's centered flex layout nothing
// gives that percentage a definite width to resolve against, and it
// collapses to 0 (confirmed directly: getBoundingClientRect() reported
// 0x0 there, even with an explicit CSS max-width/height override - an
// external stylesheet rule can't out-rank a 100% that never resolves in
// the first place). Setting concrete pixel width/height explicitly, scaled
// from the SVG's own viewBox to fit the current viewport, sidesteps the
// percentage-resolution question entirely - and, unlike the thumbnail
// (deliberately never upscaled past its intrinsic size), this can enlarge
// the diagram past that when the viewport allows it, which is the entire
// point of a lightbox.
// .nb-docs-lightbox's own padding (backdrop) plus .nb-docs-lightbox-diagram's
// own padding (the card around the SVG - see globals.css) each cost 24px on
// every side; subtracting that fixed chrome, rather than a flat percentage
// of the viewport, is what actually keeps the *card* (not just the SVG)
// from touching the viewport edges.
const LIGHTBOX_CHROME_PX = (24 + 24) * 2;

function sizeToViewport(svg: SVGSVGElement): void {
  const viewBox = svg.viewBox.baseVal;
  if (!viewBox || viewBox.width === 0 || viewBox.height === 0) return;
  const availableWidth = window.innerWidth - LIGHTBOX_CHROME_PX;
  const availableHeight = window.innerHeight - LIGHTBOX_CHROME_PX;
  const scale = Math.min(availableWidth / viewBox.width, availableHeight / viewBox.height);
  svg.style.width = `${viewBox.width * scale}px`;
  svg.style.height = `${viewBox.height * scale}px`;
}

// Dynamically imported (mermaid is ~500KB) - only the Overview page renders
// a diagram at all, so every other /docs page shouldn't pay for it.
export function MermaidDiagram({ chart, label }: { chart: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const { open, setOpen, close } = useLightbox();

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
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chart, isDark, rawId]);

  // Rendered fresh (a second mermaid.render() call, its own id) each time
  // the lightbox opens, rather than reusing the thumbnail's markup - avoids
  // two copies of the same element ids (mermaid's <defs>/marker ids) ever
  // sitting in the DOM at once, and it's cheap enough (a few ms) not to
  // bother caching.
  useEffect(() => {
    if (!open || isDark === null || !lightboxRef.current) return;
    let cancelled = false;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: "Arial, sans-serif",
      });
      const { svg } = await mermaid.render(`mermaid-${rawId}-lightbox`, chart);
      if (!cancelled && lightboxRef.current) {
        lightboxRef.current.innerHTML = svg;
        const svgEl = lightboxRef.current.querySelector("svg");
        if (svgEl) sizeToViewport(svgEl);
      }
    });
    // Keeps the enlarged size matching the viewport if it's resized while
    // open - a plain <img> (ZoomableImage.tsx) gets this for free from its
    // own CSS max-width/max-height, but this SVG's size is computed once
    // in JS (see sizeToViewport's own comment for why), so it needs an
    // explicit recompute on resize to stay in sync.
    const onResize = () => {
      const svgEl = lightboxRef.current?.querySelector("svg");
      if (svgEl) sizeToViewport(svgEl);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [open, chart, isDark, rawId]);

  return (
    <div className="nb-docs-diagram" data-testid="architecture-diagram">
      <div
        ref={containerRef}
        className="nb-docs-diagram-zoomable"
        role="img"
        aria-label={label}
        onClick={() => ready && setOpen(true)}
      />
      {open && (
        <LightboxOverlay label={label} onClose={close}>
          <div ref={lightboxRef} className="nb-docs-lightbox-diagram" />
        </LightboxOverlay>
      )}
    </div>
  );
}
