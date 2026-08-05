/**
 * Check the current state of the 6 new users' auth accounts.
 * Just looks up by email and by UID, no changes made.
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

const USERS = [
  { uid: "michel_passelande", email: "michel_passelande@boda-david-y-ayde.web.app" },
  { uid: "nicole_passelande", email: "nicole_passelande@boda-david-y-ayde.web.app" },
  { uid: "sébastien_passelande", email: "sébastien_passelande@boda-david-y-ayde.web.app" },
  { uid: "gilles", email: "gilles@boda-david-y-ayde.web.app" },
  { uid: "habiba", email: "habiba@boda-david-y-ayde.web.app" },
  { uid: "yvon_leborgne", email: "yvon_leborgne@boda-david-y-ayde.web.app" },
];

for (const user of USERS) {
  console.log(`\n=== ${user.uid} ===`);
  
  // Check by UID
  try {
    const byUid = await auth.getUser(user.uid);
    console.log(`  By UID: EXISTS (email: ${byUid.email}, displayName: ${byUid.displayName})`);
  } catch (e) {
    console.log(`  By UID: NOT FOUND (${e.code})`);
  }

  // Check by email
  try {
    const byEmail = await auth.getUserByEmail(user.email);
    console.log(`  By email: EXISTS (uid: ${byEmail.uid}, displayName: ${byEmail.displayName})`);
  } catch (e) {
    console.log(`  By email: NOT FOUND (${e.code})`);
  }
}

process.exit(0);
