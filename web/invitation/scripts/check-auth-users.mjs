/**
 * Dry-run: list the auth users relevant to the David account migration.
 * Targets the boda-500805 project via Application Default Credentials.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Use Application Default Credentials (ADC) but pin the project to boda-500805.
const app = initializeApp({ projectId: "boda-500805" });
const auth = getAuth(app);

const targets = [
  "david@boda-david-y-ayde.web.app",
  "david.aili.mx@gmail.com",
];

for (const email of targets) {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`FOUND  ${email}  uid=${user.uid}  disabled=${user.disabled}`);
  } catch (err) {
    console.log(`MISSING ${email}  (${err.code || err.message})`);
  }
}

process.exit(0);
