#!/usr/bin/env node
/**
 * Move the 4 recently-uploaded cabin photos (VILLA DON AGUSTIN) into their
 * proper Cloudinary folder and wire them up in Firestore.
 *
 *   - 4 images (uploaded ~16:19:31-41Z, UUID batch) → VILLA DON AGUSTIN
 *
 * Steps:
 *   1. Rename each image's public_id to `boda/cabin/donagustin/<name>`.
 *   2. Update the VILLA DON AGUSTIN Firestore doc's `cloudinaryIds` with the
 *      relative IDs (`cabin/donagustin/<name>`).
 *
 * The app renders photos as `cloudinaryImage(\`boda/${id}\`)`, so stored IDs
 * must be relative to the `boda/` prefix.
 *
 * Usage:
 *   node scripts/update-donagustin-photos.mjs
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
  // The 4 VILLA DON AGUSTIN photos: the UUID batch at the root.
  const donAgustin = all
    .filter((r) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_1_/.test(r.public_id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`\nVILLA DON AGUSTIN images: ${donAgustin.length}`);

  if (donAgustin.length !== 4) {
    console.error(`\n⚠ Expected 4 VILLA DON AGUSTIN images, got ${donAgustin.length}. Aborting.`);
    process.exit(1);
  }

  // ── 1. Move images into the folder (rename public_id) ───────────────────
  const moved = [];
  for (const r of donAgustin) {
    const newPublicId = `boda/cabin/donagustin/${r.public_id}`;
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
    await db.collection("cabins").doc("VILLA DON AGUSTIN").update({ cloudinaryIds: rel });
    console.log(`  VILLA DON AGUSTIN cloudinaryIds → ${rel.length} ids`);
  }

  console.log("\n── Done ──");
  console.log("VILLA DON AGUSTIN ids:", JSON.stringify(rel, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
