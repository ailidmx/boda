#!/usr/bin/env node
/**
 * analytics-funnel-report.mjs
 *
 * Generates a markdown report of the invitation's e-commerce-style funnel from
 * Google Analytics 4 (GA4) data, using the GA4 Data API.
 *
 * The invitation logs these custom events (see web/invitation/src/analytics.js):
 *   - view_cart   : the "À payer" (payment) block rendered
 *   - add_to_cart : a priced stay item (primary cabin / extra cabin) shown
 *   - purchase    : the guest confirmed all responses (committed total)
 *   - section_time: seconds a section stayed in view (param: section_id)
 *   - click       : a click on an element (param: element_id, section_id)
 *
 * Usage:
 *   GA4_PROPERTY_ID=123456789 \
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   node scripts/analytics-funnel-report.mjs [--days 30]
 *
 * If the credentials / property id are not set, the script prints setup
 * instructions and exits 0 (no-op) so it is safe to run in CI.
 *
 * Requires the optional dependency `@google-analytics/data`:
 *   npm install --save-dev @google-analytics/data
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DAYS = parseDays(process.argv);
const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const OUT = resolve("reports/analytics-funnel-report.md");

function parseDays(argv) {
  const i = argv.indexOf("--days");
  if (i !== -1 && argv[i + 1]) {
    const n = Number(argv[i + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 30;
}

function printSetup() {
  console.log(`
Analytics funnel report — setup required.

The invitation already logs these events to Firebase Analytics (GA4):
  view_cart, add_to_cart, purchase, section_time, click

To generate the report you need:
  1. The GA4 property id (a number, NOT the measurement id G-ZDQX91613Z).
     Find it in Firebase console → Analytics → Settings → Property settings,
     or in Google Analytics → Admin → Property → Property details.
  2. A Google service-account JSON with the "Google Analytics Data API"
     enabled and the "Viewer" role on the GA4 property.

Then run:
  npm install --save-dev @google-analytics/data
  GA4_PROPERTY_ID=<property-id> \\
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \\
  node scripts/analytics-funnel-report.mjs --days 30

No credentials were found, so no report was generated.
`);
}

async function main() {
  if (!PROPERTY_ID || !CREDENTIALS) {
    printSetup();
    return;
  }

  let analyticsData;
  try {
    ({ analyticsData } = await import("@google-analytics/data"));
  } catch {
    console.error(
      "Missing optional dependency @google-analytics/data. Run:\n" +
        "  npm install --save-dev @google-analytics/data",
    );
    process.exit(1);
  }

  const client = new analyticsData.AnalyticsDataClient({
    keyFilename: CREDENTIALS,
  });

  const property = `properties/${PROPERTY_ID}`;
  const dateRange = {
    startDate: `${DAYS}daysAgo`,
    endDate: "today",
  };

  // Helper to run a report and return rows as [{dimension, metric}].
  async function runReport(dimensions, metrics, extra = {}) {
    const [response] = await client.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: dimensions.map((d) => ({ name: d })),
      metrics: metrics.map((m) => ({ name: m })),
      ...extra,
    });
    return (response.rows || []).map((row) => ({
      dims: row.dimensionValues.map((v) => v.value),
      metrics: row.metricValues.map((v) => Number(v.value)),
    }));
  }

  const md = [];
  md.push(`# Analytics funnel report`);
  md.push("");
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Period: last ${DAYS} days`);
  md.push(`Property: ${PROPERTY_ID}`);
  md.push("");

  // ── Funnel overview ───────────────────────────────────────────────────
  md.push("## Funnel overview");
  md.push("");
  md.push("| Step | Event | Count |");
  md.push("|------|-------|-------|");
  const funnelEvents = ["view_cart", "add_to_cart", "purchase"];
  for (const ev of funnelEvents) {
    const rows = await runReport([], ["eventCount"], {
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: [ev] },
        },
      },
    });
    const count = rows[0]?.metrics[0] ?? 0;
    md.push(`| ${ev} | ${ev} | ${count} |`);
  }
  md.push("");

  // ── Section time ──────────────────────────────────────────────────────
  md.push("## Time spent per section");
  md.push("");
  md.push("| Section | Total seconds |");
  md.push("|---------|---------------|");
  const sectionRows = await runReport(
    ["customEvent:section_id"],
    ["eventCount"],
    {
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: ["section_time"] },
        },
      },
    },
  );
  for (const row of sectionRows) {
    md.push(`| ${row.dims[0] || "(unknown)"} | ${row.metrics[0]} |`);
  }
  md.push("");

  // ── Clicks ────────────────────────────────────────────────────────────
  md.push("## Clicks per element");
  md.push("");
  md.push("| Element | Section | Count |");
  md.push("|---------|---------|-------|");
  const clickRows = await runReport(
    ["customEvent:element_id", "customEvent:section_id"],
    ["eventCount"],
    {
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: ["click"] },
        },
      },
    },
  );
  for (const row of clickRows) {
    md.push(`| ${row.dims[0] || "(unknown)"} | ${row.dims[1] || ""} | ${row.metrics[0]} |`);
  }
  md.push("");

  await writeFile(OUT, md.join("\n"), "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error("Failed to generate analytics report:", err.message);
  process.exit(1);
});
