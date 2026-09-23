"use client";

import { useCallback, useEffect, useState } from "react";

// Same behavior as nb-landing-page's blog LightboxImage.tsx (a from-scratch
// implementation there too, no lightbox library) - click opens the same
// file at natural size, capped to the viewport; Escape, a backdrop click,
// or the close button all close it; clicking the enlarged image itself
// does not (only the surrounding backdrop does, via stopPropagation).
// Simpler here than that component: our screenshots are already plain
// <img> (not next/image - see DocsArticle.tsx's own note on why), so the
// thumbnail and the enlarged view are the exact same element, not two.
export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
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

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="nb-docs-zoomable-image"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="nb-docs-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={close}
        >
          <button
            type="button"
            className="nb-docs-lightbox-close"
            onClick={close}
            aria-label="Close"
            autoFocus
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="nb-docs-lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
