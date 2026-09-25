import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { overview } from "../../lib/docs/overview";
import { testing } from "../../lib/docs/testing";
import { DocsArticle } from "./DocsArticle";

// Server-side render of the real page content: catches a runtime error in the renderer (subsections that
// carry code / images / tables / notes, inline links, slots) that type checking cannot.
const render = (content: Parameters<typeof DocsArticle>[0]["content"], slots?: Record<string, string>) =>
  renderToStaticMarkup(createElement(DocsArticle, { content, slots: slots as never }));

describe("DocsArticle", () => {
  for (const locale of ["en", "ja"] as const) {
    it(`renders Scenario 1 (${locale}) with its subsections' code, images, tables and notes`, () => {
      const html = render(testing[locale]);
      expect(html).toContain(`<h1>${testing[locale].title}</h1>`);
      // 7 tools x (check + evaluation) + the reference comparison's three (implementation / API tests / mock features).
      expect((html.match(/<h3>/g) ?? []).length).toBe(7 * 2 + 3);
      expect((html.match(/<figure/g) ?? []).length).toBe(8);
      expect(html).toContain("make microcks:down");
      // Two rows carry a footnote line under each tool's cell (execution form; test scenarios): 2 rows x 2 tools,
      // each on its own line (newline -> <br/>).
      const mark = locale === "en" ? "<br/>* " : "<br/>※";
      expect(html.split(mark).length - 1).toBe(4);
      expect(html).toContain(locale === "en" ? "* No server needs to be started to run a test" : "※テストの実行にサーバーの起動は不要");
      // The three comparison tables (empty first header) get the wider label column; the layers table does not.
      expect((html.match(/nb-docs-table-rowlabels/g) ?? []).length).toBe(3);
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
