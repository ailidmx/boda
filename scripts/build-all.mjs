/**
 * Build both web apps (invitation + dashboard) into a single deployable
 * `web/invitation/dist` folder.
 *
 * Order matters:
 *   1. Clean `web/invitation/dist` entirely.
 *   2. Build the dashboard → `web/invitation/dist/dashboard/`.
 *   3. Build the invitation → `web/invitation/dist/` (with emptyOutDir:false
 *      so it does NOT wipe the dashboard subfolder).
 *
 * The result is a single Firebase Hosting site that serves:
 *   - the invitation at `/`
 *   - the dashboard under `/dashboard/*` (via rewrites in firebase.json)
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "web", "invitation", "dist");

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd}  (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

// 1. Clean the deploy folder
console.log(`\n🧹 Cleaning ${dist}`);
rmSync(dist, { recursive: true, force: true });

// 2. Build the dashboard (outputs into dist/dashboard/)
run("npm run build", join(root, "web", "dashboard"));

// 3. Build the invitation (outputs into dist/, preserving dist/dashboard/)
run("npm run build", join(root, "web", "invitation"));

console.log("\n✅ Build complete.");
console.log("   Invitation → web/invitation/dist/");
console.log("   Dashboard  → web/invitation/dist/dashboard/");
