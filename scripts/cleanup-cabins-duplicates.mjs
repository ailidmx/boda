#!/usr/bin/env node
/**
 * Clean up duplicate cabin documents created by a previous migration.
 *
 * The previous migration created lowercase documents (e.g. "azalea") that
 * duplicate the existing uppercase documents (e.g. "VILLA AZALEA"). This
 * script:
 *   1. Deletes all lowercase duplicate documents.
 *   2. Adds the `key` field and `cloudinaryIds: []` to the existing
 *      uppercase documents.
 *
 * Usage:
 *   node scripts/cleanup-cabins-duplicates.mjs
 */

import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Firebase Admin init ───────────────────────────────────────────────────
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

// ── Mapping: showcase key → existing uppercase document ID ────────────────
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

// ── Cleanup logic ─────────────────────────────────────────────────────────
async function cleanup() {
  console.log("Cleaning up duplicate cabin documents…\n");

  // 1. Delete all lowercase duplicate documents.
  const lowercaseIds = Object.keys(KEY_TO_DOC_ID);
  for (const key of lowercaseIds) {
    const docRef = db.collection("cabins").doc(key);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.delete();
      console.log(`  ✗ Deleted duplicate: ${key}`);
    } else {
      console.log(`  - Not found (already clean): ${key}`);
    }
  }

  // 2. Add `key` and `cloudinaryIds: []` to the existing uppercase documents.
  console.log("\nUpdating existing cabin documents…");
  for (const [key, docId] of Object.entries(KEY_TO_DOC_ID)) {
    const docRef = db.collection("cabins").doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log(`  ⚠ Document not found: ${docId} (key: ${key})`);
      continue;
    }
    await docRef.update({
      key,
      cloudinaryIds: [],
      updatedAt: new Date().toISOString(),
    });
    console.log(`  ✓ ${docId} → key: ${key}, cloudinaryIds: []`);
  }

  console.log("\nDone. Duplicate documents removed and existing documents updated.");
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
