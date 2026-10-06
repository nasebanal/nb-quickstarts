// Small inline line icons (no icon-library dependency, so this stays
// air-gapped-friendly) styled like nb-dentiscope's stroke icons.
export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M4 7.5h16" />
      <path d="M4 16.5h16" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2.4" x2="12" y2="4.9" />
        <line x1="12" y1="19.1" x2="12" y2="21.6" />
        <line x1="2.4" y1="12" x2="4.9" y2="12" />
        <line x1="19.1" y1="12" x2="21.6" y2="12" />
        <line x1="5.3" y1="5.3" x2="7.1" y2="7.1" />
        <line x1="16.9" y1="16.9" x2="18.7" y2="18.7" />
        <line x1="5.3" y1="18.7" x2="7.1" y2="16.9" />
        <line x1="16.9" y1="7.1" x2="18.7" y2="5.3" />
      </g>
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M20.4 13.3a8.3 8.3 0 1 1-9.7-9.7 0.9 0.9 0 0 1 1 1.3 6.5 6.5 0 0 0 7.4 7.4 0.9 0.9 0 0 1 1.3 1z" />
      <path d="M17.9 3.2c.26 1.14.62 1.5 1.76 1.76-1.14.26-1.5.62-1.76 1.76-.26-1.14-.62-1.5-1.76-1.76 1.14-.26 1.5-.62 1.76-1.76z" />
    </svg>
  );
}

export function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

// Marks a link that opens in a new tab/window (target="_blank") - the
// standard "box with an arrow escaping its top-right corner" glyph.
export function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// The GitHub mark (Octicons "mark-github"), filled - the one icon here that
// is a brand glyph rather than a line icon.
export function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
