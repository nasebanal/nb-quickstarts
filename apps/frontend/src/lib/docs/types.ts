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

/** A success-rate / failure-rate time series, drawn from cumulative counts (TimeSeriesChart.tsx). */
export interface DocsChart {
  title: string;
  /** One-line description under the title (what "a request" is, which run it came from, ...). */
  subtitle?: string;
  /** [seconds since start, requests completed, of which failed], one sample per row. */
  points: [number, number, number][];
  /** X-axis extent in seconds; shared between charts so they line up. */
  xMax: number;
  labels: {
    success: string;
    failure: string;
    time: string;
    requests: string;
    failures: string;
    /** aria-label for the chart. */
    summary: string;
    showTable: string;
  };
}

/** A sequence diagram (SequenceDiagram.tsx): participants across the top, messages and notes down the page. */
export type DocsSequenceStep =
  | {
      kind: "message";
      from: string;
      to: string;
      text: string;
      /** Smaller second line under the arrow (headers, payload, ...). */
      detail?: string;
      /** A response/return rather than a request. */
      dashed?: boolean;
    }
  | { kind: "note"; at: string; text: string };

export interface DocsSequence {
  /** aria-label for the diagram. */
  summary: string;
  participants: { id: string; label: string; sub?: string }[];
  steps: DocsSequenceStep[];
  /** Dashed boxes around a run of steps (inclusive indexes into `steps`), e.g. "only if the keys aren't cached". */
  frames?: { from: number; to: number; label: string }[];
}

/** The content blocks a section - or a subsection of it - can carry. Rendered in this order:
 * paragraphs, bullets, code, table, sequence diagram, terminal, charts, images, callout. */
export interface DocsBlock {
  /** Each entry is one paragraph. `[label](href)` becomes a link - an internal path ("/docs/...") or an https URL. */
  body?: string[];
  bullets?: string[];
  code?: DocsCodeBlock[];
  table?: DocsTable;
  terminal?: DocsTerminal;
  /** A sequence diagram of an interaction between systems. */
  sequence?: DocsSequence;
  /** Time-series charts laid out side by side (one per compared run). */
  charts?: DocsChart[];
  /** Real screenshot(s) of a GUI this scenario actually produces (Kong Manager, Grafana, a
   * report file, ...) - one item renders full-width, several lay out as a responsive grid. */
  images?: DocsImage[];
  /** A callout box - a caveat, warning, or aside worth setting apart from the main prose. */
  note?: string;
  /** Bold heading of the callout above (e.g. "What is event sourcing"), optionally a link - the same shape as nb-landing-page's blog notes. */
  noteTitle?: string;
  noteHref?: string;
}

/** A headed (h3) block inside a section - e.g. "Checking the results" under one test tool. */
export interface DocsSubsection extends DocsBlock {
  heading: string;
  /** Makes the heading a link (an internal path or an https URL). */
  href?: string;
}

export interface DocsSection extends DocsBlock {
  heading?: string;
  /** Named place inside this section where the page component renders a custom node (DocsArticle's `slots`), after the paragraphs and bullets - e.g. the Overview's architecture diagrams. */
  slot?: string;
  /** Smaller headed blocks (h3) inside this section, each with its own content. */
  subsections?: DocsSubsection[];
}

export interface DocsPageContent {
  title: string;
  description?: string;
  sections: DocsSection[];
}

export type LocalizedDocsPage = Record<Locale, DocsPageContent>;
