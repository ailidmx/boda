/**
 * Ensure the couple's (David & Aydé) Firebase Auth UIDs are mapped in the
 * `guest_auth` collection to guestId "david" / "ayde". The Firestore rules
 * use this mapping in `isCouple()` to grant the couple write access to the
 * CRUD collections (guests, invitation_groups, etc.).
 *
 * Uses the Firestore REST API with a service-account JWT to avoid the
 * firebase-admin ESM/CJS dependency issue on newer Node versions.
 *
 * Usage:
 *   node scripts/fix-guest-auth-couple.mjs
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PROJECT_ID = "boda-500805";
const AUTH_DOMAIN = "boda-david-y-ayde.web.app";

const possiblePaths = [
  process.env.FIREBASE_SERVICE_ACCOUNT,
  `${homedir()}/.firebase/boda-500805-service-account.json`,
  `${homedir()}/.firebase/boda-500805.json`,
  join(process.cwd(), "../../integraciones/google_sheets/service_account.json"),
];

let serviceAccount = null;
for (const p of possiblePaths) {
  if (p && existsSync(p)) {
    serviceAccount = JSON.parse(readFileSync(p, "utf-8"));
    break;
  }
}

if (!serviceAccount) {
  console.error("No service account found.");
  process.exit(1);
}

// ── Mint an OAuth2 access token from the service account ───────────────
function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const { private_key: privateKey } = serviceAccount;
  const { createPrivateKey, sign } = await import("crypto");
  const key = createPrivateKey(privateKey);

  const signature = sign("RSA-SHA256", Buffer.from(signingInput), key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64url(signature)}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Firestore REST helpers ──────────────────────────────────────────────
async function fsGet(token, path) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fsSet(token, path, fields) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?updateMask.fieldPaths=guestId&updateMask.fieldPaths=username&updateMask.fieldPaths=invitationGroup`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: encodeFields(fields) }),
    }
  );
  if (!res.ok) throw new Error(`SET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

function encodeFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = { stringValue: String(v) };
  }
  return out;
}

// ── Find the couple's UIDs by email (admin endpoint, service account) ──
async function findUidByEmail(token, email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.log(`  lookup ${email} failed: ${res.status} ${text}`);
    return null;
  }
  const data = await res.json();
  return data.users?.[0]?.localId || null;
}


const token = await getAccessToken();
console.log("Got access token.");

// The couple's emails follow the per-guest convention.
const couple = [
  { email: `david@${AUTH_DOMAIN}`, guestId: "david" },
  { email: `ayde@${AUTH_DOMAIN}`, guestId: "ayde" },
];

for (const c of couple) {
  const uid = await findUidByEmail(token, c.email);
  if (!uid) {
    console.log(`  (lookup failed for ${c.email}; skipping)`);
    continue;
  }

  const path = `guest_auth/${uid}`;
  const existing = await fsGet(token, path);
  const data = { guestId: c.guestId, username: c.guestId, invitationGroup: "Novios" };
  if (existing) {
    console.log(`  Updating ${c.email} (uid ${uid}) → guestId "${c.guestId}"`);
  } else {
    console.log(`  Creating ${c.email} (uid ${uid}) → guestId "${c.guestId}"`);
  }
  await fsSet(token, path, data);
}

console.log("\nDone. If no UIDs were updated, set FIREBASE_WEB_API_KEY and re-run.");
