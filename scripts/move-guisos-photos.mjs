#!/usr/bin/env node
/**
 * Move the 20 guisos dish photos (currently at the Cloudinary account root)
 * into the `boda/quisos/` folder so they follow the app's convention of
 * storing cabin/dish photos under the `boda/` prefix.
 *
 * The app renders dish photos as `cloudinaryImage(\`boda/${id}\`)`, so the
 * stored IDs are relative to the `boda/` prefix (e.g. `quisos/1._Papas...`).
 *
 * Usage:
 *   node scripts/move-guisos-photos.mjs
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

// The 20 guisos dish images currently at the account root.
const GUISOS = [
  "1._Papas_con_longaniza_cy5av6",
  "2._Bistec_a_la_MX_k0nt4r",
  "3._Bistec_con_nopales_ngiynu",
  "4._Alambre_d2upyi",
  "5._Barbacoa_pupyj7",
  "6._Chicharrón_en_salsa_roja_nlbqzb",
  "6._Chicharrón_en_salsa_verde_t4hiiz",
  "7._Costilla_en_tomatada_rrawks",
  "8._Mole_nohguw",
  "9._Pollo_al_chipotle_txkyvi",
  "10._Pipian_u1w5mv",
  "11._Rajas_con_elote_rma3rq",
  "12._Pollo_con_champiñones_xc6745",
  "13._Costilla_en_salsa_roja_s3vlby",
  "15_-_Lengua_en_salsa_verde_fmjvit",
  "15._Carne_al_pastor_neyycc",
  "16._Cochinita_Pibil_fghtug",
  "18_-_Bistec_con_papa_s_htmnar",
  "19_-_Calabazas_guisadas_ijenzm",
  "20_-_ARROZ_ROJO_g7z0dj",
];

const FOLDER = "boda/quisos";

async function main() {
  const moved = [];
  const failed = [];
  for (const id of GUISOS) {
    const newPublicId = `${FOLDER}/${id}`;
    try {
      await cloudinary.uploader.rename(id, newPublicId, { overwrite: false });
      moved.push(newPublicId);
      console.log(`  moved → ${newPublicId}`);
    } catch (e) {
      failed.push({ id, error: e.message });
      console.error(`  ✗ failed to move ${id}: ${e.message}`);
    }
  }

  console.log(`\nMoved ${moved.length}/${GUISOS.length}`);
  if (failed.length) {
    console.error("Failures:");
    for (const f of failed) console.error(`  ${f.id}: ${f.error}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Move failed:", err);
  process.exit(1);
});
