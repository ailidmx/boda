/**
 * Complete the auth-user portion of the UUID migration.
 *
 * The guest docs were already renamed to the NEW UUIDs, but the Firebase Auth
 * users were NOT migrated (the earlier attempt failed because recreating a
 * user with the same email while the old user still exists is rejected).
 *
 * This script moves each auth user from its OLD uid to its NEW uid while
 * preserving the email, password hash, display name, and disabled flag:
 *   1. Create the new user under the NEW uid WITHOUT an email (avoids the
 *      "email already in use" conflict).
 *   2. Delete the old user (frees the email).
 *   3. Update the new user's email to the old email.
 *
 * Chained migrations (e.g. antoine -> gm_38t, then antoine_faure -> antoine)
 * are handled iteratively.
 *
 * Dry-run by default. Use --execute to write.
 *
 * Usage:
 *   node scripts/fix-auth-uuids.mjs            # dry-run
 *   node scripts/fix-auth-uuids.mjs --execute  # apply changes
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

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

const SHEETS_ENV_PATH = join(__dirname, "../integraciones/google_sheets/.env");

// ── Sheet helpers ────────────────────────────────────────────────────────

function parseSimpleEnvFile(envText) {
  const result = {};
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtAssertion({ clientEmail, privateKey, scope }) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function getSheetsAccessToken() {
  const assertion = signJwtAssertion({
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
  });
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("OAuth token response missing access_token");
  return data.access_token;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

async function readSheetRows() {
  const envValues = parseSimpleEnvFile(readFileSync(SHEETS_ENV_PATH, "utf-8"));
  const spreadsheetId = envValues.GOOGLE_SHEETS_ID;
  const sheetName = envValues.WS_INVITADOS || "Invitados";
  const token = await getSheetsAccessToken();
  const range = encodeURIComponent(`${sheetName}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets values request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const values = data.values || [];
  if (values.length === 0) return [];
  const headers = values[0].map((h) => normalizeText(h));
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = {};
    headers.forEach((h, i) => { row[h] = normalizeText(values[r]?.[i] ?? ""); });
    rows.push(row);
  }
  return rows;
}

// ── Auth helpers ────────────────────────────────────────────────────────

async function readAuthUsers() {
  const users = [];
  let nextPageToken = undefined;
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return users;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("Auth UUID fix (completing auth migration)");
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log("");

  // 1. Read the sheet and build the old->new mapping.
  const rows = await readSheetRows();
  const mappings = [];
  for (const row of rows) {
    const oldId = normalizeText(row.UID);
    const newId = normalizeText(row["NEW UUID"]);
    if (!oldId || !newId) continue;
    if (oldId === newId) continue;
    const firebaseAuth = normalizeText(row["firebase.auth"] ?? row.firebase_auth);
    const authEnabled = ["TRUE", "1", "YES", "SI"].includes(firebaseAuth.toUpperCase());
    mappings.push({ oldId, newId, authEnabled });
  }
  console.log(`Mappings with a NEW UUID: ${mappings.length}`);

  // 2. Load current auth state.
  console.log("\nLoading current Auth state...");
  const authUsers = await readAuthUsers();
  const authByUid = new Map(authUsers.map((u) => [u.uid, u]));

  // 3. Iteratively build execution order, handling chained migrations.
  let pending = mappings.filter((m) => m.authEnabled);
  const ordered = [];
  const blocked = [];
  const simAuth = new Map(authByUid);

  let madeProgress = true;
  while (madeProgress && pending.length > 0) {
    madeProgress = false;
    const stillPending = [];
    for (const m of pending) {
      const oldExists = simAuth.has(m.oldId);
      const newExists = simAuth.has(m.newId);
      // We can run if the old user exists and the new uid is free.
      if (oldExists && !newExists) {
        ordered.push(m);
        simAuth.delete(m.oldId);
        simAuth.set(m.newId, {});
        madeProgress = true;
      } else {
        stillPending.push(m);
      }
    }
    pending = stillPending;
  }
  for (const m of pending) blocked.push(m);

  // 4. Print plan.
  console.log("\n=== AUTH MIGRATION PLAN (execution order) ===");
  for (const m of ordered) {
    const oldUser = authByUid.get(m.oldId);
    console.log(`  [${m.oldId} -> ${m.newId}] email=${oldUser?.email || "none"}`);
  }
  console.log(`\nTotal auth migrations: ${ordered.length}`);
  console.log(`Blocked: ${blocked.length}`);
  if (blocked.length > 0) {
    console.log("\n=== BLOCKED ===");
    for (const b of blocked) console.log(`  ! [${b.oldId} -> ${b.newId}]`);
  }

  if (!EXECUTE) {
    console.log("\n[DRY-RUN] No changes applied.");
    process.exit(0);
  }

  // 5. Apply.
  console.log("\n=== APPLYING CHANGES ===");
  let migrated = 0;
  const failures = [];
  for (const m of ordered) {
    const { oldId, newId } = m;
    const oldUser = authByUid.get(oldId);
    if (!oldUser) {
      failures.push(`[${oldId}->${newId}] old user not found`);
      continue;
    }
    try {
      // Step 1: create new user WITHOUT email.
      const createPayload = { uid: newId };
      if (oldUser.passwordHash) createPayload.passwordHash = oldUser.passwordHash;
      if (oldUser.passwordSalt) createPayload.passwordSalt = oldUser.passwordSalt;
      if (oldUser.displayName) createPayload.displayName = oldUser.displayName;
      if (oldUser.disabled === true) createPayload.disabled = true;
      await auth.createUser(createPayload);

      // Step 2: delete old user (frees the email).
      await auth.deleteUser(oldId);

      // Step 3: set the new user's email to the old email.
      if (oldUser.email) {
        await auth.updateUser(newId, { email: oldUser.email });
      }

      migrated++;
      console.log(`  ✓ Auth migrated ${oldId} -> ${newId} (email: ${oldUser.email || "none"})`);
    } catch (error) {
      failures.push(`[${oldId}->${newId}] ${error.message}`);
      console.error(`  ✗ Auth failed ${oldId} -> ${newId}: ${error.message}`);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  Auth migrated: ${migrated}`);
  console.log(`  Blocked: ${blocked.length}`);
  console.log(`  Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log("\n=== FAILURES ===");
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

await main();
