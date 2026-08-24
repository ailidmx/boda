/**
 * Migrate the existing FLAT `budget` collection into the new
 * `budget_manual_items` collection (safe manual classification).
 *
 * The old `budget` docs are spreadsheet-shaped:
 *   { item, totalMxn, approxMxn, paidMxn, paidBy, paidDate,
 *     estimatedCount, confirmedCount, aydeAmount, aydePct, davidAmount, davidPct }
 *
 * They are migrated 1:1 to `budget_manual_items/{id}` as `sourceType: "manual"`
 * items (no provider relations are fabricated). Original fields are preserved
 * under `metadata.legacy` so nothing is lost; `amount`/`currency`/`payerAllocations`
 * are derived. The old `budget` collection is NOT modified or deleted.
 *
 * Dry-run by default; `--execute` writes. Re-running is idempotent (setDoc merge).
 *
 *   node scripts/migrate-budget-to-manual-items.mjs
 *   node scripts/migrate-budget-to-manual-items.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const EXECUTE = process.argv.includes("--execute");

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
const { getFirestore } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore("boda-us-central1");

// Best-effort category classification from the item's Spanish wording.
function classify(item = "") {
  const s = item.toLowerCase();
  if (/mobiliario|mesa|silla|toldo|mueble|carpa|mantel|copa|plato|cubierto/.test(s)) return "furniture";
  if (/cena|comida|taquiza|carnitas|pizza|menu|menú|desayuno|brunch|antojito|elote|gelatina|jericalla|botana|salsa|dulce/.test(s)) return "food";
  if (/chela|cerveza|tequila|refresco|agua|hielo|boli|tejuino|bebida|vino|licor/.test(s)) return "beverages";
  if (/postre|dulce|gelatina|jericalla/.test(s)) return "desserts";
  if (/musica|mariachi|marimba|norteño|norteno|dj|grupo|trío|trio|sonido/.test(s)) return "music";
  if (/flor|deco|decoración|decoracion|centro|iluminación|luz/.test(s)) return "decoration";
  if (/foto|video|fotógraf|fotograf|drone/.test(s)) return "photography";
  if (/vestido|traje|zapato|camisa|anillo|argolla|pantalón|pantalon|sombrero|bordado|peluquer/.test(s)) return "couple";
  if (/transporte|van|taxi|traslado|combustible/.test(s)) return "transport";
  if (/alojamiento|hotel|cabaña|cabana|roca azul|airbnb|noche|hospedaje/.test(s)) return "accommodation";
  if (/playa|viaje|barra|costalegre|manzanillo/.test(s)) return "post_wedding_trip";
  if (/juez|permiso|licencia|servicio|mesero|bolo|imprenta|papeler/.test(s)) return "services";
  return "other";
}

function toNum(v) { const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; }

function buildPayerAllocations(r) {
  const alloc = [];
  if (r.davidPct != null || r.davidAmount != null) {
    alloc.push({ partyId: "david", shareType: r.davidPct != null ? "percentage" : "fixed", shareValue: r.davidPct != null ? toNum(r.davidPct) : toNum(r.davidAmount) });
  }
  if (r.aydePct != null || r.aydeAmount != null) {
    alloc.push({ partyId: "ayde", shareType: r.aydePct != null ? "percentage" : "fixed", shareValue: r.aydePct != null ? toNum(r.aydePct) : toNum(r.aydeAmount) });
  }
  return alloc;
}

const snap = await db.collection("budget").get();
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

let migratedTotal = 0;
let sourceTotal = 0;
let skipped = 0;
const plan = [];

for (const r of rows) {
  const name = String(r.item ?? "").trim();
  if (!name) { skipped += 1; continue; } // separator/empty rows

  const amount = toNum(r.totalMxn ?? r.approxMxn);
  sourceTotal += amount;
  migratedTotal += amount;

  const doc = {
    eventId: "main",
    categoryId: classify(name),
    name,
    description: "",
    amount,
    currency: "MXN",
    status: "planned",
    sourceType: "manual",
    payerAllocations: buildPayerAllocations(r),
    metadata: {
      legacy: { ...r },
      estimatedCount: r.estimatedCount ?? null,
      confirmedCount: r.confirmedCount ?? null,
      paidMxn: toNum(r.paidMxn),
      paidBy: r.paidBy ?? "",
      paidDate: r.paidDate ?? "",
    },
    migration: { source: "budget", sourceId: r.id, migratedAt: new Date() },
  };
  plan.push({ id: r.id, doc });
}

for (const { id, doc } of plan) {
  if (EXECUTE) {
    await db.collection("budget_manual_items").doc(id).set(doc, { merge: true });
    console.log(`✅ budget_manual_items/${id} → ${doc.name} (${doc.categoryId}) $${doc.amount}`);
  } else {
    console.log(`[dry-run] budget_manual_items/${id} → ${doc.name} (${doc.categoryId}) $${doc.amount}`);
  }
}

console.log("\n──────── Reconciliation ────────");
console.log(`Source rows (budget):         ${rows.length}`);
console.log(`Migrated manual items:        ${plan.length}`);
console.log(`Skipped (empty/separator):    ${skipped}`);
console.log(`Source gross total:           $${sourceTotal.toLocaleString("en-US")}`);
console.log(`Migrated gross total:         $${migratedTotal.toLocaleString("en-US")}`);
console.log(`Difference:                   $${(migratedTotal - sourceTotal).toLocaleString("en-US")}`);
console.log(EXECUTE ? "\nDone. Migration executed." : "\nDry run complete — re-run with --execute to write.");
