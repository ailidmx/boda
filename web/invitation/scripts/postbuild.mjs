/**
 * Post-build step for the invitation.
 *
 * NOTE: This script is now largely redundant. The build number is computed ONCE
 * in vite.config.js and a Vite plugin (`writeVersionArtifacts`) writes
 * `dist/version.json` and injects the SW cache version using that SAME value.
 *
 * This script is kept only as a manual fallback. To avoid reintroducing the
 * infinite-reload bug (where a separately-recomputed timestamp differed from
 * the bundle's by a minute), it READS the build number from the already-written
 * `dist/version.json` instead of recomputing it.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

// Read the build number from version.json (written by the Vite plugin) so it
// always matches the bundle's __BUILD_NUMBER__. Never recompute it here.
const versionPath = join(dist, "version.json");
let BUILD_NUMBER = null;
if (existsSync(versionPath)) {
  try {
    BUILD_NUMBER = JSON.parse(readFileSync(versionPath, "utf8")).build;
  } catch {
    BUILD_NUMBER = null;
  }
}
if (!BUILD_NUMBER) {
  console.error("❌ version.json not found or invalid — run `vite build` first.");
  process.exit(1);
}

// 1. (Re)write version.json with the same build number (idempotent).
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

