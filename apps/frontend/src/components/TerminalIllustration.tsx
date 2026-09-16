// Inline SVG mock terminal — same idea as nb-dentiscope's hero visual (a
// self-contained SVG in a white rounded card, no image asset needed), just
// showing `make` commands instead of an X-ray graphic.
export function TerminalIllustration() {
  const lines: { text: string; color: string }[] = [
    { text: "$ make apps:up", color: "#94a3b8" },
    { text: "✓ frontend, backend, MySQL ready", color: "#4ade80" },
    { text: "$ make playwright:test", color: "#94a3b8" },
    { text: "✓ 1 passed", color: "#4ade80" },
    { text: "$ make apps:down", color: "#94a3b8" },
  ];

  return (
    <svg viewBox="0 0 400 240" role="img" aria-label="make apps:up in a terminal">
      <rect x="0" y="0" width="400" height="240" rx="12" fill="#0b1220" />
      <circle cx="20" cy="20" r="5" fill="#f87171" />
      <circle cx="38" cy="20" r="5" fill="#fbbf24" />
      <circle cx="56" cy="20" r="5" fill="#4ade80" />
      {lines.map((line, i) => (
        <text
          key={i}
          x="20"
          y={56 + i * 28}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="14"
          fill={line.color}
        >
          {line.text}
        </text>
      ))}
    </svg>
  );
}
