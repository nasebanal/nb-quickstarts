import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { overview } from "../../lib/docs/overview";
import { scenarioTesting } from "../../lib/docs/scenarioTesting";
import { DocsArticle } from "./DocsArticle";

// Server-side render of the real page content: catches a runtime error in the renderer (subsections that
// carry code / images / tables / notes, inline links, slots) that type checking cannot.
const render = (content: Parameters<typeof DocsArticle>[0]["content"], slots?: Record<string, string>) =>
  renderToStaticMarkup(createElement(DocsArticle, { content, slots: slots as never }));

describe("DocsArticle", () => {
  for (const locale of ["en", "ja"] as const) {
    it(`renders Scenario 1 (${locale}) with its subsections' code, images, tables and notes`, () => {
      const html = render(scenarioTesting[locale]);
      expect(html).toContain(`<h1>${scenarioTesting[locale].title}</h1>`);
      // 6 tools x (check + evaluation).
      expect((html.match(/<h3>/g) ?? []).length).toBe(6 * 2);
      expect((html.match(/<figure/g) ?? []).length).toBe(6);
    });

    it(`renders the Overview (${locale}) with the diagram slot inside the structure part and links as anchors`, () => {
      const html = render(overview[locale], { architecture: "SLOT-MARKER" });
      const structureAt = html.indexOf("SLOT-MARKER");
      expect(structureAt).toBeGreaterThan(html.indexOf("<h2>"));
      // The slot sits between the second and third headings.
      const headings = [...html.matchAll(/<h2>/g)].map((m) => m.index!);
      expect(structureAt).toBeGreaterThan(headings[1]);
      expect(structureAt).toBeLessThan(headings[2]);
      expect(html).toContain('href="/docs/scenario-kong"');
      expect(html).toContain(`href="https://www.nasebanal.com/${locale}/stack"`);
      expect(html).toContain('href="/docs/scenario-testing"');
      expect(html).not.toMatch(/\]\(/); // no unparsed link syntax leaks into the page
    });
  }
});
