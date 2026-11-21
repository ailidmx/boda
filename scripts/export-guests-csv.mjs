#!/usr/bin/env node
/**
 * Flat export of the Firestore `guests` collection to CSV for Google Sheets.
 *
 * READ-ONLY. Auth: Application Default Credentials
 * (`gcloud auth application-default login`) or
 * `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`.
 *
 * Usage:
 *   node scripts/export-guests-csv.mjs                  # dry run: count + columns
 *   node scripts/export-guests-csv.mjs --execute        # writes tmp/guest-export/guests-*.csv
 *   node scripts/export-guests-csv.mjs --execute --out /path/to/file.csv
 *   node scripts/export-guests-csv.mjs --collection guests
 *
 * PRIVACY: the output contains personal data. Keep it local (that folder is
 * gitignored), never commit it and never paste it into a public issue.
 */
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "boda-500805";
const DATABASE_ID = "boda-us-central1";

/** Columns that must appear first when present (the rest go alphabetically). */
const PREFERRED = [
  "docId",
  "identity.firstName",
  "identity.middleName",
  "identity.lastName",
  "identity.maternalLastName",
  "identity.phone",
  "identity.age",
  "identity.gender",
  "identity.isAdult",
  "identity.lang",
  "tagGroup",
  "invitationGroup",
  "table",
  "hosting.cabin",
  "hosting.room",
  "hosting.xtraCabin",
  "hosting.xtraRoom",
  "rsvp.confirmCabin",
  "rsvp.petanca",
  "rsvp.needBalls",
  "travelsByPlane",
  "invitationSent",
  "sent",
  "isAdmin",
  "messageAuthor",
  "message",
  "guestId",
  "firebaseEmail",
];

function parseArgs(argv) {
  const args = { execute: false, collection: "guests" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--execute") {
      args.execute = true;
      continue;
    }
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Falta el valor de --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Firestore/JS values → a single flat string (never "[object Object]"). */
function flatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return "";
    }
  }
  if (typeof value.latitude === "number" && typeof value.longitude === "number") {
    return `${value.latitude},${value.longitude}`;
  }
  if (typeof value.path === "string") return value.path;
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) {
      return value.map((item) => flatValue(item)).join(" | ");
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

/** Nested objects become dotted columns: `rsvp.answers.friday`. */
function flatten(value, prefix, out) {
  if (value === null || value === undefined) return;
  if (typeof value === "object" && !Array.isArray(value) && !value.toDate && !value.path) {
    const entries = Object.entries(value);
    if (!entries.length) {
      out[prefix] = "";
      return;
    }
    for (const [key, child] of entries) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out[prefix] = flatValue(value);
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function orderColumns(keys) {
  const preferred = PREFERRED.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !preferred.includes(key)).sort((a, b) => a.localeCompare(b));
  return [...preferred, ...rest];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credential =
    credentialPath && existsSync(credentialPath)
      ? cert(JSON.parse(readFileSync(credentialPath, "utf8")))
      : applicationDefault();

  let app;
  try {
    app = initializeApp({ credential, projectId: PROJECT_ID });
  } catch (error) {
    fail(`No se pudo inicializar Firebase Admin: ${error.message}`);
  }
  const db = getFirestore(app, DATABASE_ID);

  let snapshot;
  try {
    snapshot = await db.collection(args.collection).get();
  } catch (error) {
    fail(
      `No se pudo leer "${args.collection}": ${error.message}\n` +
        "Si es un problema de credenciales, ejecuta `gcloud auth application-default login`.",
    );
  }

  const rows = [];
  const keys = new Set();
  snapshot.forEach((doc) => {
    const row = { docId: doc.id };
    const flat = {};
    flatten(doc.data(), "", flat);
    for (const [key, value] of Object.entries(flat)) {
      // `id` is a real field in some documents; the Firestore doc id is `docId`.
      row[key] = value;
      keys.add(key);
    }
    keys.add("docId");
    rows.push(row);
  });

  const columns = orderColumns([...keys]);
  rows.sort((a, b) => {
    const last = String(a["identity.lastName"] ?? "").localeCompare(
      String(b["identity.lastName"] ?? ""),
      "es",
    );
    if (last) return last;
    const first = String(a["identity.firstName"] ?? "").localeCompare(
      String(b["identity.firstName"] ?? ""),
      "es",
    );
    return first || String(a.docId).localeCompare(String(b.docId));
  });

  console.log(`\n📋 ${args.collection}: ${rows.length} documentos · ${columns.length} columnas`);
  console.log(
    `   primeras columnas: ${columns.slice(0, 12).join(", ")}${columns.length > 12 ? ", …" : ""}`,
  );

  if (!args.execute) {
    console.log("\nModo simulación: no se escribió nada. Añade --execute para generar el CSV.\n");
    process.exit(0);
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13);
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outPath = args.out
    ? isAbsolute(args.out)
      ? args.out
      : join(repoRoot, args.out)
    : join(repoRoot, "tmp", "guest-export", `guests-${stamp}.csv`);

  mkdirSync(dirname(outPath), { recursive: true });

  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  // BOM + CRLF: Excel and Google Sheets both read it correctly.
  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
  writeFileSync(outPath, csv, "utf8");

  const kb = (Buffer.byteLength(csv, "utf8") / 1024).toFixed(0);
  console.log(`\n✅ CSV escrito: ${outPath} (${kb} KB, ${rows.length} filas)`);
  console.log("   Google Sheets → Archivo → Importar → Subir → reemplaza la hoja.");
  console.log("   Contiene datos personales: no lo subas al repo.\n");
  process.exit(0);
}

main().catch((error) => fail(error.message));
