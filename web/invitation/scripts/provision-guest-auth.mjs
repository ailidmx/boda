/**
 * Provision the `guest_auth` Firestore collection.
 *
 * The `guest_profiles` rules let a guest edit the name/photo of members of
 * their own invitation group. To enforce that, the rules look up the signed-in
 * user's UID in `guest_auth/{uid}` to find their `invitationGroup`. This
 * script populates that mapping for every guest using the Firebase Admin SDK.
 *
 * Usage:
 *   node scripts/provision-guest-auth.mjs
 *
 * Requires:
 *   - A Firebase service-account key in FIREBASE_SERVICE_ACCOUNT env var
 *     or at ~/.firebase/boda-500805-service-account.json
 *   - firebase-admin installed (npm install firebase-admin)
 *
 * Idempotent: it creates or updates each mapping to match the guest registry.
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GUESTS_PATH = join(__dirname, "../src/guests.js");
const AUTH_DOMAIN = "boda-david-y-ayde.web.app";

// ── Service account ────────────────────────────────────────────────────
const possiblePaths = [
  process.env.FIREBASE_SERVICE_ACCOUNT,
  `${homedir()}/.firebase/boda-500805-service-account.json`,
  `${homedir()}/.firebase/boda-500805.json`,
  join(__dirname, "../../../integraciones/google_sheets/service_account.json"),
];

let serviceAccount = null;
for (const p of possiblePaths) {
  if (p && existsSync(p)) {
    serviceAccount = JSON.parse(readFileSync(p, "utf-8"));
    break;
  }
}

if (!serviceAccount) {
  console.error(
    "No service account found. Set FIREBASE_SERVICE_ACCOUNT env var or place the key at ~/.firebase/boda-500805-service-account.json"
  );
  process.exit(1);
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "boda-500805",
});

const auth = getAuth(app);
const db = getFirestore(app);

// ── Parse the guest registry (guests.js) ───────────────────────────────
// The file exports an array of guest objects. We extract the fields we need
// with a lightweight regex over the source text (avoids importing ESM).
function parseGuests(source) {
  const guests = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*username:\s*"([^"]+)",\s*firebaseEmail:\s*"([^"]+)",[^}]*?invitacionGroup:\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    guests.push({
      id: match[1],
      username: match[2],
      email: match[3],
      invitationGroup: match[4] || "",
    });
  }
  return guests;
}

const source = readFileSync(GUESTS_PATH, "utf-8");
const guests = parseGuests(source);

console.log(`Provisioning guest_auth for ${guests.length} guests…`);

let created = 0;
let updated = 0;
let failed = 0;

for (const guest of guests) {
  try {
    const user = await auth.getUserByEmail(guest.email);
    const ref = db.collection("guest_auth").doc(user.uid);
    const data = {
      guestId: guest.id,
      username: guest.username,
      invitationGroup: guest.invitationGroup,
    };
    const existing = await ref.get();
    if (existing.exists) {
      await ref.update(data);
      updated++;
    } else {
      await ref.set(data);
      created++;
    }
    console.log(`  ${guest.email} → group "${guest.invitationGroup}"`);
  } catch (error) {
    failed++;
    console.error(`  FAILED ${guest.email}: ${error.message}`);
  }
}

console.log(
  `\nDone. Created: ${created}, updated: ${updated}, failed: ${failed}.`
);
