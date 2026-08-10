#!/usr/bin/env node
/**
 * Move the 9 recently-uploaded WhatsApp cabin photos (VILLA DON RAFA) into
 * their proper Cloudinary folder and wire them up in Firestore.
 *
 *   - 9 images (uploaded ~15:45:27-35Z, "09.44" batch) → VILLA DON RAFA
 *
 * Steps:
 *   1. Rename each image's public_id to `boda/cabin/donrafa/<name>`.
 *   2. Update the VILLA DON RAFA Firestore doc's `cloudinaryIds` with the
 *      relative IDs (`cabin/donrafa/<name>`).
 *
 * The app renders photos as `cloudinaryImage(\`boda/${id}\`)`, so stored IDs
 * must be relative to the `boda/` prefix.
 *
 * Usage:
 *   node scripts/update-donrafa-photos.mjs
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
const db = getFirestore(app);

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
  // The 9 VILLA DON RAFA photos: the "09.44" WhatsApp batch at the root.
  const donRafa = all
    .filter((r) => r.public_id.startsWith("WhatsApp_Image_2026-08-10_at_09.44"))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`\nVILLA DON RAFA images: ${donRafa.length}`);

  if (donRafa.length !== 9) {
    console.error(`\n⚠ Expected 9 VILLA DON RAFA images, got ${donRafa.length}. Aborting.`);
    process.exit(1);
  }

  // ── 1. Move images into the folder (rename public_id) ───────────────────
  const moved = [];
  for (const r of donRafa) {
    const newPublicId = `boda/cabin/donrafa/${r.public_id}`;
    try {
      await cloudinary.uploader.rename(r.public_id, newPublicId, { overwrite: false });
      moved.push(newPublicId);
      console.log(`  moved → ${newPublicId}`);
    } catch (e) {
      console.error(`  ✗ failed to move ${r.public_id}: ${e.message}`);
    }
  }

  // ── 2. Update Firestore doc with relative IDs ───────────────────────────
  const rel = moved.map((id) => id.replace(/^boda\//, ""));

  console.log("\n── Updating Firestore ──");
  if (rel.length) {
    await db.collection("cabins").doc("VILLA DON RAFA").update({ cloudinaryIds: rel });
    console.log(`  VILLA DON RAFA cloudinaryIds → ${rel.length} ids`);
  }

  console.log("\n── Done ──");
  console.log("VILLA DON RAFA ids:", JSON.stringify(rel, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
