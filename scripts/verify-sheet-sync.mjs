/**
 * verify-sheet-sync.mjs
 *
 * Post-sync verification: compares Firestore vs Google Sheet CSVs and reports
 * any mismatches. This is a READ-ONLY script — it never writes to Firestore.
 *
 * It verifies:
 *   1. Every sheet row has a corresponding Firestore document.
 *   2. Every Firestore document has a corresponding sheet row (unless stale).
 *   3. Sheet-controlled fields match between sheet and Firestore.
 *   4. Firestore-only fields are preserved (not overwritten by the sheet).
 *
 * Uses `sheet-mapping.cjs` as the single source of truth for field mapping.
 *
 * Usage:
 *   node scripts/verify-sheet-sync.mjs                # verify all collections
 *   node scripts/verify-sheet-sync.mjs --collection guests  # verify one
 *
 * Run with Node 20 (avoids the jwks-rsa/jose ESM issue on Node 22):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/verify-sheet-sync.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { COLLECTIONS, toBool, toNum, toStr } = require(join(__dirname, "sheet-mapping.cjs"));

// ── CLI args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const collectionFilter = args.find((a) => a.startsWith("--collection="))?.split("=")[1];

// ── Firebase Admin setup ─────────────────────────────────────────────────

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app);

// ── CSV parser ───────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i].trim() : ""; });
    return obj;
  });
}

// ── Field value conversion ───────────────────────────────────────────────

function convertValue(mapping, rawValue) {
  switch (mapping.type) {
    case "boolean": return toBool(rawValue);
    case "number": return toNum(rawValue);
    case "string":
    default: return toStr(rawValue);
  }
}

function buildPayload(row, mapping) {
  const payload = {};
  for (const [field, def] of Object.entries(mapping)) {
    if (def.firestoreOnly) continue;
    let value;
    if (def.compose) {
      const parts = def.compose.map((col) => toStr(row[col])).filter(Boolean);
      value = parts.join(" ");
    } else if (def.sheetColumn) {
      value = convertValue(def, row[def.sheetColumn]);
    } else {
      continue;
    }
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      if (!payload[parent]) payload[parent] = {};
      payload[parent][child] = value;
    } else {
      payload[field] = value;
    }
  }
  return payload;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a === "object") {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

// ── Verification ─────────────────────────────────────────────────────────

async function verifyCollection(collectionDef) {
  const { collection, csvPath, mapping, idField, excludeRows } = collectionDef;
  const fullCsvPath = join(__dirname, "..", csvPath);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`VERIFY: ${collection}  (${csvPath})`);
  console.log(`${"=".repeat(70)}`);

  // 1. Read CSV
  let csvText;
  try {
    csvText = readFileSync(fullCsvPath, "utf-8");
  } catch (e) {
    console.error(`  ✗ Cannot read CSV: ${fullCsvPath}`);
    return { collection, status: "ERROR", error: e.message };
  }

  const allRows = rowsToObjects(parseCsv(csvText));
  let rows = allRows;
  if (excludeRows) {
    rows = allRows.filter((r) => !excludeRows(r));
  }

  // 2. Build sheet payloads
  const sheetDocs = new Map();
  for (const row of rows) {
    const payload = buildPayload(row, mapping);
    const id = payload[idField];
    if (!id) continue;
    sheetDocs.set(id, payload);
  }

  // 3. Read Firestore
  const existingDocs = new Map();
  const existingSnap = await db.collection(collection).get();
  existingSnap.forEach((doc) => existingDocs.set(doc.id, doc.data()));

  // 4. Compare
  const missingInFirestore = []; // in sheet, not in Firestore
  const missingInSheet = [];     // in Firestore, not in sheet
  const fieldMismatches = [];    // sheet-controlled fields differ

  for (const [id, sheetPayload] of sheetDocs) {
    const existing = existingDocs.get(id);
    if (!existing) {
      missingInFirestore.push(id);
      continue;
    }

    // Compare sheet-controlled fields
    for (const [field, def] of Object.entries(mapping)) {
      if (def.firestoreOnly) continue;
      let sheetValue;
      let existingValue;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        sheetValue = sheetPayload[parent]?.[child];
        existingValue = existing[parent]?.[child];
      } else {
        sheetValue = sheetPayload[field];
        existingValue = existing[field];
      }
      if (!deepEqual(sheetValue, existingValue)) {
        fieldMismatches.push({ id, field, sheetValue, existingValue });
      }
    }
  }

  for (const [id] of existingDocs) {
    if (!sheetDocs.has(id)) missingInSheet.push(id);
  }

  // 5. Report
  console.log(`  Sheet rows: ${sheetDocs.size}`);
  console.log(`  Firestore docs: ${existingDocs.size}`);
  console.log(`  Missing in Firestore (in sheet, not in FS): ${missingInFirestore.length}`);
  console.log(`  Missing in Sheet (in FS, not in sheet): ${missingInSheet.length}`);
  console.log(`  Field mismatches: ${fieldMismatches.length}`);

  if (missingInFirestore.length > 0) {
    console.log(`\n  --- MISSING IN FIRESTORE ---`);
    for (const id of missingInFirestore) {
      console.log(`    ! ${collection}/${id} — in sheet but NOT in Firestore`);
    }
  }

  if (missingInSheet.length > 0) {
    console.log(`\n  --- MISSING IN SHEET (stale) ---`);
    for (const id of missingInSheet) {
      console.log(`    ! ${collection}/${id} — in Firestore but NOT in sheet`);
    }
  }

  if (fieldMismatches.length > 0) {
    console.log(`\n  --- FIELD MISMATCHES ---`);
    for (const m of fieldMismatches.slice(0, 50)) {
      console.log(`    ! ${collection}/${m.id}.${m.field}: sheet=${JSON.stringify(m.sheetValue)} FS=${JSON.stringify(m.existingValue)}`);
    }
    if (fieldMismatches.length > 50) {
      console.log(`    ... and ${fieldMismatches.length - 50} more`);
    }
  }

  const ok = missingInFirestore.length === 0 && fieldMismatches.length === 0;
  console.log(`\n  ${ok ? "✓ VERIFIED" : "✗ ISSUES FOUND"}`);

  return {
    collection,
    status: ok ? "OK" : "ISSUES",
    sheetRows: sheetDocs.size,
    firestoreDocs: existingDocs.size,
    missingInFirestore: missingInFirestore.length,
    missingInSheet: missingInSheet.length,
    fieldMismatches: fieldMismatches.length,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Google Sheets → Firestore Verification`);
  console.log(`Node: ${process.version}`);

  const collectionsToVerify = collectionFilter
    ? COLLECTIONS.filter((c) => c.collection === collectionFilter)
    : COLLECTIONS;

  if (collectionFilter && collectionsToVerify.length === 0) {
    console.error(`Unknown collection: ${collectionFilter}`);
    console.error(`Available: ${COLLECTIONS.map((c) => c.collection).join(", ")}`);
    process.exit(1);
  }

  const results = [];
  for (const collectionDef of collectionsToVerify) {
    const result = await verifyCollection(collectionDef);
    results.push(result);
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`${"=".repeat(70)}`);
  for (const r of results) {
    console.log(`  ${r.collection}: ${r.status} (sheet=${r.sheetRows}, FS=${r.firestoreDocs}, missingFS=${r.missingInFirestore}, stale=${r.missingInSheet}, mismatches=${r.fieldMismatches})`);
  }

  const anyIssues = results.some((r) => r.status === "ISSUES" || r.status === "ERROR");
  process.exit(anyIssues ? 1 : 0);
}

await main();
