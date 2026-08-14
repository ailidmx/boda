/**
 * Google Sheet -> Firestore guest refresh.
 *
 * Strict mode by default:
 *   1. Reads the live Google Sheet directly.
 *   2. Skips any header that starts with "_".
 *   3. Normalizes the sheet row into the canonical Firestore guest structure.
 *   4. Compares sheet vs Firestore both ways and prints alerts.
 *   5. Dry-run by default. Use --execute to write.
 *   6. Supports a one-record refresh with --guest="David AILI" or --guest-id=david_aïli.
 *
 * Auth metadata fields are handled separately:
 *   - UID -> guest document id and Firebase Auth UID
 *   - firebase.auth / firebase_auth -> whether the Auth record must exist
 *   - firebase.Identifier / firebase_email -> auth email identifier
 *   - firebase.password / password -> auth provisioning password only
 *
 * The script is intentionally conservative. If the sheet/Firestore contract
 * is not clean, it reports the exact mismatches and exits without writing.
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { toBool, toNum, toStr } = require(join(__dirname, "sheet-mapping.cjs"));

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const MARK_STALE = args.includes("--mark-stale");
const CI_MODE = args.includes("--ci");
const FAIL_ON_DRIFT = CI_MODE || args.includes("--fail-on-drift");
const guestFilter = args.find((arg) => arg.startsWith("--guest="))?.split("=")[1];
const guestIdFilter = args.find((arg) => arg.startsWith("--guest-id="))?.split("=")[1];
const reportPathArg = args.find((arg) => arg.startsWith("--report-json="))?.split("=")[1];
const reportMdPathArg = args.find((arg) => arg.startsWith("--report-md="))?.split("=")[1];
const sheetIdArg = args.find((arg) => arg.startsWith("--sheet-id="))?.split("=")[1];
const sheetNameArg = args.find((arg) => arg.startsWith("--sheet-name="))?.split("=")[1];
const REPORT_JSON_PATH = reportPathArg ? join(__dirname, "..", reportPathArg) : (CI_MODE ? join(__dirname, "../reports/gsheet-firestore-sync-report.json") : null);
const REPORT_MD_PATH = reportMdPathArg ? join(__dirname, "..", reportMdPathArg) : null;

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));
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

const AUTH_ONLY_HEADERS = new Set([
  "firebase.auth",
  "firebase_auth",
  "firebase.Identifier",
  "firebase.password",
  "firebase_email",
  "password",
]);

const IGNORE_HEADERS = new Set([
  "Avatar",
  "Nombre Completo",
  "Cuarto_desc",
  "Xtra_cuarto_desc",
  "photo_url",
  "col_54",
  "col_55",
]);

const HEADER_TO_PATH = new Map([
  ["UID", "id"],
  ["id", "id"],
  ["Nombre", "identity.firstName"],
  ["identity.firstName", "identity.firstName"],
  ["Nombre 2", "identity.middleName"],
  ["identity.middleName", "identity.middleName"],
  ["Apellido", "identity.lastName"],
  ["identity.lastName", "identity.lastName"],
  ["Apellido 2", "identity.maternalLastName"],
  ["identity.maternalLastName", "identity.maternalLastName"],
  ["lang", "identity.lang"],
  ["identity.lang", "identity.lang"],
  ["Edad", "identity.age"],
  ["identity.age", "identity.age"],
  ["Genero", "identity.gender"],
  ["identity.gender", "identity.gender"],
  ["Celular", "identity.phone"],
  ["identity.phone", "identity.phone"],
  ["id_check_user", "idCheckUser"],
  ["idCheckUser", "idCheckUser"],
  ["cloudinary_id", "identity.cloudinaryId"],
  ["cloudinaryId", "identity.cloudinaryId"],
  ["identity.cloudinaryId", "identity.cloudinaryId"],
  ["message", "message"],
  ["messageAuthor", "messageAuthor"],
  ["message_author", "messageAuthor"],
  ["invitacionGroup", "invitationGroup"],
  ["invitacion_group", "invitationGroup"],
  ["invitationGroup", "invitationGroup"],
  ["tagGroup", "tagGroup"],
  ["tag_group", "tagGroup"],
  ["Cabaña", "hosting.cabin"],
  ["hosting.cabin", "hosting.cabin"],
  ["Cuarto", "hosting.room"],
  ["hosting.room", "hosting.room"],
  ["Xtra_cabaña", "hosting.xtraCabin"],
  ["hosting.xtraCabin", "hosting.xtraCabin"],
  ["Xtra_cuarto", "hosting.xtraRoom"],
  ["hosting.xtraRoom", "hosting.xtraRoom"],
  ["Mesa", "table"],
  ["table", "table"],
  ["sent", "sent"],
  ["_enviado", "sent"],
  ["RVSP_Friday", "rsvp.friday"],
  ["rvsp.friday", "rsvp.friday"],
  ["rsvp.friday", "rsvp.friday"],
  ["RVSP_Saturday", "rsvp.saturday"],
  ["rvsp.saturday", "rsvp.saturday"],
  ["rsvp.saturday", "rsvp.saturday"],
  ["RVSP_Sunday", "rsvp.sunday"],
  ["rvsp.sunday", "rsvp.sunday"],
  ["rsvp.sunday", "rsvp.sunday"],
  ["RVSP_confirmCabin", "rsvp.confirmCabin"],
  ["rvsp.confirmCabin", "rsvp.confirmCabin"],
  ["rsvp.confirmCabin", "rsvp.confirmCabin"],
  ["RVSP_cabinWaitingList", "rsvp.cabinWaitingList"],
  ["rvsp.cabinWaitingList", "rsvp.cabinWaitingList"],
  ["rsvp.cabinWaitingList", "rsvp.cabinWaitingList"],
  ["RVSP_Xtra", "rsvp.xtra"],
  ["rvsp.xtra", "rsvp.xtra"],
  ["rsvp.xtra", "rsvp.xtra"],
  ["RVSP_Playa", "rsvp.playa"],
  ["rvsp.playa", "rsvp.playa"],
  ["rsvp.playa", "rsvp.playa"],
  ["RVSP_Petanca", "rsvp.petanca"],
  ["rvsp.petanca", "rsvp.petanca"],
  ["rsvp.petanca", "rsvp.petanca"],
  ["RVSP_NeedBalls", "rsvp.needBalls"],
  ["rvsp.needBalls", "rsvp.needBalls"],
  ["rsvp.needBalls", "rsvp.needBalls"],
  ["Confirmado el", "modifiedAt"],
  ["modifiedAt", "modifiedAt"],
  ["_modifiedAt", "modifiedAt"],
  ["viajaEnAvion", "travelsByPlane"],
  ["travelsByPlane", "travelsByPlane"],
  ["isAdmin", "isAdmin"],
  ["isCabinPaidByNovios", "hosting.isCabinPaidByNovios"],
  ["hosting.isCabinPaidByNovios", "hosting.isCabinPaidByNovios"],
  ["isCabinPaid", "hosting.isCabinPaid"],
  ["hosting.isCabinPaid", "hosting.isCabinPaid"],
  ["isXtraCabinPaidByNovios", "hosting.isXtraCabinPaidByNovios"],
  ["hosting.isXtraCabinPaidByNovios", "hosting.isXtraCabinPaidByNovios"],
  ["isXtraCabinPaid", "hosting.isXtraCabinPaid"],
  ["hosting.isXtraCabinPaid", "hosting.isXtraCabinPaid"],
]);

const STRING_PATHS = new Set([
  "id",
  "identity.firstName",
  "identity.middleName",
  "identity.lastName",
  "identity.maternalLastName",
  "identity.lang",
  "identity.age",
  "identity.gender",
  "identity.phone",
  "identity.cloudinaryId",
  "invitationGroup",
  "tagGroup",
  "message",
  "messageAuthor",
  "table",
  "modifiedAt",
  "cloudinaryId",
  "gender",
  "maternalLastName",
]);

const BOOLEAN_PATHS = new Set([
  "idCheckUser",
  "sent",
  "travelsByPlane",
  "isAdmin",
  "hosting.isCabinPaidByNovios",
  "hosting.isCabinPaid",
  "hosting.isXtraCabinPaidByNovios",
  "hosting.isXtraCabinPaid",
  "rsvp.friday",
  "rsvp.saturday",
  "rsvp.sunday",
  "rsvp.confirmCabin",
  "rsvp.cabinWaitingList",
  "rsvp.xtra",
  "rsvp.playa",
  "rsvp.petanca",
  "rsvp.needBalls",
]);

const CANONICAL_COMPARE_FIELDS = new Set([
  "id",
  "identity.firstName",
  "identity.middleName",
  "identity.lastName",
  "identity.maternalLastName",
  "identity.lang",
  "identity.age",
  "identity.gender",
  "identity.phone",
  "identity.cloudinaryId",
  "invitationGroup",
  "tagGroup",
  "message",
  "messageAuthor",
  "idCheckUser",
  "table",
  "sent",
  "modifiedAt",
  "travelsByPlane",
  "isAdmin",
  "hosting.cabin",
  "hosting.room",
  "hosting.xtraCabin",
  "hosting.xtraRoom",
  "hosting.isCabinPaidByNovios",
  "hosting.isCabinPaid",
  "hosting.isXtraCabinPaidByNovios",
  "hosting.isXtraCabinPaid",
  "rsvp.friday",
  "rsvp.saturday",
  "rsvp.sunday",
  "rsvp.confirmCabin",
  "rsvp.cabinWaitingList",
  "rsvp.xtra",
  "rsvp.playa",
  "rsvp.petanca",
  "rsvp.needBalls",
]);

const COMPATIBILITY_FIELDS = new Set([
  "maternalLastName",
]);

const RUNTIME_ONLY_FIRESTORE_FIELDS = new Set([
  "updatedBy",
  "updatedAt",
  "createdBy",
  "createdAt",
  "guestId",
  "_deleted",
  // cloudinaryId is a runtime-only field (set by the app when a guest uploads
  // a photo). It is not sourced from the sheet, so it must not block the sync.
  "cloudinaryId",
]);

// RSVP fields are protected: they are set by the guest through the RSVP flow,
// not by the sheet. The sync must never overwrite them, and they must not
// block the refresh of other fields (e.g. hosting.xtraCabin / hosting.xtraRoom).
const PROTECTED_FIRESTORE_FIELDS = new Set([
  "rsvp.friday",
  "rsvp.saturday",
  "rsvp.sunday",
  "rsvp.confirmCabin",
  "rsvp.cabinWaitingList",
  "rsvp.xtra",
  "rsvp.playa",
  "rsvp.petanca",
  "rsvp.needBalls",
  "rsvp.answers",
]);

function isProtectedField(path) {
  if (PROTECTED_FIRESTORE_FIELDS.has(path)) return true;
  // Nested runtime answers (e.g. rsvp.answers.petanqueParticipation).
  if (path.startsWith("rsvp.answers.")) return true;
  return false;
}

// Remove protected (RSVP) fields from a payload so the sync never overwrites
// guest RSVP responses. Returns a shallow copy with the rsvp object stripped.
function stripProtectedFields(payload) {
  const copy = { ...payload };
  if (copy.rsvp && typeof copy.rsvp === "object") {
    const rsvp = { ...copy.rsvp };
    for (const key of Object.keys(rsvp)) {
      if (isProtectedField(`rsvp.${key}`)) delete rsvp[key];
    }
    if (Object.keys(rsvp).length === 0) {
      delete copy.rsvp;
    } else {
      copy.rsvp = rsvp;
    }
  }
  return copy;
}



function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }

  return rows;
}

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
  if (!data.access_token) {
    throw new Error("OAuth token response missing access_token");
  }
  return data.access_token;
}

function worksheetValuesToObjects(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const headers = values[0].map((header) => normalizeText(header));
  const sanitizedHeaders = [];
  const headerSeen = new Map();
  for (let i = 0; i < headers.length; i++) {
    const base = headers[i] || `col_${i + 1}`;
    const count = (headerSeen.get(base) || 0) + 1;
    headerSeen.set(base, count);
    sanitizedHeaders.push(count === 1 ? base : `${base}_${count}`);
  }

  const rows = [];
  for (const rawRow of values.slice(1)) {
    const row = {};
    for (let i = 0; i < sanitizedHeaders.length; i++) {
      row[sanitizedHeaders[i]] = normalizeText(rawRow?.[i] ?? "");
    }
    rows.push(row);
  }
  return rows;
}

async function readSheetFromGoogle() {
  const envValues = parseSimpleEnvFile(readFileSync(SHEETS_ENV_PATH, "utf-8"));
  const spreadsheetId = sheetIdArg || envValues.GOOGLE_SHEETS_ID;
  const sheetName = sheetNameArg || envValues.WS_INVITADOS || "Invitados";

  if (!spreadsheetId) {
    throw new Error("Missing Google Sheets ID. Set GOOGLE_SHEETS_ID in integraciones/google_sheets/.env or pass --sheet-id.");
  }

  const token = await getSheetsAccessToken();
  const range = encodeURIComponent(`${sheetName}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets values request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const rows = worksheetValuesToObjects(data.values || []);
  return { rows, spreadsheetId, sheetName };
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] !== undefined ? cells[index].trim() : "";
    });
    return row;
  });
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function shouldSkipSourceRow(row) {
  const fullName = normalizeText(row["_Nombre Completo"] ?? row["Nombre Completo"]);
  const id = normalizeText(row.UID);
  // Ignore trailing/template rows that carry defaults but no real guest data.
  return fullName === "" && id === "";
}

function titleCase(value) {
  return normalizeText(value)
    .toLocaleLowerCase("und")
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => {
      const [first = "", ...rest] = Array.from(word);
      return first.toLocaleUpperCase("und") + rest.join("");
    });
}

function setDeep(target, path, value) {
  const parts = path.split(".");
  let current = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function headerToCanonicalPath(header) {
  return HEADER_TO_PATH.get(header) || null;
}

function isIgnoredHeader(header) {
  if (IGNORE_HEADERS.has(header) || AUTH_ONLY_HEADERS.has(header)) return true;
  // Keep mapped underscore headers (e.g. _enviado, _modifiedAt) and only
  // ignore unknown helper/template columns.
  if (header.startsWith("_") && !HEADER_TO_PATH.has(header)) return true;
  return false;
}

function buildAuthMetadata(row) {
  return {
    uid: normalizeText(row.UID),
    enabled: toBool(row["firebase.auth"] ?? row.firebase_auth),
    identifier: normalizeText(row["firebase.Identifier"] || row.firebase_email || row._email || row.email),
    password: normalizeText(row["firebase.password"] || row.password),
  };
}

function normalizeSheetRow(row) {
  const payload = {
    id: "",
    identity: {},
    hosting: {},
    rsvp: {},
  };
  const auth = buildAuthMetadata(row);
  const sheetPaths = new Set();

  for (const [header, rawValue] of Object.entries(row)) {
    if (isIgnoredHeader(header)) continue;
    const path = headerToCanonicalPath(header);
    if (!path) continue;
    if (path.startsWith("__auth.")) continue;
    sheetPaths.add(path);

    if (path === "id") {
      payload.id = normalizeText(rawValue);
      continue;
    }

    if (path === "identity.firstName" || path === "identity.middleName" || path === "identity.lastName" || path === "identity.maternalLastName") {
      setDeep(payload, path, titleCase(rawValue));
      continue;
    }

    if (path === "identity.gender") {
      setDeep(payload, path, normalizeText(rawValue).toUpperCase());
      continue;
    }

    if (path === "identity.lang") {
      setDeep(payload, path, normalizeText(rawValue).toLowerCase());
      continue;
    }

    if (STRING_PATHS.has(path)) {
      setDeep(payload, path, normalizeText(rawValue));
      continue;
    }

    if (BOOLEAN_PATHS.has(path)) {
      setDeep(payload, path, toBool(rawValue));
      continue;
    }

    if (path === "identity.age") {
      setDeep(payload, path, normalizeText(rawValue));
      continue;
    }

    setDeep(payload, path, convertRawValue(path, rawValue));
  }

  if (!payload.id) {
    payload.id = auth.uid;
  }

  // Compatibility copy kept temporarily for maternalLastName only.
  payload.maternalLastName = payload.identity.maternalLastName || "";

  return { payload, auth, sheetPaths };
}

function convertRawValue(path, rawValue) {
    if (BOOLEAN_PATHS.has(path)) {
    return toBool(rawValue);
  }
  return normalizeText(rawValue);
}

function flattenLeaves(value, prefix = "", out = {}) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    out[prefix] = value;
    return out;
  }
  if (typeof value !== "object") {
    out[prefix] = value;
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      flattenLeaves(child, path, out);
    } else {
      out[path] = child;
    }
  }
  return out;
}

function compareText(path, value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (path === "identity.gender" || path === "gender") return text.toUpperCase();
  if (path === "id") return text;
  if (path === "identity.age" || path === "modifiedAt") return text;
  if (path === "identity.cloudinaryId" || path === "cloudinaryId" || path === "identity.phone" || path === "message" || path === "messageAuthor" || path === "invitationGroup" || path === "tagGroup" || path === "table") {
    return text;
  }
  if (path.startsWith("identity.firstName") || path.startsWith("identity.middleName") || path.startsWith("identity.lastName") || path.startsWith("identity.maternalLastName")) {
    return text.normalize("NFC");
  }
  return text;
}

function comparableValue(path, value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return compareText(path, value);
  return value;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a === "object") {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function formatValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeForMatch(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fullNameForMatch(row) {
  return normalizeForMatch([row.identity?.firstName, row.identity?.middleName, row.identity?.lastName, row.identity?.maternalLastName].filter(Boolean).join(" "));
}

function matchesGuestFilter(row, auth) {
  if (!guestFilter && !guestIdFilter) return true;
  const needle = normalizeForMatch(guestFilter || guestIdFilter);
  return [
    normalizeForMatch(row.id),
    fullNameForMatch(row),
    normalizeForMatch(auth.uid),
    normalizeForMatch(auth.identifier),
  ].some((candidate) => candidate === needle || candidate.includes(needle));
}

function hasActualValue(value) {
  return value !== undefined && value !== null && !(typeof value === "string" && value === "");
}

function isCompatField(path) {
  return COMPATIBILITY_FIELDS.has(path);
}

function compareLeaves(sheetPayload, firestorePayload) {
  const sheetLeaves = flattenLeaves(sheetPayload);
  const firestoreLeaves = flattenLeaves(firestorePayload);

  const mismatches = [];
  for (const path of CANONICAL_COMPARE_FIELDS) {
    if (isProtectedField(path)) continue;
    const sheetValue = comparableValue(path, sheetLeaves[path]);
    const firestoreValue = comparableValue(path, firestoreLeaves[path]);
    if (!deepEqual(sheetValue, firestoreValue)) {
      mismatches.push({ path, sheetValue, firestoreValue });
    }
  }


  // Compatibility copies must mirror their canonical nested sources when they exist.
  const compatChecks = [
    ["maternalLastName", "identity.maternalLastName"],
  ];
  for (const [compatPath, canonicalPath] of compatChecks) {
    const compatValue = firestoreLeaves[compatPath];
    const canonicalValue = firestoreLeaves[canonicalPath];
    if (hasActualValue(compatValue) && !deepEqual(compatValue, canonicalValue)) {
      mismatches.push({ path: compatPath, sheetValue: canonicalValue, firestoreValue: compatValue, compat: true });
    }
  }

  return { sheetLeaves, firestoreLeaves, mismatches };
}

async function readSheet() {
  const live = await readSheetFromGoogle();
  return {
    rows: live.rows,
    source: "gsheet",
    sourceRef: `spreadsheetId=${live.spreadsheetId};sheet=${live.sheetName}`,
  };
}

function validateGuestSheetContract(rows) {
  if (rows.length === 0) throw new Error("The Invitados sheet is empty.");
  const headers = new Set(Object.keys(rows[0]));
  if (!headers.has("UID")) {
    throw new Error('The Invitados sheet is missing required column "UID" (guest document ID).');
  }
  if (!headers.has("firebase.auth") && !headers.has("firebase_auth")) {
    throw new Error('The Invitados sheet is missing required boolean column "firebase.auth" (alias "firebase_auth" is also accepted).');
  }
}

async function readFirestoreGuests() {
  const snap = await db.collection(GUEST_COLLECTION).get();
  const docs = new Map();
  snap.forEach((doc) => docs.set(doc.id, doc.data()));
  return docs;
}

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

function computeAuthGuestHealth({ authUsers, firestoreDocs, selectedRows, includeAuthWithoutSheet }) {
  const authUsersByUid = new Map();
  const authEmailToUid = new Map();
  for (const user of authUsers) {
    authUsersByUid.set(user.uid, user);
    const email = normalizeEmail(user.email);
    if (email) authEmailToUid.set(email, user.uid);
  }

  const guestIds = [...firestoreDocs.keys()];
  const authUids = new Set(authUsers.map((user) => user.uid));
  const sheetIds = new Set(selectedRows.map(({ payload }) => payload.id));
  const expectedAuthUids = new Set(
    selectedRows
      .filter(({ auth: sheetAuth }) => sheetAuth.enabled)
      .map(({ payload }) => payload.id),
  );

  const authWithoutSheet = authUsers
    .filter((user) => includeAuthWithoutSheet && !sheetIds.has(user.uid))
    .map((user) => ({
      uid: user.uid,
      email: user.email || "",
      disabled: user.disabled === true,
    }))
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const authDisabledBySheet = selectedRows
    .filter(({ payload, auth: sheetAuth }) => !sheetAuth.enabled && authUsersByUid.has(payload.id))
    .map(({ payload }) => {
      const user = authUsersByUid.get(payload.id);
      return {
        uid: payload.id,
        email: user.email || "",
        disabled: user.disabled === true,
        reason: "firebase.auth is false",
      };
    })
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const authDeleteCandidates = [...authWithoutSheet, ...authDisabledBySheet]
    .filter((candidate, index, candidates) => candidates.findIndex((item) => item.uid === candidate.uid) === index)
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const authWithoutGuest = authUsers
    .filter((user) => !firestoreDocs.has(user.uid))
    .map((user) => ({
      uid: user.uid,
      email: user.email || "",
      disabled: user.disabled === true,
    }))
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const guestsWithoutAuth = guestIds
    .filter((id) => expectedAuthUids.has(id) && !authUids.has(id))
    .map((id) => {
      const guest = firestoreDocs.get(id) || {};
      return {
        guestId: id,
        invitationGroup: String(guest.invitationGroup || ""),
        emailHint: String(guest.firebaseEmail || ""),
      };
    })
    .sort((a, b) => a.guestId.localeCompare(b.guestId));

  const sheetGuestsWithoutAuth = [];
  const authEmailUpdateCandidates = [];
  const authEmailUpdateBlockedInvalid = [];
  const authEmailUpdateBlockedInUse = [];
  const authCreateCandidates = [];
  const authCreateBlockedMissingEmail = [];
  const authCreateBlockedInvalidEmail = [];
  const authCreateBlockedEmailInUse = [];
  const seenSheetUids = new Set();

  for (const { payload, auth: sheetAuth } of selectedRows) {
    const uid = normalizeText(payload.id);
    if (!uid || seenSheetUids.has(uid)) continue;
    seenSheetUids.add(uid);

    // A false/blank firebase.auth value explicitly means this guest must not
    // have a Firebase Auth record. UID still identifies the guest document.
    if (!sheetAuth.enabled) continue;

    const sheetEmailRaw = normalizeText(sheetAuth.identifier);
    const sheetEmail = normalizeEmail(sheetEmailRaw);
    const authUser = authUsersByUid.get(uid);

    if (!authUser) {
      const candidate = {
        uid,
        invitationGroup: normalizeText(payload.invitationGroup),
        sheetEmail,
        passwordPresent: normalizeText(sheetAuth.password) !== "",
      };
      sheetGuestsWithoutAuth.push(candidate);
      if (!sheetEmail) {
        authCreateBlockedMissingEmail.push(candidate);
      } else if (!isValidEmail(sheetEmail)) {
        authCreateBlockedInvalidEmail.push(candidate);
      } else if (authEmailToUid.has(sheetEmail) && authEmailToUid.get(sheetEmail) !== uid) {
        authCreateBlockedEmailInUse.push({
          ...candidate,
          ownerUid: authEmailToUid.get(sheetEmail),
        });
      } else {
        authCreateCandidates.push(candidate);
      }
      continue;
    }

    if (!sheetEmail) continue;
    const authEmail = normalizeEmail(authUser.email);
    if (sheetEmail !== authEmail) {
      const candidate = {
        uid,
        invitationGroup: normalizeText(payload.invitationGroup),
        sheetEmail,
        authEmail,
        authDisabled: authUser.disabled === true,
      };
      if (!isValidEmail(sheetEmail)) {
        authEmailUpdateBlockedInvalid.push(candidate);
      } else if (authEmailToUid.has(sheetEmail) && authEmailToUid.get(sheetEmail) !== uid) {
        authEmailUpdateBlockedInUse.push({
          ...candidate,
          ownerUid: authEmailToUid.get(sheetEmail),
        });
      } else {
        authEmailUpdateCandidates.push(candidate);
      }
    }
  }

  const mappedCount = authUsers.length - authWithoutGuest.length;
  return {
    authUsersTotal: authUsers.length,
    guestsTotal: guestIds.length,
    authUsersMappedToGuest: mappedCount,
    authUsersWithoutGuestCount: authWithoutGuest.length,
    authUsersWithoutSheetCount: authWithoutSheet.length,
    authDisabledBySheetCount: authDisabledBySheet.length,
    authDeleteCandidatesCount: authDeleteCandidates.length,
    sheetAuthExpectedCount: expectedAuthUids.size,
    sheetAuthDisabledCount: selectedRows.length - expectedAuthUids.size,
    guestsWithoutAuthCount: guestsWithoutAuth.length,
    sheetGuestsWithoutAuthCount: sheetGuestsWithoutAuth.length,
    authEmailUpdateCandidatesCount: authEmailUpdateCandidates.length,
    authEmailUpdateBlockedInvalidCount: authEmailUpdateBlockedInvalid.length,
    authEmailUpdateBlockedInUseCount: authEmailUpdateBlockedInUse.length,
    authCreateCandidatesCount: authCreateCandidates.length,
    authCreateBlockedMissingEmailCount: authCreateBlockedMissingEmail.length,
    authCreateBlockedInvalidEmailCount: authCreateBlockedInvalidEmail.length,
    authCreateBlockedEmailInUseCount: authCreateBlockedEmailInUse.length,
    mappingCoveragePct: authUsers.length > 0 ? Number(((mappedCount / authUsers.length) * 100).toFixed(2)) : 0,
    authWithoutGuest,
    authWithoutSheet,
    authDisabledBySheet,
    authDeleteCandidates,
    guestsWithoutAuth,
    sheetGuestsWithoutAuth,
    authEmailUpdateCandidates,
    authEmailUpdateBlockedInvalid,
    authEmailUpdateBlockedInUse,
    authCreateCandidates,
    authCreateBlockedMissingEmail,
    authCreateBlockedInvalidEmail,
    authCreateBlockedEmailInUse,
  };
}

function collectFirestoreFieldPaths(doc) {
  return new Set(Object.keys(flattenLeaves(doc)));
}

function summarizeAlerts(sheetLeaves, firestoreLeaves) {
  const sheetUnknown = Object.entries(sheetLeaves)
    .filter(([path, value]) => !firestoreLeaves.hasOwnProperty(path) && !isCompatField(path) && hasActualValue(value))
    .map(([path]) => path);

  const firestoreUnknown = Object.entries(firestoreLeaves)
    .filter(([path, value]) => !sheetLeaves.hasOwnProperty(path) && !isCompatField(path) && !path.startsWith("_") && !RUNTIME_ONLY_FIRESTORE_FIELDS.has(path) && !isProtectedField(path) && hasActualValue(value))
    .map(([path]) => path);
  return { sheetUnknown, firestoreUnknown };

}

function mdEscape(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function buildInvalidRowDetail(entry) {
  const row = entry.sourceData || {};
  return {
    sourceRow: entry.sourceRow,
    reason: "missing UID",
    id: normalizeText(row.UID),
    firstName: normalizeText(row.Nombre),
    middleName: normalizeText(row["Nombre 2"]),
    lastName: normalizeText(row.Apellido),
    maternalLastName: normalizeText(row["Apellido 2"]),
    firebaseUid: normalizeText(row.UID),
    firebaseAuth: toBool(row["firebase.auth"] ?? row.firebase_auth),
    firebaseIdentifier: normalizeText(row["firebase.Identifier"] || row.firebase_email),
  };
}

function writeReportJson(report) {
  if (!REPORT_JSON_PATH) return;
  mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
  const serializedReport = {
    ...report,
    sheetAuth: report.sheetAuth.map(({ password, ...entry }) => ({
      ...entry,
      passwordPresent: normalizeText(password) !== "",
    })),
    unchanged: [],
    unchangedOmitted: report.unchanged.length,
    comparisonAudit: report.comparisonAudit.filter((item) => item.status !== "unchanged"),
  };
  writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(serializedReport, null, 2)}\n`, "utf-8");
  console.log(`Report JSON: ${REPORT_JSON_PATH}`);
}

function writeReportMarkdown(report) {
  if (!REPORT_MD_PATH) return;
  const lines = [];
  lines.push("# Google Sheet to Firestore Sync Report");
  lines.push("");
  lines.push(`- Generated at: ${report.generatedAt}`);
  lines.push(`- Mode: ${report.mode}`);
  lines.push(`- CI mode: ${report.ciMode ? "yes" : "no"}`);
  lines.push(`- Fail on drift: ${report.failOnDrift ? "yes" : "no"}`);
  lines.push(`- Source mode: ${report.source}`);
  lines.push(`- Source ref: ${report.sourceRef}`);
  lines.push("");

  lines.push("## Auth Health");
  lines.push("");
  lines.push(`- Auth users total: ${report.authHealth.authUsersTotal}`);
  lines.push(`- Guests total (Firestore): ${report.authHealth.guestsTotal}`);
  lines.push(`- Auth users mapped to guest by UID: ${report.authHealth.authUsersMappedToGuest}`);
  lines.push(`- Auth users without guest: ${report.authHealth.authUsersWithoutGuestCount}`);
  lines.push(`- Auth users without matching sheet row: ${report.authHealth.authUsersWithoutSheetCount}`);
  lines.push(`- Sheet guests requiring auth: ${report.authHealth.sheetAuthExpectedCount}`);
  lines.push(`- Sheet guests not requiring auth: ${report.authHealth.sheetAuthDisabledCount}`);
  lines.push(`- Auth records present where firebase.auth is false: ${report.authHealth.authDisabledBySheetCount}`);
  lines.push(`- Guests requiring auth but missing it: ${report.authHealth.guestsWithoutAuthCount}`);
  lines.push(`- Sheet guests requiring auth but missing it (selected scope): ${report.authHealth.sheetGuestsWithoutAuthCount}`);
  lines.push(`- Auth email update candidates (sheet -> auth): ${report.authHealth.authEmailUpdateCandidatesCount}`);
  lines.push(`- Auth email updates blocked (invalid email): ${report.authHealth.authEmailUpdateBlockedInvalidCount}`);
  lines.push(`- Auth email updates blocked (email in use): ${report.authHealth.authEmailUpdateBlockedInUseCount}`);
  lines.push(`- Auth create candidates (email present): ${report.authHealth.authCreateCandidatesCount}`);
  lines.push(`- Auth create blocked (missing sheet email): ${report.authHealth.authCreateBlockedMissingEmailCount}`);
  lines.push(`- Auth create blocked (invalid email): ${report.authHealth.authCreateBlockedInvalidEmailCount}`);
  lines.push(`- Auth create blocked (email in use): ${report.authHealth.authCreateBlockedEmailInUseCount}`);
  lines.push(`- Mapping coverage: ${report.authHealth.mappingCoveragePct}%`);
  lines.push("");

  if (report.authHealth.authWithoutGuest.length > 0) {
    lines.push("### Auth Users Without Guest");
    lines.push("");
    lines.push("| UID | Email | Disabled |\n|---|---|---|");
    for (const row of report.authHealth.authWithoutGuest) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.email)} | ${row.disabled ? "true" : "false"} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authWithoutSheet.length > 0) {
    lines.push("### Auth Users Without Matching Sheet Row");
    lines.push("");
    lines.push("| UID | Email | Disabled |\n|---|---|---|");
    for (const row of report.authHealth.authWithoutSheet) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.email)} | ${row.disabled ? "true" : "false"} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authDisabledBySheet.length > 0) {
    lines.push("### Auth Records Disabled By Sheet");
    lines.push("");
    lines.push("| UID | Email | Reason |\n|---|---|---|");
    for (const row of report.authHealth.authDisabledBySheet) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.email)} | ${mdEscape(row.reason)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.guestsWithoutAuth.length > 0) {
    lines.push("### Guests Without Auth");
    lines.push("");
    lines.push("| Guest ID | Invitation Group | Email Hint |\n|---|---|---|");
    for (const row of report.authHealth.guestsWithoutAuth) {
      lines.push(`| ${mdEscape(row.guestId)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.emailHint)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authEmailUpdateCandidates.length > 0) {
    lines.push("### Auth Email Update Candidates");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email | Auth Email | Disabled |\n|---|---|---|---|---|");
    for (const row of report.authHealth.authEmailUpdateCandidates) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} | ${mdEscape(row.authEmail)} | ${row.authDisabled ? "true" : "false"} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authEmailUpdateBlockedInvalid.length > 0) {
    lines.push("### Auth Email Updates Blocked (Invalid Email)");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email | Auth Email |\n|---|---|---|---|");
    for (const row of report.authHealth.authEmailUpdateBlockedInvalid) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} | ${mdEscape(row.authEmail)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authEmailUpdateBlockedInUse.length > 0) {
    lines.push("### Auth Email Updates Blocked (Email In Use)");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email | Current Owner UID |\n|---|---|---|---|");
    for (const row of report.authHealth.authEmailUpdateBlockedInUse) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} | ${mdEscape(row.ownerUid)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authCreateCandidates.length > 0) {
    lines.push("### Auth Create Candidates");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email | Password In Sheet |\n|---|---|---|---|");
    for (const row of report.authHealth.authCreateCandidates) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} | ${row.passwordPresent ? "yes" : "no"} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authCreateBlockedMissingEmail.length > 0) {
    lines.push("### Auth Create Blocked (Missing Sheet Email)");
    lines.push("");
    lines.push("| UID | Invitation Group |\n|---|---|");
    for (const row of report.authHealth.authCreateBlockedMissingEmail) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authCreateBlockedInvalidEmail.length > 0) {
    lines.push("### Auth Create Blocked (Invalid Email)");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email |\n|---|---|---|");
    for (const row of report.authHealth.authCreateBlockedInvalidEmail) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} |`);
    }
    lines.push("");
  }

  if (report.authHealth.authCreateBlockedEmailInUse.length > 0) {
    lines.push("### Auth Create Blocked (Email In Use)");
    lines.push("");
    lines.push("| UID | Invitation Group | Sheet Email | Current Owner UID |\n|---|---|---|---|");
    for (const row of report.authHealth.authCreateBlockedEmailInUse) {
      lines.push(`| ${mdEscape(row.uid)} | ${mdEscape(row.invitationGroup)} | ${mdEscape(row.sheetEmail)} | ${mdEscape(row.ownerUid)} |`);
    }
    lines.push("");
  }

  lines.push("## Auth Sync Actions");
  lines.push("");
  lines.push(`- Planned auth deletes (missing sheet row or firebase.auth=false): ${report.authPlan.authDeletes}`);
  lines.push(`- Planned email updates: ${report.authPlan.emailUpdates}`);
  lines.push(`- Planned auth creates: ${report.authPlan.authCreates}`);
  lines.push(`- Planned blocked creates (missing email): ${report.authPlan.blockedCreatesMissingEmail}`);
  lines.push(`- Planned blocked email updates (invalid): ${report.authPlan.blockedEmailUpdatesInvalid}`);
  lines.push(`- Planned blocked email updates (in use): ${report.authPlan.blockedEmailUpdatesInUse}`);
  lines.push(`- Planned blocked auth creates (invalid email): ${report.authPlan.blockedCreatesInvalidEmail}`);
  lines.push(`- Planned blocked auth creates (email in use): ${report.authPlan.blockedCreatesEmailInUse}`);
  lines.push(`- Applied auth deletes: ${report.authResults.authDeletesApplied}`);
  lines.push(`- Applied email updates: ${report.authResults.emailUpdatesApplied}`);
  lines.push(`- Applied auth creates: ${report.authResults.authCreatesApplied}`);
  lines.push(`- Auth action failures: ${report.authResults.failures.length}`);
  lines.push("");

  if (report.authResults.failures.length > 0) {
    lines.push("### Auth Action Failures");
    lines.push("");
    lines.push("| Action | UID | Error |\n|---|---|---|");
    for (const failure of report.authResults.failures) {
      lines.push(`| ${mdEscape(failure.action)} | ${mdEscape(failure.uid)} | ${mdEscape(failure.error)} |`);
    }
    lines.push("");
  }

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Invalid rows skipped (missing UID): ${report.invalidRows.length}`);
  lines.push(`- Added candidates: ${report.added.length}`);
  lines.push(`- Changed candidates: ${report.changed.length}`);
  lines.push(`- Unchanged: ${report.unchanged.length}`);
  lines.push(`- Stale candidates: ${report.stale.length}`);
  lines.push(`- Auth metadata rows: ${report.sheetAuth.length}`);
  lines.push(`- Writes: ${report.writes}`);
  lines.push("");

  if (report.invalidRows.length > 0) {
    lines.push("## Invalid Rows (Skipped)");
    lines.push("");
    lines.push("| CSV Row | Reason | UID | Nombre | Nombre 2 | Apellido | Apellido 2 | Firebase Auth | firebase Identifier |");
    lines.push("|---:|---|---|---|---|---|---|---|---|");
    for (const row of report.invalidRows) {
      lines.push(`| ${row.sourceRow} | ${mdEscape(row.reason)} | ${mdEscape(row.id)} | ${mdEscape(row.firstName)} | ${mdEscape(row.middleName)} | ${mdEscape(row.lastName)} | ${mdEscape(row.maternalLastName)} | ${row.firebaseAuth ? "true" : "false"} | ${mdEscape(row.firebaseIdentifier)} |`);
    }
    lines.push("");
  }

  if (report.alerts.length > 0) {
    lines.push("## Alerts");
    lines.push("");
    for (const alert of report.alerts) {
      lines.push(`### ${alert.type}`);
      lines.push("");
      for (const field of alert.fields) {
        lines.push(`- ${field}`);
      }
      lines.push("");
    }
  }

  if (report.added.length > 0) {
    lines.push("## Missing In Firestore");
    lines.push("");
    for (const item of report.added) {
      lines.push(`- ${item.id}`);
    }
    lines.push("");
  }

  if (report.stale.length > 0) {
    lines.push("## Stale In Firestore");
    lines.push("");
    for (const item of report.stale) {
      lines.push(`- ${item.id}`);
    }
    lines.push("");
  }

  if (report.changed.length > 0) {
    lines.push("## Field Mismatches");
    lines.push("");
    for (const item of report.changed) {
      lines.push(`### ${item.id}`);
      lines.push("");
      for (const mismatch of item.mismatches) {
        lines.push(`- ${mismatch.path}: sheet=${formatValue(mismatch.sheetValue)} firestore=${formatValue(mismatch.firestoreValue)}`);
      }
      lines.push("");
    }
  }

  // Dedicated summary of cabin / extra-cabin assignments detected in the sheet.
  const hostingPaths = ["hosting.cabin", "hosting.room", "hosting.xtraCabin", "hosting.xtraRoom"];
  const hostingRows = [];
  for (const item of report.changed) {
    const row = { id: item.id };
    for (const mismatch of item.mismatches) {
      if (hostingPaths.includes(mismatch.path)) {
        row[mismatch.path] = formatValue(mismatch.sheetValue);
      }
    }
    if (Object.keys(row).length > 1) hostingRows.push(row);
  }
  if (hostingRows.length > 0) {
    lines.push("## Cabin & Extra Cabin Assignments");
    lines.push("");
    lines.push("| Guest | Cabaña | Cuarto | Xtra Cabaña | Xtra Cuarto |");
    lines.push("|---|---|---|---|---|");
    for (const row of hostingRows) {
      lines.push(`| ${mdEscape(row.id)} | ${mdEscape(row["hosting.cabin"] || "")} | ${mdEscape(row["hosting.room"] || "")} | ${mdEscape(row["hosting.xtraCabin"] || "")} | ${mdEscape(row["hosting.xtraRoom"] || "")} |`);
    }
    lines.push("");
  }


  const comparisonAuditToRender = report.comparisonAudit.filter((item) => item.status !== "unchanged");
  if (comparisonAuditToRender.length > 0) {
    lines.push("## Field-By-Field Record Audit");
    lines.push("");
    lines.push("| ID | Status | Compared Fields | Differences |");
    lines.push("|---|---|---:|---:|");
    for (const item of comparisonAuditToRender) {
      lines.push(`| ${mdEscape(item.id)} | ${mdEscape(item.status)} | ${item.comparedFields} | ${item.diffCount} |`);
    }
    lines.push("");
  }

  if (report.changed.length === 0 && report.added.length === 0 && report.stale.length === 0) {
    lines.push("## Drift Status");
    lines.push("");
    lines.push("No drift detected for valid rows.");
    lines.push("");
  }

  mkdirSync(dirname(REPORT_MD_PATH), { recursive: true });
  writeFileSync(REPORT_MD_PATH, `${lines.join("\n")}\n`, "utf-8");
  console.log(`Report MD: ${REPORT_MD_PATH}`);
}

async function main() {
  console.log("Google Sheet -> Firestore guest refresh");
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}${MARK_STALE ? " + MARK-STALE" : ""}`);
  if (CI_MODE) console.log("CI mode: enabled");
  if (guestFilter) console.log(`Guest filter: ${guestFilter}`);
  if (guestIdFilter) console.log(`Guest ID filter: ${guestIdFilter}`);

  const sheetData = await readSheet();
  const rows = sheetData.rows;
  validateGuestSheetContract(rows);
  const normalizedRows = rows
    .map((row, idx) => ({ ...normalizeSheetRow(row), sourceRow: idx + 2, sourceData: row }))
    .filter(({ sourceData }) => !shouldSkipSourceRow(sourceData));
  const invalidRows = normalizedRows.filter(({ payload }) => !normalizeText(payload.id));
  const validRows = normalizedRows.filter(({ payload }) => normalizeText(payload.id));
  const duplicateUids = [...new Set(validRows
    .map(({ payload }) => payload.id)
    .filter((uid, index, uids) => uids.indexOf(uid) !== index))];
  if (duplicateUids.length > 0) {
    throw new Error(`Duplicate UID values in Invitados sheet: ${duplicateUids.join(", ")}`);
  }
  const selectedRows = validRows.filter(({ payload, auth }) => matchesGuestFilter(payload, auth));
  const restrictToSelected = Boolean(guestFilter || guestIdFilter);

  const firestoreDocs = await readFirestoreGuests();
  const authUsers = await readAuthUsers();
  const sheetIds = new Set(selectedRows.map(({ payload }) => payload.id));
  const authHealth = computeAuthGuestHealth({
    authUsers,
    firestoreDocs,
    selectedRows,
    includeAuthWithoutSheet: !restrictToSelected,
  });

  const report = {
    mode: EXECUTE ? "execute" : "dry-run",
    ciMode: CI_MODE,
    failOnDrift: FAIL_ON_DRIFT,
    generatedAt: new Date().toISOString(),
    source: sheetData.source,
    sourceRef: sheetData.sourceRef,
    authHealth,
    invalidRows: invalidRows.map((row) => buildInvalidRowDetail(row)),
    added: [],
    changed: [],
    unchanged: [],
    stale: [],
    sheetAuth: [],
    alerts: [],
    comparisonAudit: [],
    writes: 0,
    authPlan: {
      emailUpdates: authHealth.authEmailUpdateCandidatesCount,
      authCreates: authHealth.authCreateCandidatesCount,
      authDeletes: authHealth.authDeleteCandidatesCount,
      blockedCreatesMissingEmail: authHealth.authCreateBlockedMissingEmailCount,
      blockedEmailUpdatesInvalid: authHealth.authEmailUpdateBlockedInvalidCount,
      blockedEmailUpdatesInUse: authHealth.authEmailUpdateBlockedInUseCount,
      blockedCreatesInvalidEmail: authHealth.authCreateBlockedInvalidEmailCount,
      blockedCreatesEmailInUse: authHealth.authCreateBlockedEmailInUseCount,
    },
    authResults: {
      authDeletesApplied: 0,
      emailUpdatesApplied: 0,
      authCreatesApplied: 0,
      failures: [],
    },
  };

  const sheetLeavesById = new Map();
  const firestoreLeavesById = new Map();

  for (const { payload, auth } of selectedRows) {
    sheetLeavesById.set(payload.id, flattenLeaves(payload));
    if (auth.uid || auth.identifier || auth.password) {
      report.sheetAuth.push({ id: payload.id, ...auth });
    }
  }

  for (const [id, doc] of firestoreDocs) {
    if (!selectedRows.some(({ payload }) => payload.id === id)) continue;
    firestoreLeavesById.set(id, flattenLeaves(doc));
  }

  const sheetLeaves = {};
  const firestoreLeaves = {};
  for (const [id, leaves] of sheetLeavesById) {
    Object.assign(sheetLeaves, leaves);
    const firestoreDocLeaves = firestoreLeavesById.get(id) || {};
    Object.assign(firestoreLeaves, firestoreDocLeaves);
  }

  const { sheetUnknown, firestoreUnknown } = summarizeAlerts(sheetLeaves, firestoreLeaves);
  if (sheetUnknown.length > 0) {
    report.alerts.push({ type: "sheet-only", fields: sheetUnknown });
  }
  if (firestoreUnknown.length > 0) {
    report.alerts.push({ type: "firestore-only", fields: firestoreUnknown });
  }

  // Per-record diff / audit.
  for (const { payload: sheetPayload, auth } of selectedRows) {
    const existing = firestoreDocs.get(sheetPayload.id);
    if (!existing) {
      report.added.push({ id: sheetPayload.id, auth, payload: sheetPayload });
      report.comparisonAudit.push({
        id: sheetPayload.id,
        status: "candidate-add",
        comparedFields: CANONICAL_COMPARE_FIELDS.size,
        diffCount: CANONICAL_COMPARE_FIELDS.size,
      });
      continue;
    }

    const { mismatches } = compareLeaves(sheetPayload, existing);
    if (mismatches.length === 0) {
      report.unchanged.push(sheetPayload.id);
      report.comparisonAudit.push({
        id: sheetPayload.id,
        status: "unchanged",
        comparedFields: CANONICAL_COMPARE_FIELDS.size,
        diffCount: 0,
      });
    } else {
      report.changed.push({ id: sheetPayload.id, mismatches, payload: sheetPayload, existing });
      report.comparisonAudit.push({
        id: sheetPayload.id,
        status: "changed",
        comparedFields: CANONICAL_COMPARE_FIELDS.size,
        diffCount: mismatches.length,
      });
    }
  }

  if (!restrictToSelected) {
    for (const [id, doc] of firestoreDocs) {
      if (!sheetIds.has(id)) {
        report.stale.push({ id, doc });
        report.comparisonAudit.push({
          id,
          status: "candidate-delete",
          comparedFields: CANONICAL_COMPARE_FIELDS.size,
          diffCount: CANONICAL_COMPARE_FIELDS.size,
        });
      }
    }
  }

  console.log("\nContract audit");
  console.log(`  Sheet rows selected: ${selectedRows.length}`);
  console.log(`  Invalid sheet rows skipped (missing UID): ${invalidRows.length}`);
  console.log(`  Firestore docs considered: ${[...firestoreDocs.keys()].filter((id) => sheetIds.has(id)).length}`);
  console.log(`  Added candidates: ${report.added.length}`);
  console.log(`  Changed candidates: ${report.changed.length}`);
  console.log(`  Unchanged: ${report.unchanged.length}`);
  console.log(`  Stale candidates: ${report.stale.length}`);
  console.log(`  Auth metadata rows: ${report.sheetAuth.length}`);
  console.log(`  Source: ${sheetData.source} (${sheetData.sourceRef})`);
  console.log("\nAuth health");
  console.log(`  Auth users total: ${report.authHealth.authUsersTotal}`);
  console.log(`  Guests total (Firestore): ${report.authHealth.guestsTotal}`);
  console.log(`  Auth users mapped to guest: ${report.authHealth.authUsersMappedToGuest}`);
  console.log(`  Auth users without guest: ${report.authHealth.authUsersWithoutGuestCount}`);
  console.log(`  Auth users without matching sheet row: ${report.authHealth.authUsersWithoutSheetCount}`);
  console.log(`  Sheet guests requiring auth: ${report.authHealth.sheetAuthExpectedCount}`);
  console.log(`  Sheet guests not requiring auth: ${report.authHealth.sheetAuthDisabledCount}`);
  console.log(`  Auth records present where firebase.auth is false: ${report.authHealth.authDisabledBySheetCount}`);
  console.log(`  Guests requiring auth but missing it: ${report.authHealth.guestsWithoutAuthCount}`);
  console.log(`  Sheet guests requiring auth but missing it (selected scope): ${report.authHealth.sheetGuestsWithoutAuthCount}`);
  console.log(`  Auth email update candidates: ${report.authHealth.authEmailUpdateCandidatesCount}`);
  console.log(`  Auth email updates blocked (invalid): ${report.authHealth.authEmailUpdateBlockedInvalidCount}`);
  console.log(`  Auth email updates blocked (in use): ${report.authHealth.authEmailUpdateBlockedInUseCount}`);
  console.log(`  Auth create candidates: ${report.authHealth.authCreateCandidatesCount}`);
  console.log(`  Auth create blocked (missing sheet email): ${report.authHealth.authCreateBlockedMissingEmailCount}`);
  console.log(`  Auth create blocked (invalid email): ${report.authHealth.authCreateBlockedInvalidEmailCount}`);
  console.log(`  Auth create blocked (email in use): ${report.authHealth.authCreateBlockedEmailInUseCount}`);
  console.log(`  Auth delete candidates: ${report.authPlan.authDeletes}`);

  if (report.alerts.length > 0) {
    console.log("\nALERTS");
    for (const alert of report.alerts) {
      console.log(`  - ${alert.type}: ${alert.fields.join(", ")}`);
    }
  }

  if (report.added.length > 0) {
    console.log("\nMISSING IN FIRESTORE");
    for (const item of report.added) {
      console.log(`  + ${item.id}`);
    }
  }

  if (report.stale.length > 0) {
    console.log("\nSTALE IN FIRESTORE");
    for (const item of report.stale) {
      console.log(`  - ${item.id}`);
    }
  }

  if (report.changed.length > 0) {
    console.log("\nFIELD MISMATCHES");
    for (const item of report.changed.slice(0, 20)) {
      console.log(`  ~ ${item.id}`);
      for (const mismatch of item.mismatches) {
        console.log(`     ${mismatch.path}: sheet=${formatValue(mismatch.sheetValue)} firestore=${formatValue(mismatch.firestoreValue)}`);
      }
    }
    if (report.changed.length > 20) {
      console.log(`  ... and ${report.changed.length - 20} more`);
    }
  }

  if (report.sheetAuth.length > 0) {
    console.log("\nAUTH METADATA");
    for (const item of report.sheetAuth) {
      console.log(`  - ${item.id}: auth=${item.enabled ? "true" : "false"} uid=${item.uid || ""} identifier=${item.identifier || ""} password=${item.password ? "[present]" : "[missing]"}`);
    }
  }

  const hasBlockingAlerts = report.alerts.length > 0;
  if (hasBlockingAlerts) {
    writeReportJson(report);
    writeReportMarkdown(report);
    console.log("\nBlocking contract alerts found. No writes will be performed until the sheet and Firestore agree.");
    process.exit(EXECUTE ? 1 : 0);
  }

  if (FAIL_ON_DRIFT && !EXECUTE) {
    const hasDrift = report.added.length > 0 || report.changed.length > 0 || report.stale.length > 0;
    writeReportJson(report);
    writeReportMarkdown(report);
    if (hasDrift) {
      console.log("\n[CI] Drift detected (added/changed/stale). Failing as requested.");
      process.exit(1);
    }
  }

  if (!EXECUTE) {
    writeReportJson(report);
    writeReportMarkdown(report);
    console.log("\n[DRY-RUN] No writes applied.");
    process.exit(0);
  }

  let written = 0;

  if (report.authHealth.authDeleteCandidates.length > 0) {
    for (const candidate of report.authHealth.authDeleteCandidates) {
      try {
        await auth.deleteUser(candidate.uid);
        report.authResults.authDeletesApplied++;
      } catch (error) {
        report.authResults.failures.push({
          action: "delete-auth-user",
          uid: candidate.uid,
          error: error?.message || String(error),
        });
      }
    }
  }

  for (const item of report.added) {
    await db.collection(GUEST_COLLECTION).doc(item.id).set(
      {
        ...stripProtectedFields(item.payload),
        updatedBy: "sync_script",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    written++;
  }

  for (const item of report.changed) {
    await db.collection(GUEST_COLLECTION).doc(item.id).set(
      {
        ...stripProtectedFields(item.payload),
        updatedBy: "sync_script",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    written++;
  }


  if (MARK_STALE && report.stale.length > 0) {
    for (const item of report.stale) {
      await db.collection(GUEST_COLLECTION).doc(item.id).set(
        {
          _deleted: true,
          updatedBy: "sync_script",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      written++;
    }
  }

  for (const candidate of report.authHealth.authEmailUpdateCandidates) {
    try {
      await auth.updateUser(candidate.uid, { email: candidate.sheetEmail });
      report.authResults.emailUpdatesApplied++;
    } catch (error) {
      report.authResults.failures.push({
        action: "update-email",
        uid: candidate.uid,
        error: error?.message || String(error),
      });
    }
  }

  for (const candidate of report.authHealth.authCreateCandidates) {
    try {
      const createPayload = {
        uid: candidate.uid,
        email: candidate.sheetEmail,
      };
      if (candidate.passwordPresent) {
        const sheetAuthEntry = report.sheetAuth.find((item) => item.id === candidate.uid);
        const password = normalizeText(sheetAuthEntry?.password);
        if (password) createPayload.password = password;
      }
      await auth.createUser(createPayload);
      report.authResults.authCreatesApplied++;
    } catch (error) {
      report.authResults.failures.push({
        action: "create-user",
        uid: candidate.uid,
        error: error?.message || String(error),
      });
    }
  }

  report.writes = written;
  writeReportJson(report);
  writeReportMarkdown(report);
  const totalApplied = written + report.authResults.authDeletesApplied + report.authResults.emailUpdatesApplied + report.authResults.authCreatesApplied;
  console.log(`\n[EXECUTE] Wrote ${written} guest documents.`);
  console.log(`[EXECUTE] Deleted ${report.authResults.authDeletesApplied} auth users.`);
  console.log(`[EXECUTE] Updated ${report.authResults.emailUpdatesApplied} auth emails.`);
  console.log(`[EXECUTE] Created ${report.authResults.authCreatesApplied} auth users.`);
  console.log(`[EXECUTE] Total applied writes/actions: ${totalApplied}.`);

  if (report.authResults.failures.length > 0) {
    console.log(`[EXECUTE] Auth action failures: ${report.authResults.failures.length}. See report for details.`);
    process.exit(1);
  }

  process.exit(0);
}

await main();
