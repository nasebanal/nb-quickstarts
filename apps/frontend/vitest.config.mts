import { defineConfig } from "vitest/config";

// The html reporter is opt-in via VITEST_HTML_REPORT (set by the vitest
// module's `test:report` script) so a plain `vitest run` (e.g. from an
// editor or `npm test`) doesn't write report files nobody asked for.
//
// The html reporter's output directory is a reporter option (`outputDir`),
// not `test.outputFile` — that only controls single-file reporters (json,
// junit, etc). Passing it via `test.outputFile.html` is silently ignored;
// the reporter tuple form below is what it actually reads.
const htmlReportDir = process.env.VITEST_HTML_REPORT;

export default defineConfig({
  test: {
    reporters: htmlReportDir ? ["default", ["html", { outputDir: htmlReportDir }]] : ["default"],
  },
});
