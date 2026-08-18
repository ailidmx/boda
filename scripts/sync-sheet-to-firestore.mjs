/**
 * sync-sheet-to-firestore.mjs
 *
 * SAFE, INCREMENTAL sync from Google Sheet CSVs → Firestore.
 *
 * Replaces the destructive `migrate-guests.mjs` with a non-destructive,
 * validated, diff-reporting sync that:
 *
 *   1. Reads the local CSVs (already pulled from Google Sheets via
 *      `sync_google_sheets.py pull`).
 *   2. Validates column headers against `sheet-mapping.cjs` — ABORTS if a
 *      required column is missing or renamed.
 *   3. Builds Firestore payloads using the mapping.
 *   4. Preserves Firestore-only fields (message, messageAuthor, cloudinaryId,
 *      RSVP responses, _source, _migratedAt) by reading existing docs.
 *   5. Shows a diff report (added / changed / unchanged) before writing.
 *   6. Uses `setDoc(..., { merge: true })` — never full overwrites.
 *   7. NEVER deletes documents unless `--delete-stale` is explicitly passed.
 *
 * Usage:
 *   node scripts/sync-sheet-to-firestore.mjs                # dry-run (default)
 *   node scripts/sync-sheet-to-firestore.mjs --execute      # apply changes
 *   node scripts/sync-sheet-to-firestore.mjs --delete-stale # also delete stale docs
 *   node scripts/sync-sheet-to-firestore.mjs --collection guests  # sync one collection
 *
 * Run with Node 20 (avoids the jwks-rsa/jose ESM issue on Node 22):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load the mapping (CommonJS module)
const { COLLECTIONS, toBool, toNum, toStr } = require(join(__dirname, "sheet-mapping.cjs"));

// ── CLI args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const DELETE_STALE = args.includes("--delete-stale");
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
const db = getFirestore(app, "boda-us-central1");

// ── CSV parser (self-contained, handles quoted fields) ───────────────────

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

/**
 * Build a Firestore payload from a sheet row using the mapping.
 * Handles:
 *   - simple sheetColumn → firestoreField
 *   - compose (multiple sheet columns → one field)
 *   - nested fields (dot notation, e.g. "rsvp.friday")
 */
function buildPayload(row, mapping) {
  const payload = {};
  for (const [field, def] of Object.entries(mapping)) {
    if (def.firestoreOnly) continue; // preserved from existing doc, not from sheet

    let value;
    if (def.compose) {
      // Compose from multiple sheet columns
      const parts = def.compose
        .map((col) => toStr(row[col]))
        .filter(Boolean);
      value = parts.join(" ");
    } else if (def.sheetColumn) {
      value = convertValue(def, row[def.sheetColumn]);
    } else {
      continue;
    }

    // Handle nested fields (dot notation)
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

// ── Validation ───────────────────────────────────────────────────────────

/**
 * Validate that all required sheet columns exist in the CSV header.
 * Returns an array of error messages (empty if valid).
 */
function validateHeaders(csvRows, mapping, collectionName) {
  const errors = [];
  if (csvRows.length === 0) {
    errors.push(`[${collectionName}] CSV is empty or has no data rows`);
    return errors;
  }
  const headers = Object.keys(csvRows[0]);
  for (const [field, def] of Object.entries(mapping)) {
    if (def.firestoreOnly) continue;
    if (def.compose) {
      for (const col of def.compose) {
        if (!headers.includes(col)) {
          errors.push(`[${collectionName}] Missing required column "${col}" (for field "${field}")`);
        }
      }
    } else if (def.sheetColumn && def.required && !headers.includes(def.sheetColumn)) {
      errors.push(`[${collectionName}] Missing required column "${def.sheetColumn}" (for field "${field}")`);
    }
  }
  return errors;
}

// ── Diff helpers ─────────────────────────────────────────────────────────

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

function formatValue(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── Main sync logic ──────────────────────────────────────────────────────

async function syncCollection(collectionDef) {
  const { collection, csvPath, mapping, idField, excludeRows } = collectionDef;
  const fullCsvPath = join(__dirname, "..", csvPath);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`SYNC: ${collection}  (${csvPath})`);
  console.log(`${"=".repeat(70)}`);

  // 1. Read CSV
  let csvText;
  try {
    csvText = readFileSync(fullCsvPath, "utf-8");
  } catch (e) {
    console.error(`  ✗ Cannot read CSV: ${fullCsvPath}`);
    console.error(`    ${e.message}`);
    return { collection, status: "ERROR", error: e.message };
  }

  const allRows = rowsToObjects(parseCsv(csvText));
  let rows = allRows;
  if (excludeRows) {
    rows = allRows.filter((r) => !excludeRows(r));
  }

  // 2. Validate headers
  const headerErrors = validateHeaders(rows, mapping, collection);
  if (headerErrors.length > 0) {
    console.error(`  ✗ HEADER VALIDATION FAILED:`);
    for (const err of headerErrors) {
      console.error(`    - ${err}`);
    }
    console.error(`  ABORTING sync for ${collection}. Fix the CSV headers first.`);
    return { collection, status: "ABORTED", errors: headerErrors };
  }

  // 3. Build payloads from sheet
  const sheetDocs = new Map();
  for (const row of rows) {
    const payload = buildPayload(row, mapping);
    const id = payload[idField];
    if (!id) continue; // skip rows without ID
    sheetDocs.set(id, payload);
  }
  console.log(`  Sheet rows: ${sheetDocs.size}`);

  // 4. Read existing Firestore docs
  const existingDocs = new Map();
  const existingSnap = await db.collection(collection).get();
  existingSnap.forEach((doc) => existingDocs.set(doc.id, doc.data()));
  console.log(`  Firestore docs: ${existingDocs.size}`);

  // 5. Compute diff
  const added = [];
  const changed = [];
  const unchanged = [];
  const stale = [];

  for (const [id, sheetPayload] of sheetDocs) {
    const existing = existingDocs.get(id);
    if (!existing) {
      added.push({ id, payload: sheetPayload });
      continue;
    }

    // Merge: start with existing doc, overlay sheet-controlled fields
    const merged = { ...existing };
    for (const [field, def] of Object.entries(mapping)) {
      if (def.firestoreOnly) continue;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (!merged[parent]) merged[parent] = {};
        merged[parent][child] = sheetPayload[parent]?.[child];
      } else {
        merged[field] = sheetPayload[field];
      }
    }

    // Compare only the sheet-controlled fields
    const sheetFields = {};
    for (const [field, def] of Object.entries(mapping)) {
      if (def.firestoreOnly) continue;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        sheetFields[field] = sheetPayload[parent]?.[child];
      } else {
        sheetFields[field] = sheetPayload[field];
      }
    }

    const existingFields = {};
    for (const [field, def] of Object.entries(mapping)) {
      if (def.firestoreOnly) continue;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        existingFields[field] = existing[parent]?.[child];
      } else {
        existingFields[field] = existing[field];
      }
    }

    if (deepEqual(sheetFields, existingFields)) {
      unchanged.push(id);
    } else {
      changed.push({ id, payload: merged, sheetFields, existingFields });
    }
  }

  // Stale docs (in Firestore but not in sheet)
  for (const [id] of existingDocs) {
    if (!sheetDocs.has(id)) stale.push(id);
  }

  // 6. Report
  console.log(`  Added: ${added.length}`);
  console.log(`  Changed: ${changed.length}`);
  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Stale (in Firestore, not in sheet): ${stale.length}`);

  if (added.length > 0) {
    console.log(`\n  --- ADDED DOCUMENTS ---`);
    for (const a of added) {
      console.log(`    + ${collection}/${a.id}`);
    }
  }

  if (changed.length > 0) {
    console.log(`\n  --- CHANGED DOCUMENTS ---`);
    for (const c of changed) {
      console.log(`    ~ ${collection}/${c.id}`);
      // Show field-level diffs
      const allFields = new Set([...Object.keys(c.sheetFields), ...Object.keys(c.existingFields)]);
      for (const field of [...allFields].sort()) {
        const oldV = c.existingFields[field];
        const newV = c.sheetFields[field];
        if (!deepEqual(oldV, newV)) {
          console.log(`        ${field}: ${formatValue(oldV)} → ${formatValue(newV)}`);
        }
      }
    }
  }

  if (stale.length > 0) {
    console.log(`\n  --- STALE DOCUMENTS (not in sheet) ---`);
    for (const id of stale) {
      console.log(`    - ${collection}/${id}`);
    }
    if (!DELETE_STALE) {
      console.log(`    (use --delete-stale to delete these)`);
    }
  }

  // 7. Apply changes (if --execute)
  if (!EXECUTE) {
    console.log(`\n  [DRY-RUN] No changes written. Use --execute to apply.`);
    return { collection, status: "DRY_RUN", added: added.length, changed: changed.length, unchanged: unchanged.length, stale: stale.length };
  }

  // Apply: write added + changed docs
  let written = 0;
  for (const a of added) {
    await db.collection(collection).doc(a.id).set(a.payload, { merge: true });
    written++;
  }
  for (const c of changed) {
    await db.collection(collection).doc(c.id).set(c.payload, { merge: true });
    written++;
  }
  console.log(`\n  [EXECUTE] Wrote ${written} documents (added + changed).`);

  // Delete stale docs (only if explicitly requested)
  if (DELETE_STALE && stale.length > 0) {
    console.log(`  [EXECUTE] Deleting ${stale.length} stale documents...`);
    const batchSize = 400;
    for (let i = 0; i < stale.length; i += batchSize) {
      const batch = db.batch();
      stale.slice(i, i + batchSize).forEach((id) => batch.delete(db.collection(collection).doc(id)));
      await batch.commit();
    }
    console.log(`  [EXECUTE] Deleted ${stale.length} stale documents.`);
  }

  return { collection, status: "EXECUTED", added: added.length, changed: changed.length, unchanged: unchanged.length, stale: stale.length };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Google Sheets → Firestore Sync`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}${DELETE_STALE ? " + DELETE-STALE" : ""}`);
  console.log(`Node: ${process.version}`);

  const collectionsToSync = collectionFilter
    ? COLLECTIONS.filter((c) => c.collection === collectionFilter)
    : COLLECTIONS;

  if (collectionFilter && collectionsToSync.length === 0) {
    console.error(`Unknown collection: ${collectionFilter}`);
    console.error(`Available: ${COLLECTIONS.map((c) => c.collection).join(", ")}`);
    process.exit(1);
  }

  const results = [];
  for (const collectionDef of collectionsToSync) {
    const result = await syncCollection(collectionDef);
    results.push(result);
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`${"=".repeat(70)}`);
  for (const r of results) {
    console.log(`  ${r.collection}: ${r.status} (added=${r.added ?? "-"}, changed=${r.changed ?? "-"}, unchanged=${r.unchanged ?? "-"}, stale=${r.stale ?? "-"})`);
  }

  const anyError = results.some((r) => r.status === "ERROR" || r.status === "ABORTED");
  process.exit(anyError ? 1 : 0);
}

await main();
