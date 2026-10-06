#!/usr/bin/env node
// Turns a ZAP JSON report into JUnit XML so `nb assurance report upload` (which
// reads JUnit and Locust only) can take it. Node is already needed for `nb`.
//
// Usage: node bin/zap_to_junit.mjs <zap-report.json> <out-junit.xml>
//
// One <testcase> per alert per site. Same convention as zap:* (see the zap
// Makefile): a real alert (riskcode >= 1: Low/Medium/High) is a failure,
// an INFO alert (riskcode 0) passes. A scan with no alerts at all is one
// passing placeholder case, since a JUnit file with no testcase is rejected.
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: zap_to_junit.mjs <zap-report.json> <out-junit.xml>");
  process.exit(2);
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

const report = JSON.parse(readFileSync(input, "utf8"));
const cases = [];
for (const site of report.site ?? []) {
  for (const alert of site.alerts ?? []) {
    cases.push({
      site: site["@name"] ?? "site",
      name: alert.name ?? alert.alert ?? "(unnamed alert)",
      risk: Number(alert.riskcode),
      message: `${alert.riskdesc ?? "alert"}, ${alert.count ?? "?"} instance(s)`,
    });
  }
}

const failed = cases.filter((c) => c.risk >= 1);
const body =
  cases.length === 0
    ? `    <testcase classname="zap" name="no alerts"/>\n`
    : cases
        .map((c) =>
          c.risk >= 1
            ? `    <testcase classname="${esc(c.site)}" name="${esc(c.name)}"><failure message="${esc(c.message)}"/></testcase>\n`
            : `    <testcase classname="${esc(c.site)}" name="${esc(c.name)}"/>\n`,
        )
        .join("");

writeFileSync(
  output,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites>\n  <testsuite name="zap" tests="${Math.max(cases.length, 1)}" failures="${failed.length}">\n${body}  </testsuite>\n</testsuites>\n`,
);
