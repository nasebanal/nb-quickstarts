import { describe, expect, it } from "vitest";
import { DOCS_NAV } from "./nav";
import { overview } from "./overview";
import { scenarioAgentgateway } from "./scenarioAgentgateway";
import { scenarioKafka } from "./scenarioKafka";
import { scenarioKeycloak } from "./scenarioKeycloak";
import { scenarioKong } from "./scenarioKong";
import { scenarioObservability } from "./scenarioObservability";
import { testing } from "./testing";
import { scenarioVault } from "./scenarioVault";

// Sidebar order (see nav.ts): the Overview lists the seven scenarios in this order (scenario 1 is the Testing page).
const SCENARIOS = [
  testing,
  scenarioKong,
  scenarioKafka,
  scenarioObservability,
  scenarioKeycloak,
  scenarioVault,
  scenarioAgentgateway,
];

describe("Overview page", () => {
  for (const locale of ["en", "ja"] as const) {
    describe(locale, () => {
      const page = overview[locale];

      it("has exactly three parts: purpose, structure, functional verification scenarios", () => {
        expect(page.sections).toHaveLength(3);
        expect(page.sections.every((section) => section.heading)).toBe(true);
        // The diagrams belong to the structure part, which is the second one.
        expect(page.sections[1].slot).toBe("architecture");
        expect(page.sections[0].slot).toBeUndefined();
        expect(page.sections[2].slot).toBeUndefined();
      });

      it("has no intro paragraph above the parts and none of the dropped material", () => {
        expect(page.description).toBeUndefined();
        for (const section of page.sections) {
          expect(section.table).toBeUndefined();
          expect(section.sequence).toBeUndefined();
        }
      });

      it("describes every scenario once, under the scenario page's own title, in sidebar order", () => {
        const subsections = page.sections[2].subsections ?? [];
        expect(subsections.map((sub) => sub.heading)).toEqual(SCENARIOS.map((scenario) => scenario[locale].title));
        for (const sub of subsections) expect((sub.body ?? []).join("").trim().length).toBeGreaterThan(40);
      });
    });
  }

  // Links: `[label](href)` inside the prose (rendered by DocsArticle's inlineLinks) and each scenario
  // heading's own href. Every internal target must be a real docs page from the sidebar.
  describe("links", () => {
    const NAV_HREFS = new Set(
      DOCS_NAV.flatMap((item) => [item.href, ...(item.children?.map((child) => child.href) ?? [])]).filter(Boolean),
    );
    const SCENARIO_HREFS = DOCS_NAV.find((item) => item.children)!.children!.map((child) => child.href);

    for (const locale of ["en", "ja"] as const) {
      const page = overview[locale];
      const prose = page.sections.flatMap((section) => [
        ...(section.body ?? []),
        ...(section.subsections?.flatMap((sub) => sub.body ?? []) ?? []),
      ]);
      const links = prose.flatMap((text) => [...text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((m) => ({ label: m[1], href: m[2] })));

      it(`${locale}: has inline links, each to a real docs page or an https URL`, () => {
        expect(links.length).toBeGreaterThan(10);
        for (const link of links) {
          if (link.href.startsWith("/")) expect(NAV_HREFS.has(link.href), `${link.label} -> ${link.href}`).toBe(true);
          else expect(link.href, link.label).toMatch(/^https:\/\//);
        }
      });

      it(`${locale}: leaves no half-written link syntax behind`, () => {
        for (const text of prose) expect(text.replace(/\[[^\]]+\]\([^)\s]+\)/g, "")).not.toMatch(/\]\(|\[[^\]]*\]\s*\(/);
      });

      it(`${locale}: links the NASEBANAL Stack page in this locale, and each scenario heading to its own page in sidebar order`, () => {
        expect(links.some((link) => link.href === `https://www.nasebanal.com/${locale}/stack`)).toBe(true);
        expect((page.sections[2].subsections ?? []).map((sub) => sub.href)).toEqual(SCENARIO_HREFS);
      });
    }
  });

  it("keeps ja and en in the same shape", () => {
    const shape = (locale: "en" | "ja") =>
      overview[locale].sections.map((section) => [
        Boolean(section.slot),
        section.body?.length ?? 0,
        section.subsections?.length ?? 0,
      ]);
    expect(shape("ja")).toEqual(shape("en"));
  });
});
