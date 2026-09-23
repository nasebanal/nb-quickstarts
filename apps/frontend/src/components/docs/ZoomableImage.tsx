"use client";

import { LightboxOverlay, useLightbox } from "./Lightbox";

// Click opens the same file at natural size, capped to the viewport (see
// Lightbox.tsx for the shared open/close/Escape/scroll-lock wiring, matching
// nb-landing-page's blog LightboxImage.tsx). Our screenshots are already
// plain <img> (not next/image - see DocsArticle.tsx's own note on why), so
// the thumbnail and the enlarged view are the exact same file, just two
// separate <img> elements sized differently by CSS.
export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const { open, setOpen, close } = useLightbox();

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
        <LightboxOverlay label={alt} onClose={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="nb-docs-lightbox-image" />
        </LightboxOverlay>
      )}
    </>
  );
}
