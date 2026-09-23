import type { ReactNode } from "react";
import type { DocsPageContent } from "@/lib/docs/types";
import { TerminalOutput } from "./TerminalOutput";

// Plain <img>, not next/image - these are locally captured docs
// screenshots of varying, not-known-ahead-of-time aspect ratios (Kong
// Manager, Grafana, agentgateway's dashboard), so a fixed width/height
// (next/image's normal requirement) would mean hardcoding a different
// number per screenshot for no real benefit - they're already reasonably
// sized PNGs served from public/, not something that needs on-the-fly
// resizing/format negotiation.

// One renderer for every /docs page (Overview + Getting Started + all six
// scenarios) - each page component only supplies its own DocsPageContent
// (see lib/docs/*.ts), so heading levels, spacing and code-block styling
// stay identical across all of them instead of being redone per page.
// Sections/paragraphs/code blocks have no stable id of their own (they're
// static prose, never reordered or filtered), so an array index is a
// perfectly safe React key here.
export function DocsArticle({ content, extra }: { content: DocsPageContent; extra?: ReactNode }) {
  return (
    <article className="nb-content nb-docs-content" data-testid="docs-article">
      <h1>{content.title}</h1>
      {content.description && <p className="nb-concept-description">{content.description}</p>}
      {extra}
      {content.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="nb-docs-section">
          {section.heading && <h2>{section.heading}</h2>}
          {section.body?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          {section.bullets && (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {section.code?.map((block, blockIndex) => (
            <div key={blockIndex} className="nb-docs-code-block">
              {block.label && <p className="nb-docs-code-label">{block.label}</p>}
              <pre>
                <code>{block.code}</code>
              </pre>
            </div>
          ))}
          {section.table && (
            <table>
              <thead>
                <tr>
                  {section.table.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {section.terminal && <TerminalOutput terminal={section.terminal} />}
          {section.images && section.images.length > 0 && (
            <div className="nb-docs-figure-grid">
              {section.images.map((image) => (
                <figure key={image.src} className="nb-docs-figure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.alt} loading="lazy" />
                  {image.caption && <figcaption>{image.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          {section.note && <p className="nb-docs-note">{section.note}</p>}
        </section>
      ))}
    </article>
  );
}
