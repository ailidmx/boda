/**
 * Seed the Firestore `guests` collection from the static guest data.
 *
 * Usage:
 *   node scripts/seed-guests.mjs
 *
 * Requires:
 *   - A Firebase service-account key in FIREBASE_SERVICE_ACCOUNT env var
 *     or at ~/.firebase/boda-500805-service-account.json
 *   - firebase-admin installed (npm install firebase-admin)
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Try to load service account from various locations
const possiblePaths = [
  process.env.FIREBASE_SERVICE_ACCOUNT,
  `${homedir()}/.firebase/boda-500805-service-account.json`,
  `${homedir()}/.firebase/boda-500805.json`,
];

let serviceAccount = null;
for (const p of possiblePaths) {
  if (p && existsSync(p)) {
    serviceAccount = JSON.parse(readFileSync(p, "utf-8"));
    break;
  }
}

if (!serviceAccount) {
  console.error(
    "No service account found. Set FIREBASE_SERVICE_ACCOUNT env var or place the key at ~/.firebase/boda-500805-service-account.json"
  );
  process.exit(1);
}

const admin = require("firebase-admin");

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "boda-500805",
});

const db = admin.firestore();

// ── Guest data (copied from guests.js) ──────────────────────────────────

const GUESTS = [
  // ── Novios ──
  { id: "david",       firstName: "David",     lastName: "Aïli",         group: "Novios",       hasCabin: true,  unit: "hortencia", occupancy: "privada",   payment: "pagada",   cabinLabel: "Hortencia", isNovio: true },
  { id: "ayde",        firstName: "Aydé",      lastName: "Juárez",       group: "Novios",       hasCabin: true,  unit: "hortencia", occupancy: "privada",   payment: "pagada",   cabinLabel: "Hortencia", isNovio: true },

  // ── Petanclub GDL ──
  { id: "sebastien",   firstName: "Sébastien", lastName: "Cécillon",     group: "PetanclubGDL", hasCabin: false },
  { id: "moni",        firstName: "Moni",      lastName: "Quezada",      group: "PetanclubGDL", hasCabin: false },
  { id: "iyali",       firstName: "Iyali",     lastName: "Cécillon",     group: "PetanclubGDL", hasCabin: false },
  { id: "amelie",      firstName: "Amélie",    lastName: "Cécillon",     group: "PetanclubGDL", hasCabin: false },
  { id: "pierre_w",    firstName: "Pierre",    lastName: "Wanecque",     group: "PetanclubGDL", hasCabin: false },
  { id: "monica_g",    firstName: "Mónica",    lastName: "García",       group: "PetanclubGDL", hasCabin: false },
  { id: "emmanuel",    firstName: "Emmanuel",  lastName: "Jourdain",     group: "PetanclubGDL", hasCabin: false },
  { id: "carolina",    firstName: "Carolina",  lastName: "Saldaña",      group: "PetanclubGDL", hasCabin: false },
  { id: "julien_b",    firstName: "Julien",    lastName: "Bac",          group: "PetanclubGDL", hasCabin: false },
  { id: "javier",      firstName: "Javier",    lastName: "Etcheverria",  group: "PetanclubGDL", hasCabin: false },
  { id: "fabian",      firstName: "Fabian",    lastName: "Castellanos",  group: "PetanclubGDL", hasCabin: false },
  { id: "diego_h",     firstName: "Diego",     lastName: "Hernández",    group: "PetanclubGDL", hasCabin: false },
  { id: "esposa_diego",firstName: "Esposa",    lastName: "de Diego",     group: "PetanclubGDL", hasCabin: false },
  { id: "tania_g",     firstName: "Tania",     lastName: "Gallardo",     group: "PetanclubGDL", hasCabin: false },
  { id: "ana_f",       firstName: "Ana",       lastName: "Farías",       group: "PetanclubGDL", hasCabin: false },
  { id: "marcia",      firstName: "Marcia",    lastName: "",             group: "PetanclubGDL", hasCabin: false },
  { id: "charles",     firstName: "Charles",   lastName: "Pinet",        group: "PetanclubGDL", hasCabin: false },
  { id: "dylan",       firstName: "Dylan",     lastName: "Maringolo",    group: "PetanclubGDL", hasCabin: false },
  { id: "aldo_diaz",   firstName: "Aldo",      lastName: "Díaz de Sandi", group: "PetanclubGDL", hasCabin: false },
  { id: "iopoch",      firstName: "Iopoch",    lastName: "Díaz de Sandi", group: "PetanclubGDL", hasCabin: false },
  { id: "esposa_iopoch", firstName: "Esposa",  lastName: "de Iopoch",    group: "PetanclubGDL", hasCabin: false },
  { id: "hija_diaz",   firstName: "Hija",      lastName: "Díaz de Sandi", group: "PetanclubGDL", hasCabin: false },
  { id: "santino",     firstName: "Santino",   lastName: "Díaz de Sandi", group: "PetanclubGDL", hasCabin: false },
  { id: "manu_v",      firstName: "Manu",      lastName: "Vázquez",      group: "PetanclubGDL", hasCabin: false },
  { id: "novia_v",     firstName: "Novia",     lastName: "Vázquez",      group: "PetanclubGDL", hasCabin: false },
  { id: "ro_arana",    firstName: "Ro",        lastName: "Arana",         group: "PetanclubGDL", hasCabin: false },
  { id: "mariana",     firstName: "Mariana",   lastName: "",              group: "PetanclubGDL", hasCabin: false },
  { id: "edward",      firstName: "Edward",    lastName: "",              group: "PetanclubGDL", hasCabin: false },
  { id: "clement",     firstName: "Clément",   lastName: "Diguet",       group: "PetanclubGDL", hasCabin: false },
  { id: "esposa_clement", firstName: "Esposa", lastName: "de Clément",   group: "PetanclubGDL", hasCabin: false },
  { id: "denis",       firstName: "Denis",     lastName: "",              group: "PetanclubGDL", hasCabin: false },
  { id: "esposa_denis",firstName: "Esposa",    lastName: "de Denis",     group: "PetanclubGDL", hasCabin: false },

  // ── Rako family — Dalia ──
  { id: "mika",        firstName: "Mika",      lastName: "Rako",          group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "corine",      firstName: "Corine",    lastName: "Rako",          group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "livier",      firstName: "Livier",    lastName: "Rako",          group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "cathy",       firstName: "Cathy",     lastName: "Rako",          group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "morgane",     firstName: "Morgane",   lastName: "Rako",          group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "esposo_corine", firstName: "Esposo",  lastName: "de Corine",     group: "PetanclubGDL", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },

  // ── Pintura — Dalia ──
  { id: "abraham",     firstName: "Abraham",   lastName: "Burciaga",      group: "Pintura", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "mauricio",    firstName: "Mauricio",  lastName: "Vargas",        group: "Pintura", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "esposa_mauricio", firstName: "Esposa", lastName: "de Mauricio", group: "Pintura", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },
  { id: "erik_m",      firstName: "Erik",      lastName: "Montañez",      group: "Pintura", hasCabin: true,  unit: "dalia",    occupancy: "compartida", payment: "porpagar", cabinLabel: "Dalia" },

  // ── Amigos de Aydé — Margarita ──
  { id: "adriana_m",   firstName: "Adriana",   lastName: "Martínez",      group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "fernanda",    firstName: "Fernanda",  lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "adriana_a",   firstName: "Adriana",   lastName: "Agris",         group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "susana",      firstName: "Susana",    lastName: "Díaz",          group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "gabriela",    firstName: "Gabriela",  lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "tania_a",     firstName: "Tania",     lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "aili_a",      firstName: "Aili",      lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "natalia",     firstName: "Natalia",   lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "ismael",      firstName: "Ismael",    lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },
  { id: "lupita",      firstName: "Lupita",    lastName: "",              group: "Amigos de Aydé", hasCabin: true,  unit: "margarita", occupancy: "compartida", payment: "porpagar", cabinLabel: "Margarita" },

  // ── Golden — Cabaña 5 ──
  { id: "diego_s",     firstName: "Diego",     lastName: "Salmerón",      group: "Golden", hasCabin: true,  unit: "cabana_5",  occupancy: "compartida", payment: "porpagar", cabinLabel: "Cabaña 5" },
  { id: "andrea_s",    firstName: "Andrea",    lastName: "de Salmerón",   group: "Golden", hasCabin: true,  unit: "cabana_5",  occupancy: "compartida", payment: "porpagar", cabinLabel: "Cabaña 5" },
  { id: "samuel",      firstName: "Samuel",    lastName: "López",         group: "Golden", hasCabin: true,  unit: "cabana_5",  occupancy: "compartida", payment: "porpagar", cabinLabel: "Cabaña 5" },
  { id: "rodrigo",     firstName: "Rodrigo",   lastName: "",              group: "Golden", hasCabin: true,  unit: "cabana_5",  occupancy: "compartida", payment: "porpagar", cabinLabel: "Cabaña 5" },
  { id: "aldo_g",      firstName: "Aldo",      lastName: "",              group: "Golden", hasCabin: true,  unit: "cabana_5",  occupancy: "compartida", payment: "porpagar", cabinLabel: "Cabaña 5" },

  // ── Pintura — Casona ──
  { id: "victor_s",    firstName: "Victor",    lastName: "Segoviano",     group: "Pintura", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },
  { id: "esposa_victor", firstName: "Esposa",  lastName: "de Victor",     group: "Pintura", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },
  { id: "juan_i",      firstName: "Juan Ignacio", lastName: "Sánchez",    group: "Pintura", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },
  { id: "esposa_juan", firstName: "Esposa",    lastName: "de Juan",       group: "Pintura", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },

  // ── Amigos de Aydé — Casona ──
  { id: "fabiola",     firstName: "Fabiola",   lastName: "García",        group: "Amigos de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },
  { id: "pablo_g",     firstName: "Pablo",     lastName: "García",        group: "Amigos de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "porpagar", cabinLabel: "Casona" },

  // ── Amigos de David ──
  { id: "benjamin",    firstName: "Benjamin",  lastName: "Bert",          group: "Amigos de David", hasCabin: false },
  { id: "raoul",       firstName: "Raoul",     lastName: "Le Bas",        group: "Amigos de David", hasCabin: false },
  { id: "cynthia",     firstName: "Cynthia",   lastName: "Cobarrubias",   group: "Amigos de David", hasCabin: false },
  { id: "tristan",     firstName: "Tristan",   lastName: "",              group: "Amigos de David", hasCabin: true,  unit: "cabana_6",  occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña 6" },
  { id: "yari",        firstName: "Yari",      lastName: "",              group: "Amigos de David", hasCabin: true,  unit: "cabana_6",  occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña 6" },
  { id: "spomenka",    firstName: "Spomenka",  lastName: "Petrovic",      group: "Amigos de David", hasCabin: true,  unit: "madera_31", occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña de madera 31" },
  { id: "guilhem",     firstName: "Guilhem",   lastName: "Petrovic",      group: "Amigos de David", hasCabin: true,  unit: "madera_31", occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña de madera 31" },
  { id: "dimitar",     firstName: "Dimitar",   lastName: "",              group: "Amigos de David", hasCabin: true,  unit: "madera_33", occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña de madera 33" },
  { id: "dimitar_plus",firstName: "Acompañante", lastName: "de Dimitar", group: "Amigos de David", hasCabin: true,  unit: "madera_33", occupancy: "privada",   payment: "porpagar", cabinLabel: "Cabaña de madera 33" },

  // ── Familia de David — Cabaña 4 ──
  { id: "catherine",   firstName: "Catherine", lastName: "Lemery",        group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "jean_pierre", firstName: "Jean-Pierre", lastName: "Rigollet",   group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "stephane_a",  firstName: "Stéphane",  lastName: "Aïli",         group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "wendy",       firstName: "Wendy",     lastName: "Aïli",          group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "hugo",        firstName: "Hugo",      lastName: "Aïli",          group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "lisa",        firstName: "Lisa",      lastName: "Aïli",          group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "diego_aili",  firstName: "Diego",     lastName: "Aïli Vázquez",  group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },
  { id: "oscar_aili",  firstName: "Oscar",     lastName: "Aïli Vázquez",  group: "Familia de David", hasCabin: true,  unit: "cabana_4",  occupancy: "compartida", payment: "pagada",   cabinLabel: "Cabaña 4" },

  // ── Familia de David — Azalea ──
  { id: "christophe_r",firstName: "Christophe",lastName: "Rigollet",     group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "brigitte",    firstName: "Brigitte",  lastName: "Lemery",        group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "jacques",     firstName: "Jacques",   lastName: "Lemery",        group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "cyrielle",    firstName: "Cyrielle",  lastName: "Rigollet",      group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "julien_r",    firstName: "Julien",    lastName: "Rigollet",      group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "myriam",      firstName: "Myriam",    lastName: "Lefranc",       group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "fabrice",     firstName: "Fabrice",   lastName: "Aïli",          group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },
  { id: "mireille_r",  firstName: "Mireille",  lastName: "Rives",         group: "Familia de David", hasCabin: true,  unit: "azalea",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Azalea" },

  // ── Familia de David — Madera 34 ──
  { id: "thierry",     firstName: "Thierry",   lastName: "Aïli",          group: "Familia de David", hasCabin: true,  unit: "madera_34", occupancy: "privada",   payment: "pagada",   cabinLabel: "Cabaña de madera 34" },
  { id: "josephine",   firstName: "Joséphine", lastName: "Rosa",          group: "Familia de David", hasCabin: true,  unit: "madera_34", occupancy: "privada",   payment: "pagada",   cabinLabel: "Cabaña de madera 34" },

  // ── Familia de David — Madera 32 ──
  { id: "francois",    firstName: "François",  lastName: "Lemery",        group: "Familia de David", hasCabin: true,  unit: "madera_32", occupancy: "privada",   payment: "pagada",   cabinLabel: "Cabaña de madera 32" },
  { id: "mireille_l",  firstName: "Mireille",  lastName: "Lemery",        group: "Familia de David", hasCabin: true,  unit: "madera_32", occupancy: "privada",   payment: "pagada",   cabinLabel: "Cabaña de madera 32" },

  // ── Familia de Aydé — Casona ──
  { id: "elvira",      firstName: "Elvira",    lastName: "Guadalupe",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "eduardo",     firstName: "Eduardo",   lastName: "de Guadalupe",  group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "sofia_g",     firstName: "Sofía",     lastName: "de Guadalupe",  group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "jesus_g",     firstName: "Jesús",     lastName: "de Guadalupe",  group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "mama_tina",   firstName: "Mamá Tina", lastName: "Guadalupe",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "papa_kao",    firstName: "Papá Kao",  lastName: "Guadalupe",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "isabel",      firstName: "Isabel",    lastName: "Guadalupe",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "diana_r",     firstName: "Diana",     lastName: "Ramírez",       group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "noel_omar",   firstName: "Noel Omar", lastName: "Guadalupe",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "carmen_j",    firstName: "Carmen",    lastName: "de Juárez",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "yadira",      firstName: "Yadira",    lastName: "de Juárez",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "valentina",   firstName: "Valentina", lastName: "de Juárez",     group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "jaime",       firstName: "Jaime",     lastName: "Juárez",        group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "irma",        firstName: "Irma",      lastName: "Juárez",        group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "erik",        firstName: "Erik",      lastName: "",              group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "esposa_erik", firstName: "Esposa",    lastName: "de Erik",       group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "olaf",        firstName: "Olaf",      lastName: "",              group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },
  { id: "novio_olaf",  firstName: "Novio",     lastName: "de Olaf",       group: "Familia de Aydé", hasCabin: true,  unit: "casona",   occupancy: "compartida", payment: "pagada",   cabinLabel: "Casona" },

  // ── Sin cabaña ──
  { id: "manuel_a",    firstName: "Manuel",    lastName: "Amezcua",       group: "Amigos de Aydé", hasCabin: false },
  { id: "sian",        firstName: "Sian",      lastName: "Habell-Aïli",   group: "Familia de David", hasCabin: false },
  { id: "robin",       firstName: "Robin",     lastName: "Green",         group: "Familia de David", hasCabin: false },
  { id: "mael_h",      firstName: "Mael",      lastName: "Habell-Aïli",   group: "Familia de David", hasCabin: false },
  { id: "sophie",      firstName: "Sophie",    lastName: "Petot-Rosa",    group: "Familia de David", hasCabin: false },
  { id: "thomas_l",    firstName: "Thomas",    lastName: "Lesbros",       group: "Familia de David", hasCabin: false },
  { id: "pierre_s",    firstName: "Pierre",    lastName: "Soubeyrat",     group: "Familia de David", hasCabin: false },
  { id: "sebastien_p", firstName: "Sebastien", lastName: "Passelande",    group: "Familia de David", hasCabin: false },
  { id: "frederic_b",  firstName: "Frederic",  lastName: "Bousquet",      group: "38 Tonnes", hasCabin: false },
  { id: "chang",       firstName: "Chang",     lastName: "Tao",           group: "38 Tonnes", hasCabin: false },
  { id: "krystel",     firstName: "Krystel",   lastName: "Vazquez",       group: "Amigos de David", hasCabin: false },
  { id: "diego_henao", firstName: "Diego",     lastName: "Henao",         group: "Amigos de David", hasCabin: false },
  { id: "ana_garcia",  firstName: "Ana",       lastName: "García",        group: "Amigos de David", hasCabin: false },
  { id: "pierre_bert", firstName: "Pierre",    lastName: "Berthelon",     group: "Amigos de David", hasCabin: false },
  { id: "titis",       firstName: "Titis",     lastName: "Berthelon",     group: "Amigos de David", hasCabin: false },
  { id: "