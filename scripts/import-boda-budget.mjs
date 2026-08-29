/**
 * Import the private Google Sheet budget into Firestore without committing its
 * contents to Git. Dry-run by default; deterministic document ids + merge
 * writes make repeat executions safe.
 *
 * Required:
 *   --sheet-id=<id> (or BODA_BUDGET_SHEET_ID)
 * Optional:
 *   --sheet-name=Presupuesto
 *   --execute
 */
import { createRequire } from "module";
import { createHash, createSign } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { collections } from "../web/shared/firestore-paths.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const execute = args.includes("--execute");
const arg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const spreadsheetId = arg("sheet-id") || process.env.BODA_BUDGET_SHEET_ID;
const sheetName = arg("sheet-name") || "Presupuesto";
if (!spreadsheetId) throw new Error("Pass --sheet-id or set BODA_BUDGET_SHEET_ID.");

const require = createRequire(import.meta.url);
const serviceAccount = require(join(here, "../integraciones/google_sheets/service_account.json"));
const source = { spreadsheetId, sheet: sheetName };

function base64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const input = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input); signer.end();
  const assertion = `${input}.${base64url(signer.sign(serviceAccount.private_key))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}
async function readValues() {
  const token = await accessToken();
  const range = encodeURIComponent(`${sheetName}!A1:P200`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Google Sheets read failed: ${response.status} ${await response.text()}`);
  return (await response.json()).values || [];
}

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = (value) => String(value ?? "").trim();
const slug = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
function responsibilityShares(value) {
  const payer = text(value).toLowerCase();
  if (/^david$|solo david|100% david/.test(payer)) return { david: 1, ayde: 0 };
  if (/^ayd[eé]$|solo ayd[eé]|100% ayd[eé]/.test(payer)) return { david: 0, ayde: 1 };
  return { david: 0.5, ayde: 0.5 };
}
const stableId = (prefix, row, name) => `${prefix}-${row}-${slug(name) || createHash("sha1").update(String(row)).digest("hex").slice(0, 8)}`;
const category = (value) => ({
  ALOJAMIENTO: "accommodation", BEBIDA: "beverages", POSTRES: "desserts",
  COMIDA: "food", DECO: "decoration", MUSICA: "music", NOVIOS: "couple",
  PLAYA: "post_wedding_trip", SERVICIOS: "services",
})[text(value).toUpperCase()] || "custom";

function parse(values) {
  const targetGuestCount = number(values[0]?.[6]) || 152;
  const formulaHeaderIndex = values.findIndex((row) => text(row?.[0]).toUpperCase() === "QUE?" && text(row?.[1]).toLowerCase().includes("persona"));
  const mainEnd = formulaHeaderIndex < 0 ? values.length : formulaHeaderIndex;
  const formulaByName = new Map();

  if (formulaHeaderIndex >= 0) {
    for (let index = formulaHeaderIndex + 1; index < values.length; index += 1) {
      const row = values[index] || [];
      const name = text(row[0]);
      if (!name) continue;
      const ratioOrDivisor = number(row[1]);
      const unit = text(row[2]);
      const quantity = number(row[3]);
      const unitPrice = number(row[5]);
      const isDivisor = /por cada|por \d+|bolsa por|botella por/i.test(unit);
      formulaByName.set(name.toLowerCase(), {
        quantity, unit, unitPrice,
        pricingModel: "quantity_formula",
        pricingData: {
          unitPrice,
          unitLabel: unit || "unidad",
          quantityFormula: {
            source: "guestCount",
            multiplier: isDivisor ? 1 : ratioOrDivisor,
            divisor: isDivisor ? ratioOrDivisor || 1 : 1,
            rounding: "none",
          },
        },
      });
    }
  }

  const items = [];
  const payments = [];
  const contributions = [];
  for (let index = 2; index < mainEnd; index += 1) {
    const row = values[index] || [];
    const name = text(row[0]);
    const type = text(row[2]);
    const total = number(row[6]);
    if (!name || name.toLowerCase() === "total" || (!type && !total)) continue;
    // Detail-only rows (for example package inclusions or menu choices) remain
    // attached to the preceding payable row instead of becoming fake expenses.
    if (!total && items.length && items.at(-1).name === name) {
      const detail = text(row[1]);
      if (detail) items.at(-1).details.push(detail);
      continue;
    }

    const id = stableId("sheet-budget", index + 1, name);
    const formula = formulaByName.get(name.toLowerCase());
    const perPerson = number(row[14]);
    const item = {
      id, name, description: text(row[1]), categoryId: category(type),
      amount: total, currency: "MXN", included: Boolean(row[3]),
      payer: text(row[4]), responsibilityShares: responsibilityShares(row[4]), sponsorName: text(row[5]) || null,
      targetGuestCount: number(row[13]) || null,
      pricePerPerson: perPerson || null,
      pricingModel: formula?.pricingModel || (perPerson ? "per_person" : "fixed"),
      pricingData: formula?.pricingData || (perPerson ? { pricePerPerson: perPerson } : { amount: total }),
      quantitySnapshot: formula ? { quantity: formula.quantity, unit: formula.unit, unitPrice: formula.unitPrice } : null,
      details: [], source: { ...source, row: index + 1 },
      status: row[15] ? "paid" : (row[3] ? "committed" : "planned"),
    };
    items.push(item);

    [["deposit",7,8],["installment",9,10],["balance",11,12]].forEach(([paymentType, amountColumn, payerColumn]) => {
      const amount = number(row[amountColumn]);
      if (!amount) return;
      payments.push({
        id: stableId(`sheet-${paymentType}`, index + 1, name),
        budgetItemId: id, kind: "planned", type: paymentType, amount, currency: "MXN",
        plannedPayerLabel: text(row[payerColumn]), payerId: null, status: "planned",
        dueRule: paymentType === "deposit" ? "on_booking" : (paymentType === "installment" ? "one_week_before" : "event_day"),
        sourcePaidAtLabel: text(row[15]) || null, source: { ...source, row: index + 1 },
      });
    });
    if (item.sponsorName) {
      contributions.push({
        id: stableId("sheet-contribution", index + 1, name),
        budgetItemId: id, contributorName: item.sponsorName,
        coverageMode: "full", committedAmount: total, amount: total, currency: "MXN", status: "pledged",
        source: { ...source, row: index + 1 },
      });
    }
  }
  return {
    event: { id: "main", name: "Boda", currency: "MXN", targetGuestCount, timezone: "America/Mexico_City", source },
    items, payments, contributions, formulaCount: formulaByName.size,
  };
}

const parsed = parse(await readValues());
console.log(JSON.stringify({
  mode: execute ? "execute" : "dry-run",
  targetGuestCount: parsed.event.targetGuestCount,
  budgetItems: parsed.items.length,
  payments: parsed.payments.length,
  contributions: parsed.contributions.length,
  quantityFormulas: parsed.formulaCount,
  totalSnapshot: parsed.items.reduce((sum, item) => sum + item.amount, 0),
}, null, 2));

if (!execute) {
  console.log("No Firestore writes. Review the counts, then rerun with --execute.");
  process.exit(0);
}

const reqFromInvitation = createRequire(join(here, "../web/invitation/package.json"));
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore, FieldValue } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");
const groups = [
  [collections.budgetEvents, [parsed.event]],
  [collections.budgetManualItems, parsed.items],
  [collections.payments, parsed.payments],
  [collections.contributions, parsed.contributions],
];
for (const [collectionName, records] of groups) {
  for (let offset = 0; offset < records.length; offset += 400) {
    const batch = db.batch();
    for (const record of records.slice(offset, offset + 400)) {
      batch.set(db.collection(collectionName).doc(record.id), {
        ...record, importedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
  }
}
console.log("Import complete. No documents were deleted.");
