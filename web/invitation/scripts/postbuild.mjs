/**
 * Post-build step for the invitation.
 *
 * Runs after `vite build` and:
 *   1. Writes `dist/version.json` with the exact build number so the running
 *      app can compare itself against the latest deployed version and force a
 *      reload when a new release ships (cache-busting for stale tabs).
 *   2. Injects the build number into `dist/sw.js`'s CACHE_VERSION so the
 *      service worker cache is invalidated on every deploy (prevents the SW
 *      from serving a stale app shell).
 *
 * The build number format matches vite.config.js: a short UTC timestamp
 * (YYYYMMDD-HHMM) that changes on every build.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

// Same format as vite.config.js so the footer and version.json agree.
const BUILD_NUMBER = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 13);

// 1. Write version.json
const versionPath = join(dist, "version.json");
writeFileSync(versionPath, JSON.stringify({ build: BUILD_NUMBER }, null, 2) + "\n");
console.log(`📄 Wrote ${versionPath} → build ${BUILD_NUMBER}`);

// 2. Inject build number into sw.js CACHE_VERSION
const swPath = join(dist, "sw.js");
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, "utf8");
  // Replace the placeholder (or any existing boda-vN value) with a version
  // that includes the build number, so every deploy invalidates the SW cache.
  sw = sw.replace(
    /const CACHE_VERSION = "[^"]*";/,
    `const CACHE_VERSION = "boda-${BUILD_NUMBER}";`,
  );
  writeFileSync(swPath, sw);
  console.log(`🔧 Injected build number into ${swPath}`);
} else {
  console.warn(`⚠️  ${swPath} not found — skipping SW cache version bump.`);
}

console.log("✅ Post-build complete.");
