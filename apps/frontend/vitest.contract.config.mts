import { defineConfig } from "vitest/config";

// Separate config for src/lib/contract/ - see vitest.config.mts's `exclude`
// comment for why these live apart from the default `vitest:test` run.
// Same html-reporter toggle as vitest.config.mts.
const htmlReportDir = process.env.VITEST_HTML_REPORT;

export default defineConfig({
  test: {
    include: ["src/lib/contract/**/*.test.ts"],
    reporters: htmlReportDir ? ["default", ["html", { outputDir: htmlReportDir }]] : ["default"],
  },
});
