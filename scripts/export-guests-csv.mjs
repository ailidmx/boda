#!/usr/bin/env node
/**
 * Flat export of the Firestore `guests` collection to CSV for Google Sheets.
 *
 * READ-ONLY. Auth: Application Default Credentials
 * (`gcloud auth application-default login`) or
 * `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`.
 *
 * The flattening/CSV logic is shared with the dashboard button
 * (`web/shared/guest-export.js`), so both produce the same columns.
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

import {
  buildGuestCsv,
  buildGuestTable,
  guestCsvFileName,
} from "../web/shared/guest-export.js";

const PROJECT_ID = "boda-500805";
const DATABASE_ID = "boda-us-central1";

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

  const records = [];
  snapshot.forEach((doc) => records.push({ docId: doc.id, ...doc.data() }));

  const { rows, columns } = buildGuestTable(records);
  console.log(`\n📋 ${args.collection}: ${rows.length} documentos · ${columns.length} columnas`);
  console.log(
    `   primeras columnas: ${columns.slice(0, 12).join(", ")}${columns.length > 12 ? ", …" : ""}`,
  );

  if (!args.execute) {
    console.log("\nModo simulación: no se escribió nada. Añade --execute para generar el CSV.\n");
    process.exit(0);
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outPath = args.out
    ? isAbsolute(args.out)
      ? args.out
      : join(repoRoot, args.out)
    : join(repoRoot, "tmp", "guest-export", guestCsvFileName());

  mkdirSync(dirname(outPath), { recursive: true });
  const csv = buildGuestCsv(records);
  writeFileSync(outPath, csv, "utf8");

  const kb = (Buffer.byteLength(csv, "utf8") / 1024).toFixed(0);
  console.log(`\n✅ CSV escrito: ${outPath} (${kb} KB, ${rows.length} filas)`);
  console.log("   Google Sheets → Archivo → Importar → Subir → reemplaza la hoja.");
  console.log("   Contiene datos personales: no lo subas al repo.\n");
  process.exit(0);
}

main().catch((error) => fail(error.message));
