import { describe, expect, it } from "vitest";
import { scenarioAgentgateway } from "./scenarioAgentgateway";
import { scenarioKafka } from "./scenarioKafka";
import { scenarioKeycloak } from "./scenarioKeycloak";
import { scenarioKong } from "./scenarioKong";
import { scenarioObservability } from "./scenarioObservability";
import { scenarioVault } from "./scenarioVault";
import { scenarioTesting } from "./scenarioTesting";
import { DOCS_NAV } from "./nav";
import nextConfig from "../../../next.config";

// Scenario 1 is the Testing page (its URL predates the numbering), then the six module scenarios.
const SCENARIOS = [
  ["1", scenarioTesting],
  ["2", scenarioKong],
  ["3", scenarioKafka],
  ["4", scenarioObservability],
  ["5", scenarioKeycloak],
  ["6", scenarioVault],
  ["7", scenarioAgentgateway],
] as const;

describe("scenario pages", () => {
  it("are numbered 1-7 in the same order as the sidebar, in both languages", () => {
    const nav = DOCS_NAV.find((item) => item.children)!.children!;
    expect(nav).toHaveLength(SCENARIOS.length);
    SCENARIOS.forEach(([number, page], index) => {
      expect(page.en.title).toMatch(new RegExp(`^Scenario ${number}: `));
      expect(page.ja.title).toMatch(new RegExp(`^シナリオ${number}: `));
      expect(nav[index].labelEn).toMatch(new RegExp(`^${number}\\. `));
      expect(nav[index].labelJa).toMatch(new RegExp(`^シナリオ${number}: `));
    });
  });

  it("puts Scenario 1 at /docs/scenario-testing, with the old /docs/testing redirecting to it", async () => {
    const nav = DOCS_NAV.find((item) => item.children)!.children!;
    expect(nav[0].href).toBe("/docs/scenario-testing");
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/docs/testing", destination: nav[0].href, permanent: true });
  });

  it("have the same cleanup section, worded professionally in Japanese", () => {
    // Scenario 5 (Keycloak) has no cleanup: it ends with "Returning to mock-login-only" instead.
    for (const [number, page] of SCENARIOS) {
      if (number === "5") continue;
      expect(page.en.sections.map((section) => section.heading), `scenario ${number} en`).toContain("Cleanup");
      expect(page.ja.sections.map((section) => section.heading), `scenario ${number} ja`).toContain("環境のクリーンアップ");
    }
    // "片付け" read oddly in Japanese and was replaced everywhere.
    for (const [, page] of SCENARIOS) {
      expect(page.ja.sections.some((section) => section.heading === "片付け")).toBe(false);
    }
  });
});

describe("Scenario 1: verify the demo app", () => {
  for (const locale of ["en", "ja"] as const) {
    const page = scenarioTesting[locale];
    const CHECK = locale === "en" ? "Checking the results" : "確認方法";
    const EVALUATION = locale === "en" ? "Evaluation" : "評価結果";

    it(`${locale}: opens with an overview, then one section per test tool, then the cleanup`, () => {
      expect(page.sections[0].heading).toBe(locale === "en" ? "Overview" : "概要");
      expect(page.sections[0].table).toBeDefined();
      const cleanup = page.sections.at(-1)!;
      expect(cleanup.heading).toBe(locale === "en" ? "Cleanup" : "環境のクリーンアップ");
      expect(cleanup.code?.[0].code).toMatch(/make apps:down/);
      // Middle sections: pytest, Vitest, Playwright, Specmatic, Locust, ZAP. The cleanup closes the scenario.
      expect(page.sections.slice(1, -1).map((section) => section.heading?.split(":")[0])).toEqual([
        "pytest",
        "Vitest",
        "Playwright",
        "Specmatic",
        "Locust",
        "OWASP ZAP",
      ]);
    });

    it(`${locale}: every tool section says how to check the results, then how they are evaluated`, () => {
      for (const section of page.sections.slice(1, -1)) {
        const headings = section.subsections?.map((sub) => sub.heading) ?? [];
        expect(headings[0], section.heading).toBe(CHECK);
        expect(headings[1], section.heading).toBe(EVALUATION);
        // The checking part gives a command and where the report is; every tool has one.
        expect(section.subsections![0].code?.length, section.heading).toBeGreaterThan(0);
        expect(section.subsections![1].body?.length ?? 0, section.heading).toBeGreaterThan(0);
      }
    });
  }

  it("keeps ja and en in the same shape", () => {
    const shape = (locale: "en" | "ja") =>
      scenarioTesting[locale].sections.map((section) => [
        section.body?.length ?? 0,
        Boolean(section.table),
        section.subsections?.map((sub) => [sub.body?.length ?? 0, sub.bullets?.length ?? 0, sub.code?.length ?? 0, sub.images?.length ?? 0, Boolean(sub.table), Boolean(sub.note)]),
      ]);
    expect(shape("ja")).toEqual(shape("en"));
  });

  it("keeps the report screenshots the old page had", () => {
    const images = scenarioTesting.en.sections.flatMap((section) => section.subsections?.flatMap((sub) => sub.images?.map((image) => image.src) ?? []) ?? []);
    expect(images.sort()).toEqual(
      [
        "/docs/screenshots/report-locust.png",
        "/docs/screenshots/report-playwright.png",
        "/docs/screenshots/report-pytest.png",
        "/docs/screenshots/report-specmatic.png",
        "/docs/screenshots/report-vitest.png",
        "/docs/screenshots/report-zap.png",
      ].sort(),
    );
  });
});
