import type { DocsTerminal } from "@/lib/docs/types";

const TONE_COLOR: Record<NonNullable<DocsTerminal["lines"][number]["tone"]>, string> = {
  muted: "#94a3b8",
  success: "#4ade80",
  error: "#f87171",
  info: "#60a5fa",
};

// Same window-chrome-dots styling as TerminalIllustration.tsx (the landing
// page's hero mockup), generalized to real, multi-line, wrapping text - a
// hardcoded SVG with fixed line slots can't hold an actual captured
// command transcript. Always dark, deliberately - a real terminal doesn't
// switch to a "light" background just because the site did.
export function TerminalOutput({ terminal }: { terminal: DocsTerminal }) {
  return (
    <div className="nb-docs-terminal" role="img" aria-label="Terminal output">
      <div className="nb-docs-terminal-chrome">
        <span className="nb-docs-terminal-dot" style={{ background: "#f87171" }} />
        <span className="nb-docs-terminal-dot" style={{ background: "#fbbf24" }} />
        <span className="nb-docs-terminal-dot" style={{ background: "#4ade80" }} />
      </div>
      <pre className="nb-docs-terminal-body">
        {terminal.lines.map((line, i) => (
          <div key={i} style={{ color: TONE_COLOR[line.tone ?? "muted"] }}>
            {line.text || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}
