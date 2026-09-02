/**
 * Force-reset a SINGLE guest's Firebase Auth password.
 *
 * Default password: "vivamexico" (the shared guest password — see
 * web/shared/guests.js SHARED_PASSWORD and functions/index.js DEFAULT_PASSWORD).
 *
 * Resolve the target by exactly ONE of:
 *   --id <guestId>         guest document id (== Firebase Auth uid)
 *   --email <email>        Firebase Auth login email
 *   --username <username>  guest username
 *   --name <partial>       search live Firestore `guests` by full name
 *                          (case/accent-insensitive substring)
 *
 * Dry-run by default. Add --execute to actually reset.
 * Override the password with --password <value>.
 *
 * Usage:
 *   node scripts/reset-guest-password.mjs --id fred --execute
 *   node scripts/reset-guest-password.mjs --name "Fred" --execute
 *   node scripts/reset-guest-password.mjs --email fred@boda-david-y-ayde.web.app
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

const EXECUTE = process.argv.includes("--execute");
const PASSWORD = argValue("--password") || "vivamexico";
const ID = argValue("--id");
const EMAIL = argValue("--email");
const USERNAME = argValue("--username");
const NAME = argValue("--name");

const resolvers = [ID, EMAIL, USERNAME, NAME].filter(Boolean);
if (resolvers.length !== 1) {
  console.error(
    "Provide exactly ONE of --id, --email, --username, --name.\n\n" +
      "Examples:\n" +
      '  node scripts/reset-guest-password.mjs --id fred --execute\n' +
      '  node scripts/reset-guest-password.mjs --name "Fred" --execute\n',
  );
  process.exit(1);
}

const serviceAccount = require(
  join(__dirname, "../integraciones/google_sheets/service_account.json"),
);

// Resolve firebase-admin from the invitation app's node_modules (avoids the
// CJS/ESM interop issue with jwks-rsa/jose in firebase-admin v14, same as
// create-missing-auth-user.mjs and reset-auth-passwords.mjs).
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));

const { initializeApp, cert } = await import(
  reqFromInvitation.resolve("firebase-admin/app")
);
const { getAuth } = await import(reqFromInvitation.resolve("firebase-admin/auth"));
const { getFirestore } = await import(
  reqFromInvitation.resolve("firebase-admin/firestore")
);

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const auth = getAuth(app);
const db = getFirestore(app, "boda-us-central1");

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fullName(data) {
  const idn = data.identity || {};
  const parts = [
    idn.firstName ?? data.firstName ?? data.nombre ?? "",
    idn.lastName ?? data.lastName ?? data.apellido ?? "",
    idn.maternalLastName ?? data.apellido2 ?? "",
  ];
  return parts.filter(Boolean).join(" ");
}

function printGuest(g) {
  const name = fullName(g) || "(no name)";
  const email = g.firebaseEmail || g.email || "(no email)";
  return `${name}  [id=${g.id}]  [email=${email}]`;
}

async function fetchGuests() {
  const snap = await db.collection("guests").get();
  const guests = [];
  snap.forEach((doc) => guests.push({ id: doc.id, ...doc.data() }));
  return guests;
}

async function main() {
  const guests = await fetchGuests();
  let target = null;

  if (ID) {
    target = guests.find((g) => g.id === ID) || { id: ID };
  } else if (EMAIL) {
    const needle = norm(EMAIL);
    target = guests.find(
      (g) => norm(g.firebaseEmail) === needle || norm(g.email) === needle,
    );
    if (!target) {
      // Fall back to Firebase Auth itself.
      try {
        const user = await auth.getUserByEmail(EMAIL);
        target = { id: user.uid };
      } catch {
        console.error(`No auth user and no guest record found for email "${EMAIL}".`);
        process.exit(1);
      }
    }
  } else if (USERNAME) {
    target = guests.find((g) => norm(g.username) === norm(USERNAME));
  } else if (NAME) {
    const needle = norm(NAME);
    const matches = guests.filter((g) =>
      norm(`${fullName(g)} ${g.username ?? ""} ${g.id ?? ""}`).includes(needle),
    );
    if (matches.length === 0) {
      console.error(`No guest matches name "${NAME}".`);
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error(`"${NAME}" matches ${matches.length} guests — be more specific or use --id:\n`);
      for (const m of matches) console.error(`  - ${printGuest(m)}`);
      process.exit(1);
    }
    target = matches[0];
  }

  if (!target) {
    console.error("Could not resolve a guest. Use --id / --email / --username / --name.");
    process.exit(1);
  }

  const uid = target.id;
  let user = null;
  try {
    user = await auth.getUser(uid);
  } catch {
    // no auth user yet
  }

  if (!user) {
    console.error(`No Firebase Auth user for uid "${uid}" (${printGuest(target)}).`);
    console.error(
      "Create the auth account first (scripts/create-missing-auth-user.mjs or the dashboard createGuestAuth flow), then re-run this script.",
    );
    process.exit(1);
  }

  console.log("Password reset plan:");
  console.log(`  Guest : ${printGuest(target)}`);
  console.log(`  UID   : ${user.uid}`);
  console.log(`  Email : ${user.email || "(none)"}`);
  console.log(`  New pw: ${PASSWORD}`);

  if (!EXECUTE) {
    console.log("\nDry-run: no change made. Re-run with --execute to apply.");
    return;
  }

  await auth.updateUser(uid, { password: PASSWORD });
  console.log(`\n✓ Password reset for ${user.uid} (${user.email || "no email"}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
