#!/usr/bin/env node
/**
 * Audit i18n keys in web/invitation.
 * - Imports content.js and walks the `es` object to get all defined leaf keys.
 * - Extracts all `t.xxx.yyy` usages from components.
 * - Reports MISSING (used but not defined) and UNUSED (defined but not used).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "web", "invitation", "src");

// ---- 1. Import content.js and walk the `es` object ----
const contentMod = await import(path.join(SRC, "content.js"));
const es = contentMod.content.es;

const definedKeys = new Set();
function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      walk(v, p);
    } else {
      definedKeys.add(p);
    }
  }
}
walk(es, "");

// ---- 2. Extract t. usages from components ----
const componentsDir = path.join(SRC, "components");
const files = fs.readdirSync(componentsDir).filter((f) => /\.(jsx|js)$/.test(f));

const usedKeys = new Set();
const usageByFile = {};

function extractUsages(src, file) {
  const re = /\bt\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const clean = m[1].replace(/\.\d+/g, "");
    usedKeys.add(clean);
    if (!usageByFile[file]) usageByFile[file] = new Set();
    usageByFile[file].add(clean);
  }
  const re2 = /\bt\[["']([^"']+)["']\]/g;
  while ((m = re2.exec(src)) !== null) {
    usedKeys.add(m[1]);
    if (!usageByFile[file]) usageByFile[file] = new Set();
    usageByFile[file].add(m[1]);
  }
}

for (const f of files) {
  const full = path.join(componentsDir, f);
  const src = fs.readFileSync(full, "utf8");
  extractUsages(src, f);
}

// ---- 3. Compute missing & unused ----
const missing = [];
for (const k of usedKeys) {
  if (!definedKeys.has(k)) missing.push(k);
}
const unused = [];
for (const k of definedKeys) {
  if (!usedKeys.has(k)) unused.push(k);
}

missing.sort();
unused.sort();

console.log("=== DEFINED KEYS:", definedKeys.size, "===");
console.log("=== USED KEYS:", usedKeys.size, "===");
console.log("\n=== MISSING KEYS (used in components but NOT defined in content.js) ===");
for (const k of missing) {
  const filesUsing = Object.entries(usageByFile)
    .filter(([, set]) => set.has(k))
    .map(([f]) => f)
    .join(", ");
  console.log(`  ${k}  [${filesUsing}]`);
}
console.log("\n=== UNUSED KEYS (defined in content.js but NOT used in any component) ===");
for (const k of unused) {
  console.log(`  ${k}`);
}
