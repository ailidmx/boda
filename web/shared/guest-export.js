/**
 * Guest CSV export — shared by the admin dashboard (browser download) and the
 * Node script (`scripts/export-guests-csv.mjs`).
 *
 * Pure: no DOM, no Firestore. Nested objects become dotted columns
 * (`identity.firstName`, `hosting.cabin`, `rsvp.answers.friday`), arrays of
 * primitives are joined with " | ", Timestamps become ISO strings, and the
 * output is CSV with BOM + CRLF so Excel and Google Sheets read it cleanly.
 *
 * PRIVACY: the result contains personal data. Callers must keep it local.
 */

/** Columns that must appear first when present (the rest go alphabetically). */
export const PREFERRED_COLUMNS = [
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

/** One Firestore/JS value → a flat string (never "[object Object]"). */
export function flatCell(value) {
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
      return value.map((item) => flatCell(item)).join(" | ");
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

/** Flatten a record into dotted keys. */
export function flattenRecord(record, prefix = "", out = {}) {
  if (record === null || record === undefined) return out;
  if (
    typeof record === "object" &&
    !Array.isArray(record) &&
    !record.toDate &&
    !record.path
  ) {
    const entries = Object.entries(record);
    if (!entries.length) {
      if (prefix) out[prefix] = "";
      return out;
    }
    for (const [key, child] of entries) {
      flattenRecord(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out[prefix] = flatCell(record);
  return out;
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function orderColumns(keys = []) {
  const preferred = PREFERRED_COLUMNS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !preferred.includes(key)).sort((a, b) => a.localeCompare(b));
  return [...preferred, ...rest];
}

function sortRows(rows) {
  return rows.sort((a, b) => {
    const last = String(a["identity.lastName"] ?? a.lastName ?? "").localeCompare(
      String(b["identity.lastName"] ?? b.lastName ?? ""),
      "es",
    );
    if (last) return last;
    const first = String(a["identity.firstName"] ?? a.firstName ?? "").localeCompare(
      String(b["identity.firstName"] ?? b.firstName ?? ""),
      "es",
    );
    return first || String(a.docId).localeCompare(String(b.docId));
  });
}

/** Rows + the column order the CSV will use. */
export function buildGuestTable(records = []) {
  const rows = records.map((record) => {
    const flat = flattenRecord(record);
    delete flat.docId;
    return { docId: record.docId ?? record.id ?? "", ...flat };
  });
  const keys = new Set();
  for (const row of rows) for (const key of Object.keys(row)) keys.add(key);
  return { rows: sortRows(rows), columns: orderColumns([...keys]) };
}

/** Full CSV text (BOM + CRLF). */
export function buildGuestCsv(records = []) {
  const { rows, columns } = buildGuestTable(records);
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** `guests-YYYYMMDD-HHmm.csv` */
export function guestCsvFileName(date = new Date()) {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13);
  return `guests-${stamp}.csv`;
}
