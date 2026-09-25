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
      const cleanup = page.sections.at(-2)!;
      expect(cleanup.heading).toBe(locale === "en" ? "Cleanup" : "環境のクリーンアップ");
      expect(cleanup.code?.[0].code).toMatch(/make apps:down/);
      // Middle sections: pytest, Vitest, Playwright, Specmatic, Microcks, Locust, ZAP. The cleanup closes the
      // scenario, and the reference comparison follows it as the last section.
      expect(page.sections.slice(1, -2).map((section) => section.heading?.split(":")[0])).toEqual([
        "pytest",
        "Vitest",
        "Playwright",
        "Specmatic",
        "Microcks",
        "Locust",
        "OWASP ZAP",
      ]);
      expect(page.sections.at(-1)!.heading?.split(":")[0]).toBe(locale === "en" ? "Reference" : "参考");
    });

    it(`${locale}: every tool section says how to check the results, then how they are evaluated`, () => {
      for (const section of page.sections.slice(1, -2)) {
        const headings = section.subsections?.map((sub) => sub.heading) ?? [];
        expect(headings[0], section.heading).toBe(CHECK);
        expect(headings[1], section.heading).toBe(EVALUATION);
        // The checking part gives a command and where the report is; every tool has one.
        expect(section.subsections![0].code?.length, section.heading).toBeGreaterThan(0);
        expect(section.subsections![1].body?.length ?? 0, section.heading).toBeGreaterThan(0);
      }
    });
  }

  it("comparison: implementation, API tests and mock features, as facts only", () => {
    for (const locale of ["en", "ja"] as const) {
      const reference = scenarioTesting[locale].sections.at(-1)!;
      expect(reference.subsections?.map((sub) => sub.heading)).toEqual(
        locale === "en" ? ["Implementation", "API tests", "Mock features"] : ["実装形態", "APIテスト", "提供Mock機能"],
      );
      const [implementation, apiTests, mock] = reference.subsections!;
      for (const sub of [implementation, apiTests, mock]) {
        // Every part is built the same way: a heading and one Specmatic / Microcks table, nothing in between.
        expect(sub.body).toBeUndefined();
        expect(sub.bullets).toBeUndefined();
        expect(sub.table?.headers.slice(1)).toEqual(["Specmatic", "Microcks"]);
      }
      const labels = (sub: typeof mock) => sub.table!.rows.map((row) => row[0]);
      expect(labels(implementation)).toEqual(
        locale === "en"
          ? ["Implementation language", "Distribution", "Execution form", "License"]
          : ["実装言語", "配布方法", "実行形態", "ライセンス"],
      );
      expect(labels(apiTests).slice(0, 1)).toEqual(locale === "en" ? ["Test scenarios"] : ["テストシナリオ"]);
      expect(labels(mock)).toEqual(
        locale === "en"
          ? ["How specs are read", "Response content", "Management console"]
          : ["Specの読み取り方法", "レスポンス内容", "管理画面"],
      );
      // The execution form is stated once, in the implementation table - not repeated in the other two.
      for (const sub of [apiTests, mock]) {
        expect(labels(sub)).not.toContain(locale === "en" ? "Execution form" : "実行形態");
      }
      // Facts only: no recommendation wording anywhere in the tables, and no separate "choosing" note any more.
      const cells = reference.subsections!.flatMap((sub) => sub.table!.rows.flat()).join(" ");
      expect(cells).not.toMatch(/approach|recommend|アプローチ|推奨|適して/);
      expect(reference.note).toBeUndefined();
      expect(reference.noteTitle).toBeUndefined();
      // Specmatic's management screens are paid products; the open-source edition has none.
      const consoleRow = mock.table!.rows.find((row) => row[0] === (locale === "en" ? "Management console" : "管理画面"))!;
      expect(consoleRow[1]).toMatch(locale === "en" ? /paid/ : /有償/);
    }
  });

  it("links the tools' own pages from the comparison tables (https only, same targets in both languages)", () => {
    const linksOf = (locale: "en" | "ja") =>
      scenarioTesting[locale].sections
        .at(-1)!
        .subsections!.flatMap((sub) => sub.table!.rows.flat())
        .flatMap((cell) => [...cell.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((m) => m[2]));
    const en = linksOf("en");
    expect(en.length).toBeGreaterThanOrEqual(8);
    for (const href of en) expect(href).toMatch(/^https:\/\//);
    expect(linksOf("ja")).toEqual(en);
    // Nothing half-written is left over.
    for (const locale of ["en", "ja"] as const) {
      const text = scenarioTesting[locale].sections.at(-1)!.subsections!.flatMap((sub) => sub.table!.rows.flat()).join(" ");
      expect(text.replace(/\[[^\]]+\]\([^)\s]+\)/g, "")).not.toMatch(/\]\(/);
    }
  });

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
        "/docs/screenshots/report-microcks-detail.png",
        "/docs/screenshots/report-microcks.png",
        "/docs/screenshots/report-playwright.png",
        "/docs/screenshots/report-pytest.png",
        "/docs/screenshots/report-specmatic.png",
        "/docs/screenshots/report-vitest.png",
        "/docs/screenshots/report-zap.png",
      ].sort(),
    );
  });
});
