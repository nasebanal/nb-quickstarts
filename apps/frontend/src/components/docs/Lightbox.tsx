"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/** Open/close state + the Escape-key/body-scroll-lock wiring shared by every
 * lightbox in /docs (ZoomableImage.tsx, ArchitectureDiagram.tsx) - split out so
 * neither has to reimplement it. */
export function useLightbox() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return { open, setOpen, close };
}

/** The overlay chrome itself (backdrop, close button) - same shape as
 * nb-landing-page's blog LightboxImage.tsx (a from-scratch implementation
 * there too, no library): clicking the backdrop or the close button closes
 * it; clicking the enlarged content itself does not, via stopPropagation
 * on the one wrapper both content types (an <img>, the architecture <svg>) share. */
export function LightboxOverlay({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="nb-docs-lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <button type="button" className="nb-docs-lightbox-close" onClick={onClose} aria-label="Close" autoFocus>
        &times;
      </button>
      <div className="nb-docs-lightbox-content" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
