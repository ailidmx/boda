// Comprehensive DB inspection for boda-500805.
// Run: node scripts/inspect-db.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../integraciones/google_sheets/service_account.json"), "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

// 1. List all collections
console.log("=== FIRESTORE COLLECTIONS ===");
const collections = await db.listCollections();
for (const col of collections) {
  const snap = await col.get();
  console.log(`  ${col.id}: ${snap.size} docs`);
}

// 2. Sample guests doc IDs
console.log("\n=== GUESTS DOC IDS (first 40) ===");
const guestsSnap = await db.collection("guests").get();
const guestIds = [];
guestsSnap.forEach((doc) => guestIds.push(doc.id));
guestIds.sort();
console.log(`  total: ${guestIds.length}`);
for (const id of guestIds.slice(0, 40)) {
  console.log(`  ${id}`);
}

// 3. Auth users
console.log("\n=== AUTH USERS ===");
let authCount = 0;
const authEmails = [];
try {
  const listUsersResult = await auth.listUsers(1000);
  authCount = listUsersResult.users.length;
  for (const u of listUsersResult.users) {
    authEmails.push(`${u.uid} | ${u.email} | ${u.displayName ?? ""}`);
  }
  console.log(`  total: ${authCount}`);
  for (const e of authEmails.slice(0, 40)) {
    console.log(`  ${e}`);
  }
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

process.exit(0);
