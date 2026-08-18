/**
 * Sync the FULL Firebase Auth user list into a Firestore `auth_users`
 * collection so the client-side dashboard can show which guests have a
 * Firebase Auth account and their auth email.
 *
 * The client cannot list all Auth users (that requires the Admin SDK), so we
 * mirror them here. Each doc id = the auth user's UID (which IS the guest doc
 * id in the `guests` collection), and the doc stores the auth email.
 *
 * Usage:
 *   node scripts/sync-auth-users.mjs
 *
 * This is idempotent: it upserts every auth user and removes any stale
 * `auth_users` doc whose uid no longer exists in Auth.
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getAuth } = await import(authPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth(app);
const db = getFirestore(app);

const AUTH_USERS_COLLECTION = "auth_users";

async function listAllUsers() {
  const users = [];
  let nextPageToken;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  return users;
}

async function main() {
  console.log("Listing all Firebase Auth users…");
  const users = await listAllUsers();
  console.log(`Found ${users.length} auth users.`);

  const batch = db.batch();
  const seenUids = new Set();

  for (const user of users) {
    const uid = user.uid;
    const email = user.email || "";
    seenUids.add(uid);
    batch.set(
      db.collection(AUTH_USERS_COLLECTION).doc(uid),
      {
        uid,
        email,
        displayName: user.displayName || "",
        createdAt: user.metadata?.creationTime || "",
        lastSignInAt: user.metadata?.lastSignInTime || "",
        syncedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  // Remove stale auth_users docs whose uid no longer exists in Auth.
  const existing = await db.collection(AUTH_USERS_COLLECTION).get();
  let removed = 0;
  existing.forEach((doc) => {
    if (!seenUids.has(doc.id)) {
      batch.delete(doc.ref);
      removed += 1;
    }
  });

  await batch.commit();
  console.log(`Upserted ${users.length} auth users, removed ${removed} stale docs.`);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
