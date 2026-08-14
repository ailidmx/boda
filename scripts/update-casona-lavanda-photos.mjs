#!/usr/bin/env node
/**
 * Move the 29 recently-uploaded WhatsApp cabin photos into their proper
 * Cloudinary folders and wire them up in Firestore.
 *
 *   - 24 images (uploaded ~15:07:38-40Z, "09.06" batch) → CASONA
 *   -  5 images (uploaded ~15:13:56-59Z, "09.12" batch) → VILLA LAVANDA
 *
 * Steps:
 *   1. Rename each image's public_id to `boda/cabin/casona/<name>` or
 *      `boda/cabin/lavanda/<name>` (Cloudinary "move into folder").
 *   2. Update the CASONA and VILLA LAVANDA Firestore docs' `cloudinaryIds`
 *      with the relative IDs (`cabin/casona/<name>`, `cabin/lavanda/<name>`).
 *
 * The app renders photos as `cloudinaryImage(\`boda/${id}\`)`, so stored IDs
 * must be relative to the `boda/` prefix.
 *
 * Usage:
 *   node scripts/update-casona-lavanda-photos.mjs
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

// ── Cloudinary admin SDK ───────────────────────────────────────────────────
const invitationDir = join(__dirname, "..", "web", "invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const cloudinaryPath = reqFromInvitation.resolve("cloudinary");
const { v2: cloudinary } = await import(cloudinaryPath);
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// ── Firebase Admin init ────────────────────────────────────────────────────
const adminPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const { initializeApp, cert } = await import(adminPath);
const { getFirestore } = await import(firestorePath);

const SERVICE_ACCOUNT = join(__dirname, "..", "integraciones", "google_sheets", "service_account.json");
const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app, "boda-us-central1");

async function listResources(prefix) {
  const results = [];
  let nextCursor = null;
  do {
    const params = { type: "upload", prefix, max_results: 500 };
    if (nextCursor) params.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(params);
    results.push(...(res.resources || []));
    nextCursor = res.next_cursor || null;
  } while (nextCursor);
  return results;
}

async function main() {
  const all = await listResources("");
  const whatsapp = all.filter((r) => r.public_id.startsWith("WhatsApp_Image_2026-08-10"));

  // Split by upload time: CASONA batch uploaded before 15:08Z, LAVANDA after.
  const CASONA_CUTOFF = new Date("2026-08-10T15:08:00Z");
  const casona = [];
  const lavanda = [];
  for (const r of whatsapp) {
    const t = new Date(r.created_at);
    if (t < CASONA_CUTOFF) casona.push(r);
    else lavanda.push(r);
  }

  console.log(`\nCASONA images: ${casona.length}`);
  console.log(`LAVANDA images: ${lavanda.length}`);

  if (casona.length !== 24 || lavanda.length !== 5) {
    console.error(`\n⚠ Expected 24 CASONA + 5 LAVANDA, got ${casona.length} + ${lavanda.length}. Aborting.`);
    process.exit(1);
  }

  // ── 1. Move images into their folders (rename public_id) ────────────────
  async function moveToFolder(resources, folder) {
    const moved = [];
    for (const r of resources) {
      const newPublicId = `${folder}/${r.public_id}`;
      try {
        await cloudinary.uploader.rename(r.public_id, newPublicId, { overwrite: false });
        moved.push(newPublicId);
        console.log(`  moved → ${newPublicId}`);
      } catch (e) {
        console.error(`  ✗ failed to move ${r.public_id}: ${e.message}`);
      }
    }
    return moved;
  }

  console.log("\n── Moving CASONA images into boda/cabin/casona ──");
  const casonaFullIds = await moveToFolder(casona, "boda/cabin/casona");

  console.log("\n── Moving LAVANDA images into boda/cabin/lavanda ──");
  const lavandaFullIds = await moveToFolder(lavanda, "boda/cabin/lavanda");

  // ── 2. Update Firestore docs with relative IDs ──────────────────────────
  const casonaRel = casonaFullIds.map((id) => id.replace(/^boda\//, ""));
  const lavandaRel = lavandaFullIds.map((id) => id.replace(/^boda\//, ""));

  console.log("\n── Updating Firestore ──");
  if (casonaRel.length) {
    await db.collection("cabins").doc("CASONA").update({ cloudinaryIds: casonaRel });
    console.log(`  CASONA cloudinaryIds → ${casonaRel.length} ids`);
  }
  if (lavandaRel.length) {
    await db.collection("cabins").doc("VILLA LAVANDA").update({ cloudinaryIds: lavandaRel });
    console.log(`  VILLA LAVANDA cloudinaryIds → ${lavandaRel.length} ids`);
  }

  console.log("\n── Done ──");
  console.log("CASONA ids:", JSON.stringify(casonaRel, null, 2));
  console.log("LAVANDA ids:", JSON.stringify(lavandaRel, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
