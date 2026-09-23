import type { Locale } from "@/lib/i18n";

// Content shape for a /docs page - deliberately separate from Dictionary in
// i18n.ts (short UI micro-copy reused across renders). This is long-form,
// per-page prose; forcing it into Dictionary's strict per-string fields
// would make every new doc paragraph a type change. One export per page
// (LocalizedDocsPage), picked by locale in the page component itself.

export interface DocsCodeBlock {
  /** e.g. "1. Direct REST" - omit for an unlabeled snippet. */
  label?: string;
  code: string;
}

export interface DocsTable {
  headers: string[];
  rows: string[][];
}

export interface DocsTerminalLine {
  text: string;
  /** Defaults to "muted" (a typed command). "success"/"error" color real command output. */
  tone?: "muted" | "success" | "error" | "info";
}

/** A real, captured-verbatim command transcript, rendered in a terminal-style
 * block (TerminalOutput.tsx) - not a screenshot image, so it stays selectable
 * text and theme-aware, but reads as "here's what actually happened" the
 * same way a screenshot would for a CLI-only scenario with no GUI to show. */
export interface DocsTerminal {
  lines: DocsTerminalLine[];
}

export interface DocsImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface DocsSection {
  heading?: string;
  /** Each entry is one paragraph. */
  body?: string[];
  bullets?: string[];
  code?: DocsCodeBlock[];
  table?: DocsTable;
  terminal?: DocsTerminal;
  /** Real screenshot(s) of a GUI this scenario actually produces (Kong Manager, Grafana, a
   * report file, ...) - one item renders full-width, several lay out as a responsive grid. */
  images?: DocsImage[];
  /** A callout box - a caveat, warning, or aside worth setting apart from the main prose. */
  note?: string;
}

export interface DocsPageContent {
  title: string;
  description?: string;
  sections: DocsSection[];
}

export type LocalizedDocsPage = Record<Locale, DocsPageContent>;
