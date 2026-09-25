import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { DocsBlock, DocsPageContent } from "@/lib/docs/types";
import { SequenceDiagram } from "./SequenceDiagram";
import { TerminalOutput } from "./TerminalOutput";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { ZoomableImage } from "./ZoomableImage";

// Plain <img> inside ZoomableImage, not next/image - these are locally
// captured docs screenshots of varying, not-known-ahead-of-time aspect
// ratios (Kong Manager, Grafana, agentgateway's dashboard), so a fixed
// width/height (next/image's normal requirement) would mean hardcoding a
// different number per screenshot for no real benefit - they're already
// reasonably sized PNGs served from public/, not something that needs
// on-the-fly resizing/format negotiation.

// `code` spans inside prose (a note's text, ...) become code chips, like the
// blog's inline code. Plain text without backticks passes through untouched.
function inlineCode(text: string): ReactNode {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

// `[label](href)` inside prose becomes a link: a path starting with "/" is an in-app link (client-side
// navigation), anything else opens in a new tab. Used for body paragraphs, bullets and subsections;
// code blocks and terminals are never parsed.
function inlineLinks(text: string): ReactNode {
  return text.split(/(\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    return href.startsWith("/") ? (
      <Link key={i} href={href}>
        {label}
      </Link>
    ) : (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  });
}

// One renderer for every /docs page (Overview + Getting Started + all six
// scenarios) - each page component only supplies its own DocsPageContent
// (see lib/docs/*.ts), so heading levels, spacing and code-block styling
// stay identical across all of them instead of being redone per page.
// Sections/paragraphs/code blocks have no stable id of their own (they're
// static prose, never reordered or filtered), so an array index is a
// perfectly safe React key here.
// A newline inside a table cell becomes a line break (used for a "※ ..." footnote line under a cell's main text);
// `[label](href)` in a cell becomes a link, as in prose.
function cellLines(cell: string): ReactNode {
  return cell.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {inlineLinks(line)}
    </Fragment>
  ));
}

// Paragraphs and bullets of a block.
function BlockText({ block }: { block: DocsBlock }) {
  return (
    <>
      {block.body?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{inlineLinks(paragraph)}</p>)}
      {block.bullets && (
        <ul>
          {block.bullets.map((bullet) => (
            <li key={bullet}>{inlineLinks(bullet)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

// Everything else a block can carry (code, table, diagrams, terminal, charts, images, callout).
function BlockMedia({ block }: { block: DocsBlock }) {
  return (
    <>
      {block.code?.map((codeBlock, blockIndex) => (
        <div key={blockIndex} className="nb-docs-code-block">
          {codeBlock.label && <p className="nb-docs-code-label">{codeBlock.label}</p>}
          <pre>
            <code>{codeBlock.code}</code>
          </pre>
        </div>
      ))}
      {block.table && (
        // A table whose first header is empty is a comparison: its first column only labels the rows.
        <table className={block.table.headers[0] === "" ? "nb-docs-table-rowlabels" : undefined}>
          <thead>
            <tr>
              {block.table.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cellLines(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {block.sequence && <SequenceDiagram sequence={block.sequence} />}
      {block.terminal && <TerminalOutput terminal={block.terminal} />}
      {block.charts && block.charts.length > 0 && (
        <div className="nb-docs-chart-grid">
          {block.charts.map((chart) => (
            <TimeSeriesChart key={chart.title} chart={chart} />
          ))}
        </div>
      )}
      {block.images && block.images.length > 0 && (
        <div className="nb-docs-figure-grid">
          {block.images.map((image) => (
            <figure key={image.src} className="nb-docs-figure">
              <ZoomableImage src={image.src} alt={image.alt} />
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {block.note && (
        <aside className="nb-docs-note" data-testid="docs-note">
          {block.noteTitle && (
            <p className="nb-docs-note-title">
              {block.noteHref ? (
                <a href={block.noteHref} target="_blank" rel="noopener noreferrer">
                  {block.noteTitle}
                </a>
              ) : (
                block.noteTitle
              )}
            </p>
          )}
          <p>{inlineCode(block.note)}</p>
        </aside>
      )}
    </>
  );
}

export function DocsArticle({ content, slots }: { content: DocsPageContent; slots?: Record<string, ReactNode> }) {
  return (
    <article className="nb-content nb-docs-content" data-testid="docs-article">
      <h1>{content.title}</h1>
      {content.description && <p className="nb-concept-description">{content.description}</p>}
      {content.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="nb-docs-section">
          {section.heading && <h2>{section.heading}</h2>}
          <BlockText block={section} />
          {section.slot && slots?.[section.slot]}
          {section.subsections?.map((sub) => (
            <div key={sub.heading} className="nb-docs-subsection">
              <h3>{sub.href ? inlineLinks(`[${sub.heading}](${sub.href})`) : sub.heading}</h3>
              <BlockText block={sub} />
              <BlockMedia block={sub} />
            </div>
          ))}
          <BlockMedia block={section} />
        </section>
      ))}
    </article>
  );
}
