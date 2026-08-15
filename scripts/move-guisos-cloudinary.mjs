#!/usr/bin/env node
/**
 * Move the guisos images (currently at the Cloudinary root) into the
 * `boda/quisos/` folder, matching the convention used for cabin photos
 * (assets live under `boda/<folder>/`, and the app renders them as
 * `cloudinaryImage(\`boda/${id}\`)`).
 *
 * The images were uploaded today (2026-08-14) at the root with names like
 * `1._Papas_con_longaniza_cy5av6`. After moving, the relative id stored in
 * content.js will be `quisos/1._Papas_con_longaniza_cy5av6`.
 *
 * Usage:
 *   node scripts/move-guisos-cloudinary.mjs
 */
import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Load Cloudinary credentials from web/invitation/.env ──────────────────
const envPath = join(__dirname, "..", "web", "invitation", ".env");
const envRaw = readFileSync(envPath, "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME || "k2ajcgxv";
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("Missing Cloudinary API key/secret in web/invitation/.env");
  process.exit(1);
}

const invitationDir = join(__dirname, "..", "web", "invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const cloudinaryPath = reqFromInvitation.resolve("cloudinary");
const { v2: cloudinary } = await import(cloudinaryPath);
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// The guisos images that were previously organised under `boda/quisos/`.
// The user wants them referenced at the Cloudinary ROOT (no `boda/` prefix),
// so we move them back to the root. The second batch is already at the root.
const QUISOS_IDS = [
  "boda/quisos/1._Papas_con_longaniza_cy5av6",
  "boda/quisos/2._Bistec_a_la_MX_k0nt4r",
  "boda/quisos/3._Bistec_con_nopales_ngiynu",
  "boda/quisos/4._Alambre_d2upyi",
  "boda/quisos/5._Barbacoa_pupyj7",
  "boda/quisos/6._Chicharrón_en_salsa_roja_nlbqzb",
  "boda/quisos/6._Chicharrón_en_salsa_verde_t4hiiz",
  "boda/quisos/7._Costilla_en_tomatada_rrawks",
  "boda/quisos/8._Mole_nohguw",
  "boda/quisos/9._Pollo_al_chipotle_txkyvi",
  "boda/quisos/tostilocos_vrkadw",
];

async function main() {
  console.log("\n── Moving guisos images back to the Cloudinary root ──");
  const moved = [];
  for (const full of QUISOS_IDS) {
    const rootId = full.replace(/^boda\/quisos\//, "");
    try {
      await cloudinary.uploader.rename(full, rootId, { overwrite: false });
      moved.push(rootId);
      console.log(`  moved → ${rootId}`);
    } catch (e) {
      console.error(`  ✗ failed to move ${full}: ${e.message}`);
    }
  }

  console.log("\n── Root ids (store these in content.js) ──");
  for (const id of moved) {
    console.log(`  ${id}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Move failed:", err);
  process.exit(1);
});
