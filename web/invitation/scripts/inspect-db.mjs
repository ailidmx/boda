// Comprehensive DB inspection for boda-500805 (Firestore only).
// Run: cd web/invitation && node scripts/inspect-db.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// 1. List all collections
console.log("=== FIRESTORE COLLECTIONS ===");
const collections = await db.listCollections();
for (const col of collections) {
  const snap = await col.get();
  console.log(`  ${col.id}: ${snap.size} docs`);
}

// 2. Sample guests doc IDs
console.log("\n=== GUESTS DOC IDS (first 60) ===");
const guestsSnap = await db.collection("guests").get();
const guestIds = [];
guestsSnap.forEach((doc) => guestIds.push(doc.id));
guestIds.sort();
console.log(`  total: ${guestIds.length}`);
for (const id of guestIds.slice(0, 60)) {
  console.log(`  ${id}`);
}

// 3. Sample guest_auth doc IDs
console.log("\n=== GUEST_AUTH DOC IDS (first 30) ===");
try {
  const gaSnap = await db.collection("guest_auth").get();
  const gaIds = [];
  gaSnap.forEach((doc) => gaIds.push(doc.id));
  console.log(`  total: ${gaIds.length}`);
  for (const id of gaIds.slice(0, 30)) {
    const d = gaSnap.docs.find((x) => x.id === id)?.data();
    console.log(`  ${id} | guestId=${d?.guestId ?? "?"} | group=${d?.invitationGroup ?? "?"}`);
  }
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

process.exit(0);
