/**
 * Generate src/guests.js from invitados/lista_invitados.csv (source of truth).
 *
 * The CSV must contain these columns (in order):
 *   No,check,Nombre,Email,Se envió invitación ,Confirmado,Hospadeje,Grupo,
 *   Adulto/Niño,Hombre/Mujer,Confirmado el ,Mesa,privado?,pagado?,Cabaña,
 *   Cuarto,Invitacion,_invitacion_group,precio,precio_pp_2noches,
 *   viajaEnAvion,lang,username,firebase_email,password
 *
 * Usage:
 *   node scripts/generate-guests.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "../../../invitados/lista_invitados.csv");
const OUT_PATH = join(__dirname, "../src/guests.js");

const AUTH_DOMAIN = "boda-david-y-ayde.web.app";

/** Map a CSV cabin name to a unit key + label + occupancy + payment. */
function cabinInfo(cabana, privado, pagado) {
  if (!cabana) return { hasCabin: false };
  const c = String(cabana).trim().toUpperCase();
  const priv = String(privado).trim().toUpperCase() === "TRUE";
  const pag = String(pagado).trim().toUpperCase() === "TRUE";
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

function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Split one CSV line into cells, honouring double-quoted fields that may
 * contain commas and escaped quotes ("").
 */
function parseLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * The CSV is inconsistent: the two price columns (`precio`,
 * `precio_pp_2noches`) are sometimes absent and, when present, contain
 * unquoted thousands separators (e.g. `$5,310`). A naive split(",") therefore
 * shifts every column after them by a variable amount.
 *
 * To stay robust we never rely on the middle columns. The columns we need are
 * either before the prices (fixed positions 0..17) or after them (always the
 * last five cells: viajaEnAvion, lang, username, firebase_email, password).
 * The price columns in between are ignored.
 */
const FRONT_COLUMNS = [
  "No", "check", "Nombre", "Email", "Se envió invitación ", "Confirmado",
  "Hospadeje", "Grupo", "Adulto/Niño", "Hombre/Mujer", "Confirmado el ",
  "Mesa", "privado?", "pagado?", "Cabaña", "Cuarto", "Invitacion",
  "_invitacion_group",
];
const BACK_COLUMNS = [
  "viajaEnAvion", "lang", "username", "firebase_email", "password",
];

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row = {};
    FRONT_COLUMNS.forEach((h, idx) => { row[h] = (cells[idx] || "").trim(); });
    BACK_COLUMNS.forEach((h, idx) => {
      row[h] = (cells[cells.length - BACK_COLUMNS.length + idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}



const csv = readFileSync(CSV_PATH, "utf-8");
const rows = parseCsv(csv);

const guests = rows.map((r) => {
  const nombre = r["Nombre"] || "";
  const apellido = r["Apellido"] || "";
  const firstName = nombre.trim();
  const lastName = apellido.trim();
  const username = (r["username"] || "").trim();
  const firebaseEmail = (r["firebase_email"] || "").trim() ||
    (username ? `${username}@${AUTH_DOMAIN}` : "");
  const lang = (r["lang"] || "es").toLowerCase();
  const group = (r["Grupo"] || "").trim();
  const invitacionGroup = (r["Invitacion"] || "").trim();
  const isNovio = group === "Novios";
  const cabin = cabinInfo(r["Cabaña"], r["privado?"], r["pagado?"]);
  const room = (r["Cuarto"] || "").trim() || undefined;

  const g = {
    id: slugify(`${firstName} ${lastName}`) || slugify(username) || `guest_${r["No"]}`,
    username,
    firebaseEmail,
    lang,
    firstName,
    lastName,
    group,
    ...(invitacionGroup ? { invitacionGroup } : {}),
    ...cabin,
    ...(room ? { room } : {}),
  };
  if (isNovio) g.isNovio = true;
  return g;
});

const lines = [];
lines.push(`/**`);
lines.push(` * Guest registry — GENERATED by scripts/generate-guests.mjs`);
lines.push(` * from invitados/lista_invitados.csv (source of truth).`);
lines.push(` * Do not edit by hand; re-run the generator after changing the CSV.`);
lines.push(` */`);
lines.push(``);
lines.push(`import { collection, getDocs } from "firebase/firestore";`);
lines.push(`import { db } from "./firebase.js";`);
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
  if (g.username) parts.push(`username: ${JSON.stringify(g.username)}`);
  if (g.firebaseEmail) parts.push(`firebaseEmail: ${JSON.stringify(g.firebaseEmail)}`);
  if (g.lang) parts.push(`lang: ${JSON.stringify(g.lang)}`);
  parts.push(`firstName: ${JSON.stringify(g.firstName)}`);
  parts.push(`lastName: ${JSON.stringify(g.lastName)}`);
  parts.push(`group: ${JSON.stringify(g.group)}`);
  if (g.invitacionGroup) parts.push(`invitacionGroup: ${JSON.stringify(g.invitacionGroup)}`);
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
lines.push(`/**`);
lines.push(` * Load deleted guest ids from Firestore and mark them on the registry.`);
lines.push(` * @returns {Promise<string[]>}`);
lines.push(` */`);
lines.push(`export async function loadDeletedGuestIds() {`);
lines.push(`  try {`);
lines.push(`    const snap = await getDocs(collection(db, "guests"));`);
lines.push(`    const deleted = [];`);
lines.push(`    snap.forEach((doc) => {`);
lines.push(`      const data = doc.data();`);
lines.push(`      if (data && data._deleted) deleted.push(doc.id);`);
lines.push(`    });`);
lines.push(`    deleted.forEach((id) => {`);
lines.push(`      const g = GUESTS.find((x) => x.id === id);`);
lines.push(`      if (g) g._deleted = true;`);
lines.push(`    });`);
lines.push(`    return deleted;`);
lines.push(`  } catch (error) {`);
lines.push(`    console.warn("loadDeletedGuestIds failed", error);`);
lines.push(`    return [];`);
lines.push(`  }`);
lines.push(`}`);
lines.push(``);
lines.push(`export default GUESTS;`);

writeFileSync(OUT_PATH, lines.join("\n"), "utf-8");
console.log(`Generated ${OUT_PATH} with ${guests.length} guests.`);
