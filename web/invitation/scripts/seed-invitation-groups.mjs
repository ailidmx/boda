#!/usr/bin/env node

/**
 * seed-invitation-groups.mjs
 *
 * Seeds the `invitation_groups` Firestore collection with initial groups
 * derived from the static guest list. Each group gets an empty customContent
 * placeholder so the dashboard can edit it later.
 *
 * Usage:
 *   node scripts/seed-invitation-groups.mjs
 *
 * Prerequisites:
 *   - firebase-tools installed (npm install -g firebase-tools)
 *   - Logged in: firebase login
 *   - Project selected: firebase use boda-500805
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load guests from guests.js ────────────────────────────────────────

const guestsPath = resolve(__dirname, "../src/guests.js");
const guestsSource = readFileSync(guestsPath, "utf-8");

// Extract the GUESTS array using a regex that captures the array literal
const guestsMatch = guestsSource.match(/export\s+const\s+GUESTS\s*=\s*(\[[\s\S]*?\]);/m);
if (!guestsMatch) {
  console.error("Could not find GUESTS array in guests.js");
  process.exit(1);
}

// Evaluate the array safely
const GUESTS = eval(`(${guestsMatch[1]})`);

// ── Extract unique groups ─────────────────────────────────────────────

const groups = new Set();
GUESTS.forEach((g) => {
  if (g.invitationGroup) groups.add(g.invitationGroup);
});


const sortedGroups = [...groups].sort();
console.log(`Found ${sortedGroups.length} unique groups from ${GUESTS.length} guests:`);
sortedGroups.forEach((g) => console.log(`  - ${g}`));

// ── Firestore setup ───────────────────────────────────────────────────

const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

// Try to find service account key
const possiblePaths = [
  resolve(__dirname, "../../../service-account.json"),
  resolve(__dirname, "../../../firebase/service-account.json"),
  resolve(__dirname, "../../service-account.json"),
];

let serviceAccount = null;
for (const p of possiblePaths) {
  try {
    serviceAccount = JSON.parse(readFileSync(p, "utf-8"));
    break;
  } catch {
    // not found
  }
}

if (!serviceAccount) {
  console.error(
    "No service account key found. Create one at Firebase Console → Project Settings → Service Accounts → Generate new private key.",
  );
  console.error("Place it at one of:", possiblePaths.join(", "));
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ── Seed groups ───────────────────────────────────────────────────────

const batch = db.batch();
let count = 0;

for (const groupName of sortedGroups) {
  const ref = db.collection("invitation_groups").doc(groupName);
  batch.set(ref, {
    customContent: {
      greeting: "",
      message: "",
      section: "",
      hideSections: [],
    },
  });
  count++;
}

await batch.commit();
console.log(`\n✅ Seeded ${count} invitation groups to Firestore.`);
console.log("You can now edit custom content from the dashboard → Groups tab.");

process.exit(0);
