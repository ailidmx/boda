/**
 * Provision Firebase Auth accounts for the 6 new users added to the sheet.
 *
 * Strategy:
 *   1. Check if user exists by UID (guest ID). If yes, done.
 *   2. If not, look up by email. If found with a different UID, we need to
 *      delete the old account and create a new one with the correct UID.
 *      (Firebase Auth UIDs are immutable.)
 *   3. If not found at all, create new user with UID = guest ID.
 *
 * Usage:
 *   node scripts/provision-new-auth-users.mjs
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

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getAuth } = await import(authPath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth(app);

const NEW_USERS = [
  { uid: "michel_passelande", email: "michel_passelande@boda-david-y-ayde.web.app", displayName: "Michel Passelande" },
  { uid: "nicole_passelande", email: "nicole_passelande@boda-david-y-ayde.web.app", displayName: "Nicole Passelande" },
  { uid: "sébastien_passelande", email: "sébastien_passelande@boda-david-y-ayde.web.app", displayName: "Sébastien Passelande" },
  { uid: "gilles", email: "gilles@boda-david-y-ayde.web.app", displayName: "Gilles" },
  { uid: "habiba", email: "habiba@boda-david-y-ayde.web.app", displayName: "Habiba" },
  { uid: "yvon_leborgne", email: "yvon_leborgne@boda-david-y-ayde.web.app", displayName: "Yvon Leborgne" },
];

const PASSWORD = "vivamexico";

let created = 0;
let recreated = 0;
let alreadyExists = 0;
let errors = 0;

for (const user of NEW_USERS) {
  try {
    // Step 1: Check if user already exists by UID
    try {
      const existing = await auth.getUser(user.uid);
      console.log(`✓ ${user.uid} already exists (email: ${existing.email})`);
      alreadyExists++;
      continue;
    } catch (e) {
      if (e.code !== "auth/user-not-found") {
        console.error(`✗ Error checking ${user.uid}: ${e.message}`);
        errors++;
        continue;
      }
    }

    // Step 2: Look up by email
    let existingByEmail = null;
    try {
      existingByEmail = await auth.getUserByEmail(user.email);
      console.log(`→ ${user.email} exists with uid=${existingByEmail.uid} (not ${user.uid})`);
    } catch (e) {
      if (e.code !== "auth/user-not-found") {
        console.error(`✗ Error looking up ${user.email}: ${e.message}`);
        errors++;
        continue;
      }
    }

    if (existingByEmail) {
      // Delete the old account and recreate with correct UID
      console.log(`  Deleting old account ${existingByEmail.uid}...`);
      await auth.deleteUser(existingByEmail.uid);
      const createdUser = await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: PASSWORD,
        displayName: user.displayName,
      });
      console.log(`✓ Recreated ${user.uid} (${user.email})`);
      recreated++;
      continue;
    }

    // Step 3: Create new user
    const createdUser = await auth.createUser({
      uid: user.uid,
      email: user.email,
      password: PASSWORD,
      displayName: user.displayName,
    });
    console.log(`✓ Created ${user.uid} (${user.email})`);
    created++;
  } catch (e) {
    console.error(`✗ Error processing ${user.uid}: ${e.message}`);
    errors++;
  }
}

console.log(`\nSummary: ${created} created, ${recreated} recreated, ${alreadyExists} already existed, ${errors} errors`);
process.exit(errors > 0 ? 1 : 0);
