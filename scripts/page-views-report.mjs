#!/usr/bin/env node
/**
 * page-views-report.mjs
 *
 * Generates a markdown report of the invitation's section page views from the
 * Firestore `page_views` collection (see web/invitation/src/hooks/usePageViewTracking.js).
 *
 * The invitation logs one document per section view with:
 *   - guestId         : the signed-in guest's auth uid
 *   - sectionId       : the section id (e.g. "story", "rsvp")
 *   - navigationType  : how the guest got there
 *                       ("nav" | "side_drawer" | "mobile_menu" | "fab" |
 *                        "scroll" | "initial")
 *   - createdAt       : server timestamp
 *
 * This report aggregates:
 *   - Total page views and unique guests
 *   - Views per section (funnel: which sections guests actually reach)
 *   - Views per navigation type (how guests move around)
 *   - Per-guest section reach (how many distinct sections each guest viewed)
 *
 * Usage:
 *   node scripts/page-views-report.mjs [--days 30]
 *
 * Requires the Firestore service account at
 *   integraciones/google_sheets/service_account.json
 * (the same one used by the other Firestore scripts).
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAYS = parseDays(process.argv);
const OUT = resolve("reports/page-views-report.md");

function parseDays(argv) {
  const i = argv.indexOf("--days");
  if (i !== -1 && argv[i + 1]) {
    const n = Number(argv[i + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 30;
}

function loadServiceAccount() {
  const path = join(
    __dirname,
    "../integraciones/google_sheets/service_account.json",
  );
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(
      `Could not read service account at ${path}.\n` +
        "Place the Firestore service account there (same one used by the " +
        "other scripts) and re-run.",
    );
    process.exit(1);
  }
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  const db = getFirestore(app, "boda-us-central1");

  // Cutoff timestamp: only count page views within the requested window.
  const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;

  const snap = await db.collection("page_views").get();
  const views = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const createdAt = d.createdAt?.toMillis?.() ?? d.createdAt ?? 0;
    if (createdAt < cutoff) return;
    views.push({
      guestId: d.guestId ?? "",
      sectionId: d.sectionId ?? "(unknown)",
      navigationType: d.navigationType ?? "scroll",
      createdAt,
    });
  });

  const md = [];
  md.push("# Page views report");
  md.push("");
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Period: last ${DAYS} days`);
  md.push(`Total page views: ${views.length}`);
  md.push(`Unique guests: ${new Set(views.map((v) => v.guestId)).size}`);
  md.push("");

  // ── Views per section (funnel) ─────────────────────────────────────────
  md.push("## Views per section");
  md.push("");
  md.push("| Section | Views | Unique guests |");
  md.push("|---------|-------|---------------|");
  const bySection = new Map();
  for (const v of views) {
    if (!bySection.has(v.sectionId)) {
      bySection.set(v.sectionId, { count: 0, guests: new Set() });
    }
    const entry = bySection.get(v.sectionId);
    entry.count += 1;
    entry.guests.add(v.guestId);
  }
  const sectionRows = [...bySection.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [section, { count, guests }] of sectionRows) {
    md.push(`| ${section} | ${count} | ${guests.size} |`);
  }
  md.push("");

  // ── Views per navigation type ──────────────────────────────────────────
  md.push("## Views per navigation type");
  md.push("");
  md.push("| Navigation type | Views |");
  md.push("|-----------------|-------|");
  const byNav = new Map();
  for (const v of views) {
    byNav.set(v.navigationType, (byNav.get(v.navigationType) ?? 0) + 1);
  }
  const navRows = [...byNav.entries()].sort((a, b) => b[1] - a[1]);
  for (const [nav, count] of navRows) {
    md.push(`| ${nav} | ${count} |`);
  }
  md.push("");

  // ── Per-guest section reach ────────────────────────────────────────────
  md.push("## Per-guest section reach");
  md.push("");
  md.push("| Guest | Distinct sections | Total views |");
  md.push("|-------|-------------------|-------------|");
  const byGuest = new Map();
  for (const v of views) {
    if (!byGuest.has(v.guestId)) {
      byGuest.set(v.guestId, { sections: new Set(), count: 0 });
    }
    const entry = byGuest.get(v.guestId);
    entry.sections.add(v.sectionId);
    entry.count += 1;
  }
  const guestRows = [...byGuest.entries()].sort(
    (a, b) => b[1].sections.size - a[1].sections.size,
  );
  for (const [guest, { sections, count }] of guestRows) {
    md.push(`| ${guest} | ${sections.size} | ${count} |`);
  }
  md.push("");

  await writeFile(OUT, md.join("\n"), "utf8");
  console.log(`Wrote ${OUT} (${views.length} page views in last ${DAYS} days)`);
}

main().catch((err) => {
  console.error("Failed to generate page-views report:", err.message);
  process.exit(1);
});
