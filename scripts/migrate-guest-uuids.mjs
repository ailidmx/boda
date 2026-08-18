/**
 * Migrate guest UUIDs based on the "NEW UUID" column in the Invitados sheet.
 *
 * For each guest row where "NEW UUID" is populated, this script:
 *   1. Recreates the Firebase Auth user under the NEW UUID (preserving email,
 *      password hash, display name, etc.) and deletes the old auth user.
 *   2. Renames the `guests/{oldId}` document to `guests/{newId}` (updating the
 *      `id` and `guestId` fields inside).
 *   3. Renames the `attendance_responses/{oldId}` document to
 *      `attendance_responses/{newId}` (updating the `guestId` field inside).
 *   4. Updates any `thanks` document whose `guest` field equals the old ID.
 *   5. Updates any `rsvp_submissions` / `experience_suggestions` /
 *      `coast_interest` / `petanque_participation` document whose
 *      `invitationCode` field references the old ID.
 *
 * Chained migrations are handled iteratively: if guest A is being renamed to
 * an ID currently held by guest B, and guest B is itself being renamed away,
 * the script processes B first, then A. It loops until no more progress.
 *
 * Dry-run by default. Use --execute to write.
 *
 * Usage:
 *   node scripts/migrate-guest-uuids.mjs            # dry-run
 *   node scripts/migrate-guest-uuids.mjs --execute  # apply changes
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
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
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore, FieldValue } = await import(firestorePath);
const { getAuth } = await import(authPath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");
const auth = getAuth(app);

const SHEETS_ENV_PATH = join(__dirname, "../integraciones/google_sheets/.env");

const GUEST_COLLECTION = "guests";
const ATTENDANCE_COLLECTION = "attendance_responses";
const THANKS_COLLECTION = "thanks";
const REFERENCE_COLLECTIONS = [
  "rsvp_submissions",
  "experience_suggestions",
  "coast_interest",
  "petanque_participation",
];

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
  console.log("Guest UUID migration");
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
    mappings.push({ oldId, newId, firebaseAuth: normalizeText(row["firebase.auth"] ?? row.firebase_auth) });
  }
  console.log(`Guests with a NEW UUID: ${mappings.length}`);
  if (mappings.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  // Check for duplicate new IDs.
  const newIdCounts = new Map();
  for (const m of mappings) newIdCounts.set(m.newId, (newIdCounts.get(m.newId) || 0) + 1);
  const dupNewIds = [...newIdCounts.entries()].filter(([, c]) => c > 1);
  if (dupNewIds.length > 0) {
    console.error(`\nERROR: Duplicate NEW UUID values: ${dupNewIds.map(([id, c]) => `${id} (${c}x)`).join(", ")}`);
    process.exit(1);
  }

  // 2. Load current Firestore + Auth state.
  console.log("\nLoading current Firestore + Auth state...");
  const authUsers = await readAuthUsers();
  const authByUid = new Map(authUsers.map((u) => [u.uid, u]));

  const guestDocs = new Map();
  const guestSnap = await db.collection(GUEST_COLLECTION).get();
  guestSnap.forEach((d) => guestDocs.set(d.id, d.data()));

  const attendanceDocs = new Map();
  const attendanceSnap = await db.collection(ATTENDANCE_COLLECTION).get();
  attendanceSnap.forEach((d) => attendanceDocs.set(d.id, d.data()));

  const thanksDocs = [];
  const thanksSnap = await db.collection(THANKS_COLLECTION).get();
  thanksSnap.forEach((d) => thanksDocs.push({ id: d.id, data: d.data() }));

  const refDocs = new Map();
  for (const col of REFERENCE_COLLECTIONS) {
    const docs = [];
    const snap = await db.collection(col).get();
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    refDocs.set(col, docs);
  }

  // 3. Iteratively build the execution order, handling chained migrations.
  //    We simulate the state changes in memory so that a migration that frees
  //    up an ID (e.g. antoine -> gm_38t) unblocks a later one (antoine_faure -> antoine).
  let pending = mappings.map((m) => ({ ...m }));
  const ordered = []; // migrations in execution order
  const blocked = []; // migrations that can never run (true conflicts)
  const issues = [];

  // Track simulated state.
  const simGuest = new Map(guestDocs); // id -> data (or undefined if deleted)
  const simAuth = new Map(authByUid); // uid -> user record (or undefined if deleted)

  let madeProgress = true;
  while (madeProgress && pending.length > 0) {
    madeProgress = false;
    const stillPending = [];
    for (const m of pending) {
      const oldGuestExists = simGuest.has(m.oldId);
      const newGuestExists = simGuest.has(m.newId);
      const oldAuthExists = simAuth.has(m.oldId);
      const newAuthExists = simAuth.has(m.newId);
      const authEnabled = ["TRUE", "1", "YES", "SI"].includes(String(m.firebaseAuth).toUpperCase());

      // Determine if this migration is currently unblocked.
      // Guest: old must exist (or be creatable) and new must be free.
      // Auth: if auth enabled, old auth must exist (or be creatable) and new auth must be free.
      const guestOk = !newGuestExists; // new ID must be free
      const authOk = !authEnabled || !newAuthExists; // new auth must be free (if auth enabled)

      if (guestOk && authOk) {
        // This migration can run now.
        ordered.push(m);
        // Simulate the state change.
        if (oldGuestExists) {
          simGuest.delete(m.oldId);
          simGuest.set(m.newId, {});
        } else {
          simGuest.set(m.newId, {});
        }
        if (authEnabled) {
          if (oldAuthExists) simAuth.delete(m.oldId);
          simAuth.set(m.newId, {});
        }
        madeProgress = true;
      } else {
        stillPending.push(m);
      }
    }
    pending = stillPending;
  }

  // Anything still pending is a true conflict (blocked forever).
  for (const m of pending) {
    blocked.push(m);
    issues.push(`[${m.oldId}->${m.newId}] Blocked: target ID is occupied and not being freed by another migration`);
  }

  // 4. Print the plan.
  console.log("\n=== MIGRATION PLAN (execution order) ===");
  for (const m of ordered) {
    const oldAuth = authByUid.get(m.oldId);
    const authEnabled = ["TRUE", "1", "YES", "SI"].includes(String(m.firebaseAuth).toUpperCase());
    const authAction = authEnabled
      ? (oldAuth ? `recreate (email: ${oldAuth.email || "none"})` : "create")
      : (authByUid.has(m.oldId) ? "delete (firebase.auth false)" : "none");
    const guestAction = guestDocs.has(m.oldId) ? "rename" : "create";
    const attAction = attendanceDocs.has(m.oldId) ? "rename" : "none";
    console.log(`  [${m.oldId} -> ${m.newId}]`);
    console.log(`    Auth: ${authAction}`);
    console.log(`    Guest: ${guestAction}`);
    console.log(`    Attendance: ${attAction}`);
    const thanks = thanksDocs.filter((t) => normalizeText(t.data.guest) === m.oldId);
    if (thanks.length > 0) console.log(`    Thanks: ${thanks.length} doc(s)`);
    for (const col of REFERENCE_COLLECTIONS) {
      const refs = (refDocs.get(col) || []).filter((d) => normalizeText(d.data.invitationCode) === m.oldId);
      if (refs.length > 0) console.log(`    ${col}: ${refs.length} doc(s)`);
    }
  }

  console.log(`\nTotal migrations: ${ordered.length}`);
  console.log(`Blocked (true conflicts): ${blocked.length}`);
  if (blocked.length > 0) {
    console.log("\n=== BLOCKED ===");
    for (const b of blocked) console.log(`  ! [${b.oldId} -> ${b.newId}]`);
  }
  if (issues.length > 0) {
    console.log("\n=== ISSUES ===");
    for (const issue of issues) console.log(`  ! ${issue}`);
  }

  if (!EXECUTE) {
    console.log("\n[DRY-RUN] No changes applied.");
    process.exit(0);
  }

  // 5. Create a backup before applying changes.
  const backupDir = join(__dirname, "../backups");
  mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = join(backupDir, `pre-uuid-migration-${ts}`);
  mkdirSync(runDir, { recursive: true });

  const guestBackup = {};
  guestDocs.forEach((data, id) => { guestBackup[id] = data; });
  writeFileSync(join(runDir, "guests.json"), JSON.stringify(guestBackup, null, 2), "utf8");

  const attendanceBackup = {};
  attendanceDocs.forEach((data, id) => { attendanceBackup[id] = data; });
  writeFileSync(join(runDir, "attendance_responses.json"), JSON.stringify(attendanceBackup, null, 2), "utf8");

  const thanksBackup = {};
  thanksDocs.forEach((t) => { thanksBackup[t.id] = t.data; });
  writeFileSync(join(runDir, "thanks.json"), JSON.stringify(thanksBackup, null, 2), "utf8");

  for (const col of REFERENCE_COLLECTIONS) {
    const colBackup = {};
    (refDocs.get(col) || []).forEach((d) => { colBackup[d.id] = d.data; });
    writeFileSync(join(runDir, `${col}.json`), JSON.stringify(colBackup, null, 2), "utf8");
  }

  const authBackup = {};
  authUsers.forEach((u) => {
    authBackup[u.uid] = {
      email: u.email,
      displayName: u.displayName,
      disabled: u.disabled,
      emailVerified: u.emailVerified,
    };
  });
  writeFileSync(join(runDir, "auth_users.json"), JSON.stringify(authBackup, null, 2), "utf8");

  console.log(`\n[backup] saved to ${runDir}`);

  // 6. Apply changes in execution order.
  console.log("\n=== APPLYING CHANGES ===");
  let authRecreated = 0;
  let authCreated = 0;
  let authDeleted = 0;
  let guestsRenamed = 0;
  let attendanceRenamed = 0;
  let thanksUpdated = 0;
  let refsUpdated = 0;
  const failures = [];

  for (const m of ordered) {
    const { oldId, newId } = m;
    const authEnabled = ["TRUE", "1", "YES", "SI"].includes(String(m.firebaseAuth).toUpperCase());
    const oldAuth = authByUid.get(oldId);

    // --- Auth ---
    if (authEnabled) {
      try {
        if (oldAuth) {
          const createPayload = { uid: newId };
          if (oldAuth.email) createPayload.email = oldAuth.email;
          if (oldAuth.passwordHash) createPayload.passwordHash = oldAuth.passwordHash;
          if (oldAuth.passwordSalt) createPayload.passwordSalt = oldAuth.passwordSalt;
          if (oldAuth.displayName) createPayload.displayName = oldAuth.displayName;
          if (oldAuth.disabled === true) createPayload.disabled = true;
          await auth.createUser(createPayload);
          await auth.deleteUser(oldId);
          authRecreated++;
          console.log(`  ✓ Auth recreated ${oldId} -> ${newId}`);
        } else {
          await auth.createUser({ uid: newId });
          authCreated++;
          console.log(`  ✓ Auth created ${newId}`);
        }
      } catch (error) {
        failures.push(`[${oldId}->${newId}] Auth failed: ${error.message}`);
        console.error(`  ✗ Auth failed ${oldId} -> ${newId}: ${error.message}`);
      }
    } else if (authByUid.has(oldId)) {
      try {
        await auth.deleteUser(oldId);
        authDeleted++;
        console.log(`  ✓ Auth deleted ${oldId}`);
      } catch (error) {
        failures.push(`[${oldId}->${newId}] Auth delete failed: ${error.message}`);
        console.error(`  ✗ Auth delete failed ${oldId}: ${error.message}`);
      }
    }

    // --- Guest doc ---
    try {
      const oldData = guestDocs.get(oldId);
      if (oldData) {
        const newData = { ...oldData, id: newId, guestId: newId };
        await db.collection(GUEST_COLLECTION).doc(newId).set(newData);
        await db.collection(GUEST_COLLECTION).doc(oldId).delete();
        guestsRenamed++;
        console.log(`  ✓ Guest renamed ${oldId} -> ${newId}`);
      } else {
        await db.collection(GUEST_COLLECTION).doc(newId).set({
          id: newId,
          guestId: newId,
          updatedBy: "uuid_migration",
          updatedAt: FieldValue.serverTimestamp(),
        });
        guestsRenamed++;
        console.log(`  ✓ Guest created ${newId}`);
      }
    } catch (error) {
      failures.push(`[${oldId}->${newId}] Guest failed: ${error.message}`);
      console.error(`  ✗ Guest failed ${oldId} -> ${newId}: ${error.message}`);
    }

    // --- Attendance ---
    const oldAtt = attendanceDocs.get(oldId);
    if (oldAtt) {
      try {
        const newData = { ...oldAtt, guestId: newId };
        await db.collection(ATTENDANCE_COLLECTION).doc(newId).set(newData);
        await db.collection(ATTENDANCE_COLLECTION).doc(oldId).delete();
        attendanceRenamed++;
        console.log(`  ✓ Attendance renamed ${oldId} -> ${newId}`);
      } catch (error) {
        failures.push(`[${oldId}->${newId}] Attendance failed: ${error.message}`);
        console.error(`  ✗ Attendance failed ${oldId} -> ${newId}: ${error.message}`);
      }
    }

    // --- Thanks ---
    for (const t of thanksDocs) {
      if (normalizeText(t.data.guest) === oldId) {
        try {
          await db.collection(THANKS_COLLECTION).doc(t.id).update({ guest: newId });
          thanksUpdated++;
          console.log(`  ✓ Thanks ${t.id}: guest ${oldId} -> ${newId}`);
        } catch (error) {
          failures.push(`[${oldId}->${newId}] Thanks update failed (${t.id}): ${error.message}`);
          console.error(`  ✗ Thanks update failed ${t.id}: ${error.message}`);
        }
      }
    }

    // --- References ---
    for (const col of REFERENCE_COLLECTIONS) {
      for (const d of refDocs.get(col) || []) {
        if (normalizeText(d.data.invitationCode) === oldId) {
          try {
            await db.collection(col).doc(d.id).update({ invitationCode: newId });
            refsUpdated++;
            console.log(`  ✓ ${col}/${d.id}: invitationCode ${oldId} -> ${newId}`);
          } catch (error) {
            failures.push(`[${oldId}->${newId}] Reference update failed (${col}/${d.id}): ${error.message}`);
            console.error(`  ✗ Reference update failed ${col}/${d.id}: ${error.message}`);
          }
        }
      }
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  Auth recreated: ${authRecreated}`);
  console.log(`  Auth created:   ${authCreated}`);
  console.log(`  Auth deleted:   ${authDeleted}`);
  console.log(`  Guests renamed: ${guestsRenamed}`);
  console.log(`  Attendance renamed: ${attendanceRenamed}`);
  console.log(`  Thanks updated: ${thanksUpdated}`);
  console.log(`  References updated: ${refsUpdated}`);
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
