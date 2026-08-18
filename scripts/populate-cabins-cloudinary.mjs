#!/usr/bin/env node
/**
 * Populate `cloudinaryIds` on the existing cabin documents in Firestore.
 *
 * The Cloudinary photo IDs come from the build-time media manifest
 * (src/generated-media.js), which is generated from Cloudinary tags.
 * Cabins that share the same physical type (all CABAÑA X) get the same
 * photo set.
 *
 * Usage:
 *   node scripts/populate-cabins-cloudinary.mjs
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

// ── Cloudinary photo IDs (from src/generated-media.js) ────────────────────
// These are the public IDs (without the "boda/" prefix) for each cabin type.
const CLOUDINARY_IDS = {
  azalea: [
    "cabin-azalea-01",
    "cabin-azalea-02",
    "cabin-azalea-03",
    "cabin-azalea-04",
    "cabin-azalea-05",
    "cabin-azalea-06",
    "cabin-azalea-07",
    "cabin-azalea-08",
    "cabin-azalea-09",
  ],
  dalia: [
    "cabin-dalia-01",
    "cabin-dalia-02",
    "cabin-dalia-03",
    "cabin-dalia-04",
    "cabin-dalia-05",
    "cabin-dalia-06",
    "cabin-dalia-07",
  ],
  margarita: [
    "cabin-margarita-01",
    "cabin-margarita-02",
    "cabin-margarita-03",
    "cabin-margarita-04",
    "cabin-margarita-05",
    "cabin-margarita-06",
    "cabin-margarita-07",
    "cabin-margarita-08",
  ],
  // All CABAÑA X cabins share the same wooden cabin photos.
  wooden: [
    "cabin-wooden-01",
    "cabin-wooden-02",
    "cabin-wooden-03",
    "cabin-wooden-04",
  ],
};

// ── Mapping: Firestore doc ID → cloudinaryIds ─────────────────────────────
// Each cabin document gets the photo set for its cabin type.
const DOC_TO_CLOUDINARY = {
  "VILLA AZALEA": CLOUDINARY_IDS.azalea,
  "VILLA DALIA": CLOUDINARY_IDS.dalia,
  "VILLA MARGARITA": CLOUDINARY_IDS.margarita,
  // All CABAÑA X cabins share the same wooden photos.
  "CABAÑA 1": CLOUDINARY_IDS.wooden,
  "CABAÑA 2": CLOUDINARY_IDS.wooden,
  "CABAÑA 3": CLOUDINARY_IDS.wooden,
  "CABAÑA 4": CLOUDINARY_IDS.wooden,
  // Cabins without Cloudinary photos yet keep an empty array.
  "VILLA LAVANDA": [],
  "VILLA HORTENCIA": [],
  "VILLA DON AGUSTIN": [],
  "VILLA DON RAFA": [],
  "SUITE DON CARLOS": [],
  "CASONA": [],
};

// ── Populate logic ────────────────────────────────────────────────────────
async function populate() {
  console.log("Populating cloudinaryIds on cabin documents…\n");

  for (const [docId, cloudinaryIds] of Object.entries(DOC_TO_CLOUDINARY)) {
    const docRef = db.collection("cabins").doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log(`  ⚠ Document not found: ${docId}`);
      continue;
    }
    await docRef.update({
      cloudinaryIds,
      updatedAt: new Date().toISOString(),
    });
    console.log(`  ✓ ${docId} → ${cloudinaryIds.length} photos`);
  }

  console.log("\nDone. cloudinaryIds populated on all cabin documents.");
  process.exit(0);
}

populate().catch((err) => {
  console.error("Population failed:", err);
  process.exit(1);
});
