#!/usr/bin/env node
/**
 * Populate the `cabins` Firestore collection with the public showcase data
 * (localized descriptions + Cloudinary photo IDs).
 *
 * The showcase descriptions were previously hard-coded in the invitation's
 * content.js (trilingual es/fr/en). This script moves them into the `cabins`
 * collection so the Cabins section can be driven entirely from the database.
 *
 * The Cloudinary photo IDs come from the build-time media manifest
 * (web/invitation/src/generated-media.js → CABIN_PHOTOS), which is generated
 * from Cloudinary tags. They are stored as a comma-separated string in the
 * `cloudinaryIds` field.
 *
 * Usage:
 *   node scripts/migrate-cabins-showcase.mjs
 *
 * The script is idempotent: re-running it overwrites the showcase fields with
 * the current source data.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase Admin init ───────────────────────────────────────────────────
const SERVICE_ACCOUNT = join(__dirname, "..", "integraciones", "google_sheets", "service_account.json");
const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

// ── Cloudinary photo IDs (from the build-time media manifest) ─────────────
// Keyed by the invitation's cabin showcase key.
const CABIN_PHOTOS = {
  azalea: [
    "cabin-azalea-01", "cabin-azalea-02", "cabin-azalea-03", "cabin-azalea-04",
    "cabin-azalea-05", "cabin-azalea-06", "cabin-azalea-07", "cabin-azalea-08",
    "cabin-azalea-09",
  ],
  dalia: [
    "cabin-dalia-01", "cabin-dalia-02", "cabin-dalia-03", "cabin-dalia-04",
    "cabin-dalia-05", "cabin-dalia-06", "cabin-dalia-07",
  ],
  margarita: [
    "cabin-margarita-01", "cabin-margarita-02", "cabin-margarita-03",
    "cabin-margarita-04", "cabin-margarita-05", "cabin-margarita-06",
    "cabin-margarita-07", "cabin-margarita-08",
  ],
  wooden: [
    "cabin-wooden-01", "cabin-wooden-02", "cabin-wooden-03", "cabin-wooden-04",
  ],
};

// ── Showcase data (trilingual) ────────────────────────────────────────────
// Mirrors the current content.js cabinsShowcase. Each unit is keyed by the
// invitation's cabin key. The `showcase` field stored in Firestore is a map
// of { es, fr, en } where each language holds the full unit description.
const SHOWCASE = {
  azalea: {
    key: "azalea",
    es: {
      title: "Azalea",
      intro: "La primera cabaña de nuestro catálogo: amplia, con espacios comunes para convivir y capacidad anunciada para 12 personas.",
      capacity: "12 personas",
      roomsLabel: "3 habitaciones",
      bedsLabel: "7 camas descritas",
      rooms: [
        "Habitación 1 · 2 camas matrimoniales",
        "Habitación 2 · 2 camas matrimoniales",
        "Habitación 3 · 3 camas individuales",
      ],
      amenities: "Las fotografías muestran sala, comedor, cocina, barra y baño con ducha.",
      galleryLabel: "Galería de Azalea",
      photoAlts: [
        "Comedor y espacio común de la cabaña Azalea",
        "Sala y comedor de la cabaña Azalea",
        "Sala de la cabaña Azalea",
        "Habitación con dos camas matrimoniales en Azalea",
        "Segunda habitación con dos camas matrimoniales en Azalea",
        "Habitación con tres camas individuales en Azalea",
        "Baño con ducha de la cabaña Azalea",
        "Cocina equipada de la cabaña Azalea",
        "Barra y cocina de la cabaña Azalea",
      ],
      note: "La distribución final de huéspedes será confirmada directamente por nosotros.",
    },
    fr: {
      title: "Azalea",
      intro: "La première gîte de notre catalogue : spacieuse, avec de belles pièces communes et une capacité annoncée de 12 personnes.",
      capacity: "12 personnes",
      roomsLabel: "3 chambres",
      bedsLabel: "7 lits décrits",
      rooms: [
        "Chambre 1 · 2 lits doubles",
        "Chambre 2 · 2 lits doubles",
        "Chambre 3 · 3 lits simples",
      ],
      amenities: "Les photos montrent un salon, une salle à manger, une cuisine, un comptoir et une salle de bain avec douche.",
      galleryLabel: "Galerie d’Azalea",
      photoAlts: [
        "Salle à manger et espace commun du gîte Azalea",
        "Salon et salle à manger du gîte Azalea",
        "Salon du gîte Azalea",
        "Chambre avec deux lits doubles dans Azalea",
        "Deuxième chambre avec deux lits doubles dans Azalea",
        "Chambre avec trois lits simples dans Azalea",
        "Salle de bain avec douche du gîte Azalea",
        "Cuisine équipée du gîte Azalea",
        "Comptoir et cuisine du gîte Azalea",
      ],
      note: "Nous confirmerons directement la répartition finale des invités.",
    },
    en: {
      title: "Azalea",
      intro: "The first cabin in our catalogue: spacious, with shared common areas and an announced capacity of 12 people.",
      capacity: "12 people",
      roomsLabel: "3 bedrooms",
      bedsLabel: "7 beds described",
      rooms: [
        "Bedroom 1 · 2 double beds",
        "Bedroom 2 · 2 double beds",
        "Bedroom 3 · 3 single beds",
      ],
      amenities: "The photos show a living room, dining room, kitchen, counter and bathroom with shower.",
      galleryLabel: "Azalea gallery",
      photoAlts: [
        "Dining room and common space of the Azalea cabin",
        "Living room and dining room of the Azalea cabin",
        "Living room of the Azalea cabin",
        "Bedroom with two double beds in Azalea",
        "Second bedroom with two double beds in Azalea",
        "Bedroom with three single beds in Azalea",
        "Bathroom with shower of the Azalea cabin",
        "Equipped kitchen of the Azalea cabin",
        "Counter and kitchen of the Azalea cabin",
      ],
      note: "The final guest distribution will be confirmed directly by us.",
    },
  },
  dalia: {
    key: "dalia",
    es: {
      title: "Dalia",
      intro: "Una cabaña luminosa junto a la alberca, con tres habitaciones y diez couchages perfectamente identificados.",
      capacity: "10 personas",
      roomsLabel: "3 habitaciones",
      bedsLabel: "7 camas · 10 lugares",
      rooms: [
        "Habitación 1 · 2 camas matrimoniales",
        "Habitación 2 · 4 camas individuales en 2 literas",
        "Habitación 3 · 1 cama matrimonial",
      ],
      amenities: "Las fotografías muestran sala, comedor, baño con ducha y vista hacia la alberca.",
      galleryLabel: "Galería de Dalia",
      photoAlts: [
        "Comedor de la cabaña Dalia junto a la alberca",
        "Sala de la cabaña Dalia",
        "Habitación con dos camas matrimoniales en Dalia",
        "Habitación con cuatro camas individuales en literas en Dalia",
        "Habitación con una cama matrimonial en Dalia",
        "Baño con ducha de la cabaña Dalia",
        "Segunda vista del baño con ducha de la cabaña Dalia",
      ],
      note: "El costo interno registrado es de $11,150 MXN por las dos noches; la asignación y el importe final por persona serán confirmados directamente.",
    },
    fr: {
      title: "Dalia",
      intro: "Une gîte lumineuse près de la piscine, avec trois chambres et dix couchages parfaitement identifiés.",
      capacity: "10 personnes",
      roomsLabel: "3 chambres",
      bedsLabel: "7 lits · 10 couchages",
      rooms: [
        "Chambre 1 · 2 lits doubles",
        "Chambre 2 · 4 lits simples dans 2 lits superposés",
        "Chambre 3 · 1 lit double",
      ],
      amenities: "Les photos montrent un salon, une salle à manger, une salle de bain avec douche et une vue vers la piscine.",
      galleryLabel: "Galerie de Dalia",
      photoAlts: [
        "Salle à manger du gîte Dalia près de la piscine",
        "Salon du gîte Dalia",
        "Chambre avec deux lits doubles dans Dalia",
        "Chambre avec quatre lits simples superposés dans Dalia",
        "Chambre avec un lit double dans Dalia",
        "Salle de bain avec douche de Dalia",
        "Deuxième vue de la salle de bain avec douche de Dalia",
      ],
      note: "Le coût interne enregistré est de 11 150 MXN pour les deux nuits ; l’attribution et le montant final par personne seront confirmés directement.",
    },
    en: {
      title: "Dalia",
      intro: "A bright cabin by the pool, with three bedrooms and ten perfectly identified sleeping spots.",
      capacity: "10 people",
      roomsLabel: "3 bedrooms",
      bedsLabel: "7 beds · 10 spots",
      rooms: [
        "Bedroom 1 · 2 double beds",
        "Bedroom 2 · 4 single beds in 2 bunk beds",
        "Bedroom 3 · 1 double bed",
      ],
      amenities: "The photos show a living room, dining room, bathroom with shower and a view toward the pool.",
      galleryLabel: "Dalia gallery",
      photoAlts: [
        "Dining room of the Dalia cabin by the pool",
        "Living room of the Dalia cabin",
        "Bedroom with two double beds in Dalia",
        "Bedroom with four single bunk beds in Dalia",
        "Bedroom with one double bed in Dalia",
        "Bathroom with shower of the Dalia cabin",
        "Second view of the bathroom with shower of the Dalia cabin",
      ],
      note: "The recorded internal cost is $11,150 MXN for the two nights; the assignment and final amount per person will be confirmed directly.",
    },
  },
  margarita: {
    key: "margarita",
    es: {
      title: "Margarita",
      intro: "Una cabaña alegre en tonos amarillos, con tres habitaciones, espacios comunes luminosos y jardín con fogatero.",
      capacity: "10 personas",
      roomsLabel: "3 habitaciones",
      bedsLabel: "7 camas · 10 lugares",
      rooms: [
        "Habitación 1 · 2 camas matrimoniales",
        "Habitación 2 · 4 camas individuales en 2 literas",
        "Habitación 3 · 1 cama matrimonial",
      ],
      amenities: "Las fotografías muestran sala-comedor, cocina con barra, baño con ducha, jardín y fogatero exterior.",
      galleryLabel: "Galería de Margarita",
      photoAlts: [
        "Área común interior de la cabaña Margarita",
        "Habitación con cuatro camas individuales en literas en Margarita",
        "Baño con ducha de la cabaña Margarita",
        "Habitación con dos camas matrimoniales en Margarita",
        "Cocina con barra de la cabaña Margarita",
        "Comedor de la cabaña Margarita",
        "Habitación con una cama matrimonial en Margarita",
        "Jardín y fogatero exterior de la cabaña Margarita",
      ],
      note: "El costo interno registrado es de $11,150 MXN por las dos noches; la asignación y el importe final por persona serán confirmados directamente.",
    },
    fr: {
      title: "Margarita",
      intro: "Une gîte joyeuse aux tons jaunes, avec trois chambres, des espaces communs lumineux et un jardin avec foyer extérieur.",
      capacity: "10 personnes",
      roomsLabel: "3 chambres",
      bedsLabel: "7 lits · 10 couchages",
      rooms: [
        "Chambre 1 · 2 lits doubles",
        "Chambre 2 · 4 lits simples dans 2 lits superposés",
        "Chambre 3 · 1 lit double",
      ],
      amenities: "Les photos montrent un salon-salle à manger, une cuisine avec comptoir, une salle de bain avec douche, un jardin et un foyer extérieur.",
      galleryLabel: "Galerie de Margarita",
      photoAlts: [
        "Espace commun intérieur du gîte Margarita",
        "Chambre avec quatre lits simples superposés dans Margarita",
        "Salle de bain avec douche de Margarita",
        "Chambre avec deux lits doubles dans Margarita",
        "Cuisine avec comptoir du gîte Margarita",
        "Salle à manger du gîte Margarita",
        "Chambre avec un lit double dans Margarita",
        "Jardin et foyer extérieur du gîte Margarita",
      ],
      note: "Le coût interne enregistré est de 11 150 MXN pour les deux nuits ; l’attribution et le montant final par personne seront confirmés directement.",
    },
    en: {
      title: "Margarita",
      intro: "A cheerful cabin in yellow tones, with three bedrooms, bright common spaces and a garden with an outdoor fire pit.",
      capacity: "10 people",
      roomsLabel: "3 bedrooms",
      bedsLabel: "7 beds · 10 spots",
      rooms: [
        "Bedroom 1 · 2 double beds",
        "Bedroom 2 · 4 single beds in 2 bunk beds",
        "Bedroom 3 · 1 double bed",
      ],
      amenities: "The photos show a living-dining room, kitchen with counter, bathroom with shower, garden and outdoor fire pit.",
      galleryLabel: "Margarita gallery",
      photoAlts: [
        "Interior common area of the Margarita cabin",
        "Bedroom with four single bunk beds in Margarita",
        "Bathroom with shower of the Margarita cabin",
        "Bedroom with two double beds in Margarita",
        "Kitchen with counter of the Margarita cabin",
        "Dining room of the Margarita cabin",
        "Bedroom with one double bed in Margarita",
        "Garden and outdoor fire pit of the Margarita cabin",
      ],
      note: "The recorded internal cost is $11,150 MXN for the two nights; the assignment and final amount per person will be confirmed directly.",
    },
  },
  wooden: {
    key: "wooden",
    es: {
      title: "Cabañas de madera 31–34",
      intro: "Cuatro cabañas independientes entre los árboles, ideales para parejas o familias pequeñas que quieren un espacio más íntimo.",
      capacity: "4 cabañas",
      roomsLabel: "2 adultos por unidad",
      bedsLabel: "Hasta 2 menores",
      rooms: [
        "Unidades disponibles · 31, 32, 33 y 34",
        "Cada unidad · 1 cama king size",
        "Cada unidad · 1 sofá cama matrimonial",
      ],
      amenities: "Las fotografías y el video muestran terraza, refrigerador, lavabo, televisión y un interior completamente revestido de madera.",
      galleryLabel: "Galería de las cabañas de madera 31 a 34",
      photoAlts: [
        "Exterior de una cabaña de madera entre los árboles",
        "Entrada de la cabaña de madera número 34",
        "Cama king size dentro de una cabaña de madera",
        "Sofá cama y equipamiento interior de una cabaña de madera",
      ],
      videoLabel: "Recorrido en video · 16 s",
      note: "Tarifa interna por unidad y por las dos noches: $5,310 MXN para 2 adultos, o $5,790 MXN para 2 adultos y 2 menores. Confirmaremos directamente la asignación y el importe final.",
    },
    fr: {
      title: "Gîtes en bois 31–34",
      intro: "Quatre gîtes indépendantes sous les arbres, idéales pour les couples ou petites familles qui souhaitent un espace plus intime.",
      capacity: "4 gîtes",
      roomsLabel: "2 adultes par unité",
      bedsLabel: "Jusqu’à 2 mineurs",
      rooms: [
        "Unités disponibles · 31, 32, 33 et 34",
        "Dans chaque unité · 1 lit king size",
        "Dans chaque unité · 1 canapé-lit double",
      ],
      amenities: "Les photos et la vidéo montrent une terrasse, un réfrigérateur, un lavabo, une télévision et un intérieur entièrement habillé de bois.",
      galleryLabel: "Galerie des gîtes en bois 31 à 34",
      photoAlts: [
        "Extérieur d’un gîte en bois sous les arbres",
        "Entrée du gîte en bois numéro 34",
        "Lit king size dans un gîte en bois",
        "Canapé-lit et équipements intérieurs d’un gîte en bois",
      ],
      videoLabel: "Visite vidéo · 16 s",
      note: "Tarif interne par unité pour les deux nuits : 5 310 MXN pour 2 adultes, ou 5 790 MXN pour 2 adultes et 2 mineurs. Nous confirmerons directement l’attribution et le montant final.",
    },
    en: {
      title: "Wooden cabins 31–34",
      intro: "Four independent cabins among the trees, ideal for couples or small families who want a more intimate space.",
      capacity: "4 cabins",
      roomsLabel: "2 adults per unit",
      bedsLabel: "Up to 2 children",
      rooms: [
        "Available units · 31, 32, 33 and 34",
        "Each unit · 1 king-size bed",
        "Each unit · 1 double sofa bed",
      ],
      amenities: "The photos and video show a terrace, refrigerator, sink, television and a fully wood-lined interior.",
      galleryLabel: "Gallery of wooden cabins 31 to 34",
      photoAlts: [
        "Exterior of a wooden cabin among the trees",
        "Entrance of wooden cabin number 34",
        "King-size bed inside a wooden cabin",
        "Sofa bed and interior equipment of a wooden cabin",
      ],
      videoLabel: "Video tour · 16 s",
      note: "Internal rate per unit for the two nights: $5,310 MXN for 2 adults, or $5,790 MXN for 2 adults and 2 children. We will confirm the assignment and final amount directly.",
    },
  },
};

// Map showcase keys to the `cabins` collection document IDs.
const SHOWCASE_TO_CABIN_DOC = {
  azalea: "VILLA AZALEA",
  dalia: "VILLA DALIA",
  margarita: "VILLA MARGARITA",
  wooden: "CABAÑA 1", // The wooden showcase covers units 31–34; stored on CABAÑA 1.
};

async function main() {
  console.log("Migrating cabin showcase data to Firestore `cabins` collection…");

  for (const [key, showcase] of Object.entries(SHOWCASE)) {
    const docId = SHOWCASE_TO_CABIN_DOC[key];
    if (!docId) {
      console.warn(`  ⚠ No cabin doc mapped for showcase key "${key}", skipping`);
      continue;
    }

    const cloudinaryIds = (CABIN_PHOTOS[key] || []).join(",");
    const ref = db.collection("cabins").doc(docId);

    // Merge the showcase + cloudinaryIds into the existing cabin doc without
    // touching the operational booking/pricing fields.
    await ref.set(
      {
        showcase: {
          es: { ...showcase.es, key },
          fr: { ...showcase.fr, key },
          en: { ...showcase.en, key },
        },
        cloudinaryIds,
        _showcaseMigratedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    console.log(`  ✓ ${docId} (${key}) — ${cloudinaryIds.split(",").length} photos`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
