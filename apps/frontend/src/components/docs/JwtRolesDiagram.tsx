"use client";

import { useLocale } from "@/components/LocaleProvider";
import { type JwtRolesKey, jwtRolesVariants } from "@/lib/docs/jwtRolesDiagram";

// Three small SVG diagrams in the docs' diagram card: who creates the JWT and who verifies it, in
// general, in this app, and with Keycloak. Colors come from the site's theme tokens, so it follows
// light/dark like the other diagrams.
export function JwtRolesDiagram({ only }: { only?: JwtRolesKey[] }) {
  const { locale } = useLocale();
  const { label: allLabel, variants: all } = jwtRolesVariants(locale);
  const variants = only
    ? all.filter((variant) => only.includes(variant.key))
    : all;
  // A single diagram is described by its own caption; the group label names all three.
  const label = variants.length === 1 ? variants[0].caption : allLabel;
  return (
    <div
      className="nb-docs-diagram"
      data-testid="jwt-roles-diagram"
      role="group"
      aria-label={label}
    >
      {variants.map((variant, index) => (
        <figure key={variant.caption} className="nb-docs-jwt-roles">
          <figcaption className="nb-docs-code-label">
            {variant.caption}
          </figcaption>
          <svg
            viewBox="0 0 810 230"
            role="img"
            aria-label={variant.caption}
            data-testid={`jwt-roles-${index}`}
          >
            <defs>
              <marker
                id={`jwt-arrow-${index}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--nb-fg-muted)" />
              </marker>
            </defs>
            {variant.group && (
              <g>
                <rect
                  x={variant.group.x}
                  y={variant.group.y}
                  width={variant.group.w}
                  height={variant.group.h}
                  rx="12"
                  fill="none"
                  stroke="var(--nb-fg-subtle)"
                  strokeDasharray="6 4"
                />
                <text
                  x={variant.group.x + 12}
                  y={variant.group.y + 18}
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--nb-fg-muted)"
                >
                  {variant.group.label}
                </text>
              </g>
            )}
            {variant.nodes.map((node) => (
              <g key={node.title + node.x + node.y}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx="8"
                  fill="var(--nb-surface-raised)"
                  stroke="var(--nb-border-strong)"
                />
                <text
                  x={node.x + node.w / 2}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="var(--nb-fg)"
                >
                  {node.title}
                </text>
                {node.lines?.map((line, lineIndex) => (
                  <text
                    key={line}
                    x={node.x + node.w / 2}
                    y={node.y + 41 + lineIndex * 16}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--nb-fg-muted)"
                  >
                    {line}
                  </text>
                ))}
              </g>
            ))}
            {variant.arrows.map((arrow) => (
              <g key={arrow.label}>
                <line
                  x1={arrow.from[0]}
                  y1={arrow.from[1]}
                  x2={arrow.to[0]}
                  y2={arrow.to[1]}
                  stroke="var(--nb-fg-muted)"
                  strokeWidth="1.5"
                  strokeDasharray={arrow.dashed ? "5 4" : undefined}
                  markerEnd={`url(#jwt-arrow-${index})`}
                />
                <text
                  x={arrow.at[0]}
                  y={arrow.at[1]}
                  textAnchor={arrow.labelEnd ? "end" : "middle"}
                  fontSize="11"
                  fill="var(--nb-fg)"
                  stroke="var(--nb-surface)"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {arrow.label}
                </text>
              </g>
            ))}
          </svg>
        </figure>
      ))}
    </div>
  );
}
