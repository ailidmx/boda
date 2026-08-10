#!/usr/bin/env node
/**
 * Move the 7 recently-uploaded cabin photos (SUITE DON CARLOS) into their
 * proper Cloudinary folder and wire them up in Firestore.
 *
 *   - 7 images (uploaded ~15:59:32-41Z, "894319..." batch) → SUITE DON CARLOS
 *
 * Steps:
 *   1. Rename each image's public_id to `boda/cabin/doncarlos/<name>`.
 *   2. Update the SUITE DON CARLOS Firestore doc's `cloudinaryIds` with the
 *      relative IDs (`cabin/doncarlos/<name>`).
 *
 * The app renders photos as `cloudinaryImage(\`boda/${id}\`)`, so stored IDs
 * must be relative to the `boda/` prefix.
 *
 * Usage:
 *   node scripts/update-doncarlos-photos.mjs
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
  // The 7 SUITE DON CARLOS photos: the "894319..." batch at the root.
  const donCarlos = all
    .filter((r) => /^894319\d+_/.test(r.public_id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`\nSUITE DON CARLOS images: ${donCarlos.length}`);

  if (donCarlos.length !== 7) {
    console.error(`\n⚠ Expected 7 SUITE DON CARLOS images, got ${donCarlos.length}. Aborting.`);
    process.exit(1);
  }

  // ── 1. Move images into the folder (rename public_id) ───────────────────
  const moved = [];
  for (const r of donCarlos) {
    const newPublicId = `boda/cabin/doncarlos/${r.public_id}`;
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
    await db.collection("cabins").doc("SUITE DON CARLOS").update({ cloudinaryIds: rel });
    console.log(`  SUITE DON CARLOS cloudinaryIds → ${rel.length} ids`);
  }

  console.log("\n── Done ──");
  console.log("SUITE DON CARLOS ids:", JSON.stringify(rel, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
