// Compare Firebase Auth UIDs against guest doc IDs.
// Run from functions/: node inspect-auth-guests.mjs
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
const db = getFirestore(app, "boda-us-central1");
const auth = getAuth(app);

const guestIds = new Set();
const guestSnap = await db.collection("guests").get();
guestSnap.forEach((d) => guestIds.add(d.id));

const users = [];
let nextPageToken = undefined;
do {
  const page = await auth.listUsers(1000, nextPageToken);
  users.push(...page.users);
  nextPageToken = page.pageToken;
} while (nextPageToken);

console.log(`Auth users: ${users.length}`);
console.log(`Guest docs: ${guestIds.size}\n`);

let uidMatchesDoc = 0;
let uidNoDoc = 0;
const noDoc = [];
for (const u of users) {
  if (guestIds.has(u.uid)) {
    uidMatchesDoc++;
  } else {
    uidNoDoc++;
    noDoc.push({ uid: u.uid, email: u.email });
  }
}
console.log(`Auth UIDs that match a guest doc ID: ${uidMatchesDoc}`);
console.log(`Auth UIDs with NO matching guest doc: ${uidNoDoc}\n`);
for (const n of noDoc) {
  console.log(`  uid="${n.uid}" email="${n.email}"`);
}
process.exit(0);
