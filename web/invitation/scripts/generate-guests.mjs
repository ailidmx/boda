/**
 * Generate web/shared/guests.js from the live Google Sheet Invitados tab
 * (source of truth). Both apps (invitation + dashboard) re-export from this
 * shared module.
 *
 * Usage:
 *   node scripts/generate-guests.mjs
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { dirname, join } from "path";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Single shared output — both apps re-export from web/shared/guests.js.
const OUT_PATH = join(__dirname, "../../shared/guests.js");
const SHEETS_ENV_PATH = join(__dirname, "../../../integraciones/google_sheets/.env");
const BACKUPS_DIR = join(__dirname, "../../../backups");
const serviceAccount = JSON.parse(readFileSync(join(__dirname, "../../../integraciones/google_sheets/service_account.json"), "utf-8"));



const AUTH_DOMAIN = "boda-david-y-ayde.web.app";

function parseEnvFile(filePath) {
  const env = {};
  const raw = readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtAssertion({ clientEmail, privateKey, scope, tokenUri }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope,
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaim = base64Url(JSON.stringify(claim));
  const unsigned = `${encodedHeader}.${encodedClaim}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${unsigned}.${signature}`;
}

async function getSheetsAccessToken() {
  const tokenUri = serviceAccount.token_uri;
  const assertion = signJwtAssertion({
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    tokenUri,
  });
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to obtain Google access token: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

function sanitizeHeaders(rawHeaders) {
  const seen = new Map();
  return rawHeaders.map((header, index) => {
    const base = String(header || "").trim() || `col_${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}

function valuesToObjects(values) {
  if (!values.length) return [];
  const headers = sanitizeHeaders(values[0]);
  return values.slice(1).map((row) => {
    const padded = row.concat(Array(Math.max(0, headers.length - row.length)).fill(""));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = padded[index] !== undefined ? String(padded[index]).trim() : "";
    });
    return obj;
  });
}

async function readInvitadosSheet() {
  const env = parseEnvFile(SHEETS_ENV_PATH);
  const spreadsheetId = (process.env.GOOGLE_SHEETS_ID || env.GOOGLE_SHEETS_ID || "").trim();
  const sheetName = (process.env.WS_INVITADOS || env.WS_INVITADOS || "Invitados").trim();
  if (!spreadsheetId) {
    throw new Error(`Missing GOOGLE_SHEETS_ID in ${SHEETS_ENV_PATH}`);
  }
  const token = await getSheetsAccessToken();
  const range = encodeURIComponent(sheetName);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to read Google Sheet: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return valuesToObjects(data.values || []);
}

function loadLegacyUsernames() {
  if (!existsSync(BACKUPS_DIR)) return new Map();
  const backupDirs = readdirSync(BACKUPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const dirName of backupDirs) {
    const guestsPath = join(BACKUPS_DIR, dirName, "guests.json");
    if (!existsSync(guestsPath)) continue;
    try {
      const records = JSON.parse(readFileSync(guestsPath, "utf-8"));
      const usernames = new Map();
      for (const record of records) {
        const id = cleanStr(record?.id || record?.data?.id);
        const username = cleanStr(record?.data?.username || record?.username);
        if (id && username) usernames.set(id, username);
      }
      if (usernames.size > 0) return usernames;
    } catch {
      // Skip malformed backup files and keep searching older snapshots.
    }
  }

  return new Map();
}

function cleanStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = cleanStr(row[key]);
    if (value) return value;
  }
  return "";
}

function toBool(v) {
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES" || s === "SI";
}

/** Map a CSV cabin name to a unit key + label + occupancy + payment. */
function cabinInfo(cabana, privado, pagado) {
  if (!cabana) return { hasCabin: false };
  const c = String(cabana).trim().toUpperCase();
  const priv = toBool(privado);
  const pag = toBool(pagado);
  let unit = null;
  let label = c;
  if (c.includes("HORTENCIA")) { unit = "hortencia"; label = "Hortencia"; }
  else if (c.includes("AZALEA")) { unit = "azalea"; label = "Azalea"; }
  else if (c.includes("DON RAFA")) { unit = "cabana_5"; label = "Cabaña 5"; }
  else if (c.includes("DON AGUSTIN")) { unit = "cabana_6"; label = "Cabaña 6"; }
  else if (c.includes("DON CARLOS")) { unit = "cabana_4"; label = "Cabaña 4"; }
  else if (c.includes("LAVANDA")) { unit = "lavanda"; label = "Lavanda"; }
  else if (c.includes("MARGARITA")) { unit = "margarita"; label = "Margarita"; }
  else if (c.includes("DALIA")) { unit = "dalia"; label = "Dalia"; }
  else if (c.includes("CASONA")) { unit = "casona"; label = "Casona"; }
  else if (c.includes("CABAÑA 1")) { unit = "madera_31"; label = "Cabaña de madera 31"; }
  else if (c.includes("CABAÑA 2")) { unit = "madera_32"; label = "Cabaña de madera 32"; }
  else if (c.includes("CABAÑA 3")) { unit = "madera_33"; label = "Cabaña de madera 33"; }
  else if (c.includes("CABAÑA 4")) { unit = "madera_34"; label = "Cabaña de madera 34"; }
  else if (c.includes("CABAÑA 5")) { unit = "cabana_5"; label = "Cabaña 5"; }
  else if (c.includes("CABAÑA 6")) { unit = "cabana_6"; label = "Cabaña 6"; }
  return {
    hasCabin: true,
    unit,
    occupancy: priv ? "privada" : "compartida",
    payment: pag ? "pagada" : "porpagar",
    cabinLabel: label,
  };
}

const previousGuestsModule = await import(`${pathToFileURL(OUT_PATH).href}?ts=${Date.now()}`);
const previousGuests = Array.isArray(previousGuestsModule.default) ? previousGuestsModule.default : [];
const previousGuestsById = new Map(previousGuests.map((guest) => [guest.id, guest]));
const legacyUsernamesById = loadLegacyUsernames();

const sheetRows = await readInvitadosSheet();

// UID is the canonical guest document identifier. firebase.auth (the live
// sheet currently uses the compatible firebase_auth spelling) only controls
// whether that guest has a Firebase Auth account.
const rows = sheetRows.filter((r) => pick(r, "UID") !== "");
console.log(`Sheet rows with UID: ${rows.length}`);

const guests = rows.map((r) => {
  const id = pick(r, "UID");
  const nombre = pick(r, "Nombre", "identity.firstName");
  const nombre2 = pick(r, "Nombre 2", "identity.middleName");
  const apellido = pick(r, "Apellido", "identity.lastName");
  const apellido2 = pick(r, "Apellido 2", "identity.maternalLastName");
  const firstName = [nombre, nombre2].filter(Boolean).join(" ");
  const lastName = [apellido, apellido2].filter(Boolean).join(" ");
  const previousGuest = previousGuestsById.get(id);
  const defaultEmail = pick(r, "_default_email");
  const derivedUsername = defaultEmail && defaultEmail.endsWith(`@${AUTH_DOMAIN}`)
    ? defaultEmail.slice(0, defaultEmail.indexOf("@"))
    : "";
  const firebaseAuth = toBool(pick(r, "firebase.auth", "firebase_auth"));
  const username = firebaseAuth
    ? previousGuest?.username || legacyUsernamesById.get(id) || pick(r, "username") || derivedUsername
    : "";
  const firebaseEmail = firebaseAuth
    ? pick(r, "firebase.Identifier", "firebase_email", "_email") || (username ? `${username}@${AUTH_DOMAIN}` : "")
    : "";
  const lang = (pick(r, "lang", "identity.lang") || "es").toLowerCase();
  const group = pick(r, "tag_group", "tagGroup", "invitacion_group", "invitacionGroup");
  const invitationGroup = pick(r, "invitacion_group", "invitacionGroup");
  const isNovio = group === "Novios";
  const cabin = cabinInfo(pick(r, "Cabaña", "hosting.cabin"), pick(r, "privateCabin?", "_privateCabin?"), pick(r, "isCabinPaid", "hosting.isCabinPaid"));
  const room = pick(r, "Cuarto", "hosting.room") || undefined;
  const cloudinaryId = pick(r, "cloudinary_id", "cloudinaryId");
  const idCheckUser = toBool(pick(r, "id_check_user", "idCheckUser"));
  // Phone comes straight from the sheet's `Celular` column (source of truth).
  const phone = pick(r, "Celular", "identity.phone");

  const g = {
    id,
    firebaseAuth,
    username,
    firebaseEmail,
    lang,
    nombre,
    nombre2,
    apellido,
    apellido2,
    firstName,
    lastName,
    group,
    ...(invitationGroup ? { invitationGroup } : {}),
    ...cabin,
    ...(room ? { room } : {}),
  };
  if (phone) g.phone = phone;
  if (cloudinaryId) g.cloudinaryId = cloudinaryId;
  if (idCheckUser) g.idCheckUser = true;
  if (isNovio) g.isNovio = true;
  return g;
});


const lines = [];
lines.push(`/**`);
lines.push(` * Guest registry — GENERATED by scripts/generate-guests.mjs`);
lines.push(` * from the live Google Sheet Invitados tab (source of truth).`);
lines.push(` * Do not edit by hand; re-run the generator after changing the sheet.`);
lines.push(` */`);
lines.push(``);
lines.push(`/** Domain used to build the Firebase auth email from a username. */`);

lines.push(`export const AUTH_EMAIL_DOMAIN = "${AUTH_DOMAIN}";`);
lines.push(``);
lines.push(`/** Shared password for every guest account. */`);
lines.push(`export const SHARED_PASSWORD = "vivamexico";`);
lines.push(``);
lines.push(`/** @type {GuestProfile[]} */`);
lines.push(`const GUESTS = [`);
for (const g of guests) {
  const parts = [`id: ${JSON.stringify(g.id)}`];
  if (g.firebaseAuth) parts.push(`firebaseAuth: true`);
  if (g.username) parts.push(`username: ${JSON.stringify(g.username)}`);
  if (g.firebaseEmail) parts.push(`firebaseEmail: ${JSON.stringify(g.firebaseEmail)}`);
  if (g.lang) parts.push(`lang: ${JSON.stringify(g.lang)}`);
  parts.push(`nombre: ${JSON.stringify(g.nombre)}`);
  parts.push(`nombre2: ${JSON.stringify(g.nombre2)}`);
  parts.push(`apellido: ${JSON.stringify(g.apellido)}`);
  parts.push(`apellido2: ${JSON.stringify(g.apellido2)}`);
  parts.push(`firstName: ${JSON.stringify(g.firstName)}`);
  parts.push(`lastName: ${JSON.stringify(g.lastName)}`);
  parts.push(`group: ${JSON.stringify(g.group)}`);
  if (g.invitationGroup) parts.push(`invitationGroup: ${JSON.stringify(g.invitationGroup)}`);
  if (g.hasCabin) {
    parts.push(`hasCabin: true`);
    parts.push(`unit: ${JSON.stringify(g.unit)}`);
    parts.push(`occupancy: ${JSON.stringify(g.occupancy)}`);
    parts.push(`payment: ${JSON.stringify(g.payment)}`);
    parts.push(`cabinLabel: ${JSON.stringify(g.cabinLabel)}`);
  } else {
    parts.push(`hasCabin: false`);
  }
  if (g.room) parts.push(`room: ${JSON.stringify(g.room)}`);
  if (g.phone) parts.push(`phone: ${JSON.stringify(g.phone)}`);
  if (g.cloudinaryId) parts.push(`cloudinaryId: ${JSON.stringify(g.cloudinaryId)}`);
  if (g.idCheckUser) parts.push(`idCheckUser: true`);
  if (g.isNovio) parts.push(`isNovio: true`);
  lines.push(`  { ${parts.join(", ")} },`);
}

lines.push(`];`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Look up a guest by username (case-insensitive).`);
lines.push(` * @param {string} username`);
lines.push(` * @returns {GuestProfile|undefined}`);
lines.push(` */`);
lines.push(`export function getGuestByUsername(username) {`);
lines.push(`  if (!username) return undefined;`);
lines.push(`  const u = String(username).trim().toLowerCase();`);
lines.push(`  return GUESTS.find((g) => g.username && g.username.toLowerCase() === u);`);
lines.push(`}`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Look up a guest by their Firebase auth email (case-insensitive).`);
lines.push(` * This is the canonical link between an auth account and a guest.`);
lines.push(` * @param {string} email`);
lines.push(` * @returns {GuestProfile|undefined}`);
lines.push(` */`);
lines.push(`export function getGuestByEmail(email) {`);
lines.push(`  if (!email) return undefined;`);
lines.push(`  const e = String(email).trim().toLowerCase();`);
lines.push(`  return GUESTS.find((g) => g.firebaseEmail && g.firebaseEmail.toLowerCase() === e);`);
lines.push(`}`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Look up a guest by id.`);
lines.push(` * @param {string} id`);
lines.push(` * @returns {GuestProfile|undefined}`);
lines.push(` */`);
lines.push(`export function getGuest(id) {`);
lines.push(`  return GUESTS.find((g) => g.id === id);`);
lines.push(`}`);
lines.push(``);
lines.push(`/**`);
lines.push(` * All guests that are not marked deleted.`);
lines.push(` * @returns {GuestProfile[]}`);
lines.push(` */`);
lines.push(`export function getActiveGuests() {`);
lines.push(`  return GUESTS.filter((g) => !g._deleted);`);
lines.push(`}`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Guests assigned to a given cabin unit.`);
lines.push(` * @param {string} unit`);
lines.push(` * @returns {GuestProfile[]}`);
lines.push(` */`);
lines.push(`export function getGuestsByUnit(unit) {`);
lines.push(`  return GUESTS.filter((g) => g.hasCabin && g.unit === unit);`);
lines.push(`}`);
lines.push(``);
lines.push(`export default GUESTS;`);

writeFileSync(OUT_PATH, lines.join("\n"), "utf-8");
console.log(`Generated ${OUT_PATH} with ${guests.length} guests.`);
