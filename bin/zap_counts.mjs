#!/usr/bin/env node
// Counts the alerts of a ZAP JSON report by severity and prints them as `nb` flags, so Assurance gets the
// breakdown (not only "n failed cases"): `--metric high=0 --metric medium=3 --metric low=2 --metric info=1`.
//
// Usage: node bin/zap_counts.mjs <zap-report.json>
//
// One alert counts once, however many instances it has (the same unit as zap_to_junit.mjs: one case per
// alert per site). ZAP has no "critical" level: High (riskcode 3) is the top. Informational alerts (riskcode 0)
// are counted too, but the Assurance gate only looks at critical / high.
import { readFileSync } from "node:fs";

const [input] = process.argv.slice(2);
if (!input) {
  console.error("Usage: zap_counts.mjs <zap-report.json>");
  process.exit(2);
}

const LEVELS = { 3: "high", 2: "medium", 1: "low", 0: "info" };
const counts = { high: 0, medium: 0, low: 0, info: 0 };
const report = JSON.parse(readFileSync(input, "utf8"));
for (const site of report.site ?? []) {
  for (const alert of site.alerts ?? []) {
    const level = LEVELS[Number(alert.riskcode)];
    if (level) counts[level] += 1;
  }
}
console.log(Object.entries(counts).map(([k, v]) => `--metric ${k}=${v}`).join(" "));
