/**
 * Seed the documented wedding providers and offers, then link matching
 * budget_manual_items. Dry-run by default; deterministic ids + merge writes
 * make repeated executions safe. No documents are deleted.
 *
 * Usage:
 *   node scripts/import-boda-providers.mjs
 *   node scripts/import-boda-providers.mjs --execute
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { collections } from "../web/shared/firestore-paths.js";
import { buildOfferPayload, buildProviderPayload } from "../web/shared/payload-builders.js";
import { validateOfferPayload, validateProviderPayload } from "../web/shared/validation.js";

const here = dirname(fileURLToPath(import.meta.url));
const execute = process.argv.slice(2).includes("--execute");

export const PROVIDER_SEEDS = [
  {
    id: "provider-club-roca-azul",
    name: "Club Roca Azul",
    categoryIds: ["venue", "accommodation", "food"],
    status: "selected",
    contact: { person: "", phone: "", email: "" },
    notes: "Sede y alojamiento confirmados para el fin de semana de la boda.",
    tags: ["confirmado", "venue", "alojamiento"],
    match: /roca azul/i,
    offer: null,
  },
  {
    id: "provider-carnitas-el-inge",
    name: "Deliciosas Carnitas El Inge",
    categoryIds: ["food"],
    status: "quoted",
    contact: { person: "", phone: "33 3459 5569", email: "" },
    notes: "Incluye salsa, tortillas y 2 horas de servicio. Mínimo, logística, anticipo y cancelación por confirmar.",
    tags: ["carnitas", "sabado", "whatsapp"],
    match: /carnitas/i,
    offer: {
      id: "offer-carnitas-el-inge-110pp",
      categoryId: "food",
      name: "Carnitas para evento",
      description: "Carnitas a MXN 110 por persona; incluye salsa, tortillas y 2 horas de servicio.",
      pricingModel: "per_person",
      pricingData: { pricePerPerson: 110, includedHours: 2 },
      constraints: { minimumGuests: null, durationHours: 2 },
      status: "quoted",
      sourceRef: "proveedores/fichas/carnitas_el_inge.md",
    },
  },
  {
    id: "provider-marimba-vientos-sur",
    name: "Marimba Vientos Sur",
    categoryIds: ["music", "entertainment"],
    status: "quoted",
    contact: { person: "", phone: "+52 33 1229 9826", email: "" },
    notes: "Duración objetivo 2h. Formato, requerimientos técnicos, costo, anticipo y cancelación por confirmar.",
    tags: ["marimba", "musica-en-vivo"],
    match: /marimba|vientos sur/i,
    offer: {
      id: "offer-marimba-vientos-sur",
      categoryId: "music",
      name: "Marimba en vivo",
      description: "Presentación de marimba; duración objetivo de 2 horas. Cotización final pendiente.",
      pricingModel: "custom",
      pricingData: { amount: 0, targetDurationHours: 2 },
      constraints: { durationHours: 2 },
      status: "requested",
      sourceRef: "proveedores/fichas/marimba_vientos_sur.md",
    },
  },
];

export function buildProviderMigration(items = [], timestamp = null) {
  const providers = [];
  const offers = [];
  const itemUpdates = [];
  const linkedItemIds = new Set();

  for (const seed of PROVIDER_SEEDS) {
    const provider = {
      id: seed.id,
      ...buildProviderPayload({
        name: seed.name, categoryIds: seed.categoryIds, contact: seed.contact,
        notes: seed.notes, tags: seed.tags, status: seed.status,
        categoryData: {}, timestamp,
      }),
      source: { type: "documented_seed", ref: "proveedores/proveedores_master.md" },
    };
    const providerValidation = validateProviderPayload(provider);
    if (!providerValidation.valid) throw new Error(`${seed.id}: ${providerValidation.errors.join(", ")}`);
    providers.push(provider);

    const matches = items.filter((item) => seed.match.test(String(item.name || "")));
    if (seed.offer) {
      const offer = {
        id: seed.offer.id,
        ...buildOfferPayload({
          providerId: seed.id, categoryId: seed.offer.categoryId,
          name: seed.offer.name, description: seed.offer.description,
          pricingModel: seed.offer.pricingModel, pricingData: seed.offer.pricingData,
          constraints: seed.offer.constraints, currency: "MXN", active: true,
          timestamp,
        }),
        status: seed.offer.status,
        source: { type: "documented_seed", ref: seed.offer.sourceRef },
      };
      const offerValidation = validateOfferPayload(offer);
      if (!offerValidation.valid) throw new Error(`${offer.id}: ${offerValidation.errors.join(", ")}`);
      offers.push(offer);
      for (const item of matches) {
        linkedItemIds.add(item.id);
        itemUpdates.push({ id: item.id, providerId: seed.id, offerId: offer.id, updatedAt: timestamp });
      }
      continue;
    }

    // Roca Azul has several independently priced lines in the source sheet.
    // Preserve each line as a distinct offer instead of collapsing venue,
    // accommodation and meals into one misleading package.
    for (const item of matches) {
      const offerId = `offer-${item.id}`;
      const offer = {
        id: offerId,
        ...buildOfferPayload({
          providerId: seed.id, categoryId: item.categoryId || "venue",
          name: item.name, description: item.description || "",
          pricingModel: item.pricingModel || "fixed",
          pricingData: item.pricingData || { amount: Number(item.amount) || 0 },
          currency: item.currency || "MXN", active: true, timestamp,
        }),
        status: item.status === "paid" ? "accepted" : "quoted",
        source: item.source || { type: "budget_item", id: item.id },
      };
      const offerValidation = validateOfferPayload(offer);
      if (!offerValidation.valid) throw new Error(`${offer.id}: ${offerValidation.errors.join(", ")}`);
      offers.push(offer);
      linkedItemIds.add(item.id);
      itemUpdates.push({ id: item.id, providerId: seed.id, offerId, updatedAt: timestamp });
    }
  }

  return {
    providers,
    offers,
    itemUpdates,
    unmatchedItems: items.filter((item) => !linkedItemIds.has(item.id)).map((item) => ({ id: item.id, name: item.name })),
  };
}

async function main() {
  const require = createRequire(import.meta.url);
  const firebaseServiceAccount = require(join(here, "../integraciones/google_sheets/firebase_service_account.json"));
  const reqFromInvitation = createRequire(join(here, "../web/invitation/package.json"));
  const { initializeApp, cert } = await import(reqFromInvitation.resolve("firebase-admin/app"));
  const { getFirestore, FieldValue } = await import(reqFromInvitation.resolve("firebase-admin/firestore"));
  const app = initializeApp({ credential: cert(firebaseServiceAccount), projectId: firebaseServiceAccount.project_id });
  const db = getFirestore(app, "boda-us-central1");
  const snapshot = await db.collection(collections.budgetManualItems).get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const migration = buildProviderMigration(items, FieldValue.serverTimestamp());

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    budgetItemsRead: items.length,
    providersToUpsert: migration.providers.length,
    offersToUpsert: migration.offers.length,
    budgetItemsToLink: migration.itemUpdates.length,
    unmatchedBudgetItems: migration.unmatchedItems.length,
    providers: migration.providers.map(({ id, name }) => ({ id, name })),
    linkedItems: migration.itemUpdates.map((update) => ({ id: update.id, providerId: update.providerId, offerId: update.offerId })),
  }, null, 2));

  if (!execute) {
    console.log("No Firestore writes. Review the mapping, then rerun with --execute.");
    return;
  }

  const batch = db.batch();
  for (const provider of migration.providers) batch.set(db.collection(collections.providers).doc(provider.id), provider, { merge: true });
  for (const offer of migration.offers) batch.set(db.collection(collections.providerOffers).doc(offer.id), offer, { merge: true });
  for (const update of migration.itemUpdates) batch.set(db.collection(collections.budgetManualItems).doc(update.id), update, { merge: true });
  await batch.commit();
  console.log("Provider import complete. No documents were deleted.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  await main();
}
