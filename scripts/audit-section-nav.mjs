#!/usr/bin/env node
/**
 * audit-section-nav.mjs
 *
 * Audits and auto-fixes the "next section / subsection" bottom links across
 * the invitation. Every section (and subsection) must have a bottom "continue"
 * link that jumps to the NEXT section/subsection in DOM logic order (the order
 * the sections are mounted in App.jsx).
 *
 * Usage:
 *   node scripts/audit-section-nav.mjs            # dry-run: report only
 *   node scripts/audit-section-nav.mjs --fix      # apply fixes
 *
 * What it does per section:
 *   1. Reads the section's component file.
 *   2. Locates the BOTTOM "next" nav link (the last nav-link <a> in the
 *      component's render — the one pinned to the bottom of the slide).
 *   3. Compares its href to the expected next section (from DOM order).
 *   4. --fix: rewrites a wrong href, or inserts a standard `.section-nav`
 *      block when the link is missing.
 *
 * The DOM order is derived from App.jsx (the order sections are mounted).
 * The `travelsByPlane` section is conditional; its neighbours are handled so
 * the chain stays correct whether or not it renders.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COMPONENTS = join(ROOT, "web/invitation/src/components");
const APP = join(ROOT, "web/invitation/src/App.jsx");

const FIX = process.argv.includes("--fix");

/* ── DOM order of sections (mirrors App.jsx) ─────────────────────────────
   `#top` is the Hero (rendered before the first <section id="story">). The
   `travel` section is conditional (only for guests who fly in); we keep it in
   the chain so the audit reflects the full intended order. */
const DOM_ORDER = [
  "top",
  "story",
  "venue",
  "weekend",
  "attire",
  "dress-code",
  "weather",
  "weekend-program",
  "te-animas",
  "travel",
  "accommodation",
  "petanque",
  "food",
  "guisos",
  "music",
  "song-request",
  "coast",
  "rsvp",
  "gift",
  "photos",
  "guests",
  "thanks",
  "footer",
];

/* ── Manifest: section id → component file + function + nav metadata ─────
   `file` is relative to COMPONENTS. `component` is the exported function that
   renders the section. `navKey` is the `t.nav.<key>` label used in the link.
   `light` marks sections on dark backgrounds (needs `.section-nav--light`). */
const MANIFEST = {
  top:            { file: "Hero.jsx",          component: "Hero",          next: "story",           navKey: "story",           light: false },
  story:          { file: "Story.jsx",         component: "Story",         next: "venue",           navKey: "venue",           light: false },
  venue:          { file: "Venue.jsx",         component: "Venue",         next: "weekend",         navKey: "weekend",         light: false },
  weekend:        { file: "Weekend.jsx",       component: "Weekend",       next: "attire",          navKey: "attire",          light: true },
  attire:         { file: "Attire.jsx",        component: "Attire",        next: "dress-code",      navKey: "dressCode",       light: false },
  "dress-code":   { file: "Attire.jsx",        component: "DressCode",     next: "weather",         navKey: "weather",         light: false },
  weather:        { file: "Weather.jsx",       component: "Weather",       next: "weekend-program", navKey: "programme",       light: false },
  // weekend-program: the bottom "next" link (#te-animas) lives inside the
  // DayProgramSlideset child component, not the WeekendProgram wrapper, so the
  // wrapper-body scan can't see it. It is correct — skip.
  "weekend-program": { file: "Weekend.jsx",    component: "WeekendProgram", next: "te-animas",      navKey: "teAnimas",        light: false, skip: true },
  // te-animas: the bottom "next" link uses a JSX expression href={nextHref}
  // (travelsByPlane ? "#travel" : "#accommodation"), not a literal string, so
  // the literal-href scan can't see it. It is correct — skip.
  "te-animas":    { file: "TeAnimas.jsx",      component: "TeAnimas",      next: "travel",          navKey: "travel",          light: false, skip: true },

  travel:         { file: "Travel.jsx",        component: "Travel",        next: "accommodation",   navKey: "accommodation",   light: false },
  accommodation:  { file: "Accommodation.jsx", component: "Accommodation", next: "petanque",        navKey: "petanque",        light: false },
  petanque:       { file: "Petanque.jsx",      component: "Petanque",      next: "food",            navKey: "food",            light: false },
  food:           { file: "Food.jsx",          component: "Food",          next: "guisos",          navKey: "guisos",          light: false },
  guisos:         { file: "Guisos.jsx",        component: "Guisos",        next: "music",           navKey: "music",           light: false },
  music:          { file: "Music.jsx",         component: "Music",         next: "song-request",    navKey: "songRequest",     light: true },
  "song-request": { file: "SongRequest.jsx",   component: "SongRequest",   next: "coast",           navKey: "coast",           light: false },
  coast:          { file: "Coast.jsx",         component: "Coast",         next: "rsvp",            navKey: "rsvp",            light: false },
  rsvp:           { file: "RSVP.jsx",          component: "RSVP",          next: "gift",            navKey: "gift",            light: false },
  gift:           { file: "Gift.jsx",          component: "Gift",          next: "photos",          navKey: "photos",          light: false },
  photos:         { file: "Photos.jsx",        component: "Photos",        next: "guests",          navKey: "guests",          light: false },
  guests:         { file: "GuestCloud.jsx",    component: "GuestCloud",    next: "thanks",          navKey: "thanks",          light: false },
  thanks:         { file: "Thanks.jsx",        component: "Thanks",        next: "footer",          navKey: "footer",          light: false },
  footer:         { file: "Footer.jsx",        component: "Footer",        next: null,              navKey: null,              light: false },
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

// Extract the body of a named function component (export function X() { ... }).
function extractComponentBody(source, name) {
  const re = new RegExp(
    `export\\s+function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`,
    "m",
  );
  const start = source.search(re);
  if (start === -1) return null;
  // Find the matching closing brace by scanning depth from the opening brace.
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

// Find the LAST nav-link <a> in a component body. Returns { href, index } of
// the href attribute, or null. A nav link is an <a> whose className contains
// "nav-link" (covers section-nav-link, hero-nav-link, attire-nav-link, etc.).
// JSX uses `className`, so we match that (and tolerate plain `class` too).
function findBottomNavLink(body) {
  const linkRe = /<a\b[^>]*className="[^"]*nav-link[^"]*"[^>]*>/g;
  let match;
  let last = null;
  while ((match = linkRe.exec(body)) !== null) {
    const hrefMatch = match[0].match(/href="([^"]*)"/);
    if (hrefMatch) {
      last = { href: hrefMatch[1], hrefIndex: match.index + match[0].indexOf('href="') };
    }
  }
  return last;
}


// Build the standard .section-nav block for a missing link.
function buildNavBlock(navKey, target, light) {
  const lightClass = light ? " section-nav--light" : "";
  return (
    `\n      <nav className="section-nav${lightClass}" aria-label="Continue">\n` +
    `        <a className="section-nav-link" href="#${target}">\n` +
    `          <span>{t.nav.${navKey}}</span>\n` +
    `          <span aria-hidden="true">↓</span>\n` +
    `        </a>\n` +
    `      </nav>\n`
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */

let changed = 0;
let problems = 0;

console.log(`\nSection-nav audit (${FIX ? "FIX mode" : "dry-run"})\n`);
console.log("─".repeat(70));

for (const id of DOM_ORDER) {
  const meta = MANIFEST[id];
  if (!meta) continue;
  if (meta.next === null) {
    console.log(`  ${id.padEnd(16)} (last section — no next link needed)`);
    continue;
  }
  if (meta.skip) {
    console.log(`  ${id.padEnd(16)} ✓ (skipped — link verified manually)`);
    continue;
  }


  const filePath = join(COMPONENTS, meta.file);
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    console.log(`  ${id.padEnd(16)} ✗ FILE NOT FOUND: ${meta.file}`);
    problems++;
    continue;
  }

  const body = extractComponentBody(source, meta.component);
  if (!body) {
    console.log(`  ${id.padEnd(16)} ✗ component "${meta.component}" not found in ${meta.file}`);
    problems++;
    continue;
  }

  const link = findBottomNavLink(body);
  const expected = `#${meta.next}`;

  if (!link) {
    console.log(`  ${id.padEnd(16)} ✗ MISSING next link (expected ${expected})`);
    problems++;
    if (FIX) {
      // Insert the nav block just before the component's closing </section>.
      const closeSection = body.lastIndexOf("</section>");
      if (closeSection !== -1) {
        const block = buildNavBlock(meta.navKey, meta.next, meta.light);
        const insertAt = closeSection;
        const absInsert = source.indexOf(body) + insertAt;
        source = source.slice(0, absInsert) + block + source.slice(absInsert);
        writeFileSync(filePath, source);
        console.log(`      → inserted nav block → ${expected}`);
        changed++;
      } else {
        console.log(`      → could not find </section> to insert into`);
        problems++;
      }
    }
    continue;
  }

  if (link.href === expected) {
    console.log(`  ${id.padEnd(16)} ✓ ${link.href}`);
    continue;
  }

  console.log(`  ${id.padEnd(16)} ✗ WRONG link: ${link.href} (expected ${expected})`);
  problems++;
  if (FIX) {
    const absHrefIndex = source.indexOf(body) + link.hrefIndex;
    source =
      source.slice(0, absHrefIndex) +
      `href="${expected}"` +
      source.slice(absHrefIndex + `href="${link.href}"`.length);
    writeFileSync(filePath, source);
    console.log(`      → rewrote href → ${expected}`);
    changed++;
  }
}

console.log("─".repeat(70));
console.log(`\n${problems} issue(s) found${FIX ? `, ${changed} fixed` : " (run with --fix to apply)"}.\n`);
