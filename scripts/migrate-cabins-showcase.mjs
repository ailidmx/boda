#!/usr/bin/env node
/**
 * Populate the `cabins` Firestore collection with the public showcase data.
 *
 * Each cabin document gets an empty `cloudinaryIds` array (photos will be
 * added later by tagging images in Cloudinary and re-running the media
 * manifest generator). The `showcase` field is intentionally NOT written:
 * all display data (title, capacity, rooms, beds) is derived at runtime from
 * the basic cabin fields + the `rooms` collection.
 *
 * Usage:
 *   node scripts/migrate-cabins-showcase.mjs
 *
 * The script is idempotent: re-running it overwrites the showcase fields with
 * the current source data.
 */

import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Firebase Admin init ───────────────────────────────────────────────────
// Resolve firebase-admin from web/invitation (where it is installed).
const invitationDir = join(__dirname, "..", "web", "invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(adminPath);
const { getFirestore } = await import(firestorePath);

const SERVICE_ACCOUNT = join(__dirname, "..", "integraciones", "google_sheets", "service_account.json");
const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app, "boda-us-central1");

// ── Cabin keys (invitation showcase keys) ─────────────────────────────────
// These are the 13 cabins shown in the invitation's Cabins section.
// Each key maps to the existing uppercase document ID in Firestore.
const KEY_TO_DOC_ID = {
  azalea: "VILLA AZALEA",
  dalia: "VILLA DALIA",
  margarita: "VILLA MARGARITA",
  wooden: "CABAÑA 1",
  lavanda: "VILLA LAVANDA",
  hortencia: "VILLA HORTENCIA",
  cabana2: "CABAÑA 2",
  cabana3: "CABAÑA 3",
  cabana4: "CABAÑA 4",
  donAgustin: "VILLA DON AGUSTIN",
  donRafa: "VILLA DON RAFA",
  donCarlos: "SUITE DON CARLOS",
  casona: "CASONA",
};


// ── Migration logic ───────────────────────────────────────────────────────
async function migrate() {
  console.log("Migrating cabin showcase data to Firestore…\n");

  for (const [key, docId] of Object.entries(KEY_TO_DOC_ID)) {
    const docRef = db.collection("cabins").doc(docId);

    const data = {
      key,
      cloudinaryIds: [], // Empty for now — photos will be added later.
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(data, { merge: true });
    console.log(`  ✓ ${docId} → key: ${key}, cloudinaryIds: [] (empty)`);
  }


  console.log("\nDone. All cabin showcase data is now in Firestore.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
