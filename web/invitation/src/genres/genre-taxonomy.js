/**
 * Curated music genre taxonomy for the genre survey.
 *
 * This is the app's OWN curated catalog — the source of truth for the genres
 * guests can rate. It is deliberately rich in Mexican Regional and
 * Serbian/Balkan music because those are the two cultural pillars of the
 * event, while still covering the international catalog broadly.
 *
 * Design principles (see docs/HUMAN_WANTS.md "Expand the Music Genre Survey"):
 *
 *  1. HIERARCHY — genres are not a flat array. Each genre has a `parentId`
 *     linking it to a category, so the data model preserves relationships
 *     (e.g. "Son huasteco" → "Son / Regional traditions" → "Música Mexicana").
 *
 *  2. TIERS — every genre is classified as:
 *       PRIMARY     shown immediately in the survey
 *       SECONDARY   nested/collapsed beneath a category (expandable)
 *       SEARCH_ONLY available through extended search but not shown initially
 *     This gives an exhaustive database without an exhausting interface.
 *
 *  3. ALIASES — each genre may carry alternate spellings/names so search is
 *     alias-aware and we never create a duplicate genre for a variant spelling
 *     (e.g. "tex mex" → "Tejano", "huapango huasteco" → "Son huasteco").
 *
 *  4. STABLE IDS — curated genre ids are stable and independent of MusicBrainz.
 *     MusicBrainz is only a fallback/expansion layer for obscure genres.
 *
 *  5. PARENT/SUBGENRE INDEPENDENCE — a guest may rate a parent and its
 *     children independently (e.g. love "Norteño" but dislike "Corridos").
 *     A parent rating never overwrites a child's rating.
 *
 * The UI reads this module directly (no network). MusicBrainz is consulted
 * only when the guest searches for a genre not in this catalog.
 */

/**
 * Normalize a string for accent-insensitive, case-insensitive matching.
 * Strips diacritics (é→e, č→c, ñ→n) and lowercases.
 * @param {string} value
 * @returns {string}
 */
export function normalizeGenre(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * A single curated genre.
 * @typedef {Object} Genre
 * @property {string} id          stable, unique id (e.g. "mx-son-huasteco")
 * @property {string} name        human-readable display name (proper spelling)
 * @property {string[]} [aliases] alternate names/spellings for search
 * @property {string} [parentId]  id of the parent category genre
 * @property {string} [region]    "Mexico" | "Serbia/Balkans" | "Latin" | ...
 * @property {boolean} curated    always true for this catalog
 * @property {string} tier        "PRIMARY" | "SECONDARY" | "SEARCH_ONLY"
 */

/**
 * The curated genre catalog, grouped by category. Each category is itself a
 * genre (so it can be rated) with `children` holding its subgenres.
 *
 * @type {Genre[]}
 */
export const GENRES = [
  // ── Música Mexicana / Regional Mexicano ────────────────────────────────
  {
    id: "mx",
    name: "Música Mexicana",
    aliases: ["Regional Mexicano", "Regional Mexican", "Música mexicana", "Mexican music"],
    region: "Mexico",
    curated: true,
    tier: "PRIMARY",
    children: [
      // Mariachi & Ranchera
      {
        id: "mx-mariachi-ranchera",
        name: "Mariachi & Ranchera",
        aliases: ["Mariachi y Ranchera"],
        region: "Mexico",
        curated: true,
        tier: "PRIMARY",
        children: [
          { id: "mx-mariachi", name: "Mariachi", aliases: ["Mariachi tradicional"], region: "Mexico", curated: true, tier: "PRIMARY" },
          { id: "mx-mariachi-moderno", name: "Mariachi moderno", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-ranchera", name: "Ranchera", region: "Mexico", curated: true, tier: "PRIMARY" },
        ],
      },
      // Norteño
      {
        id: "mx-norteno",
        name: "Norteño",
        aliases: ["Norteño tradicional", "Norteno"],
        region: "Mexico",
        curated: true,
        tier: "PRIMARY",
        children: [
          { id: "mx-norteno-sax", name: "Norteño con sax", aliases: ["Norteño sax"], region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-norteno-tuba", name: "Norteño con tuba", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-norteno-banda", name: "Norteño-Banda", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-norteno-sinaloense", name: "Norteño sinaloense", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-norteno-regiomontano", name: "Norteño regiomontano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-norteno-tumbado", name: "Norteño tumbado", aliases: ["Norteño urbano"], region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Banda
      {
        id: "mx-banda",
        name: "Banda",
        aliases: ["Banda sinaloense"],
        region: "Mexico",
        curated: true,
        tier: "PRIMARY",
        children: [
          { id: "mx-banda-sinaloense", name: "Banda sinaloense", region: "Mexico", curated: true, tier: "PRIMARY" },
          { id: "mx-banda-tradicional", name: "Banda tradicional", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-banda-romantica", name: "Banda romántica", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-banda-moderna", name: "Banda moderna", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-tecnobanda", name: "Tecnobanda", aliases: ["Quebradita", "Technobanda"], region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Corridos
      {
        id: "mx-corridos",
        name: "Corridos",
        region: "Mexico",
        curated: true,
        tier: "PRIMARY",
        children: [
          { id: "mx-corrido-tradicional", name: "Corrido tradicional", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-corridos-nortenos", name: "Corridos norteños", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-corridos-modernos", name: "Corridos modernos", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-corridos-tumbados", name: "Corridos tumbados", region: "Mexico", curated: true, tier: "PRIMARY" },
          { id: "mx-corridos-belicos", name: "Corridos bélicos", region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Sierreño
      {
        id: "mx-sierreno",
        name: "Sierreño",
        aliases: ["Sierreño sinaloense"],
        region: "Mexico",
        curated: true,
        tier: "SECONDARY",
        children: [
          { id: "mx-sierreno-sinaloense", name: "Sierreño sinaloense", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-sierreno-guerrerense", name: "Sierreño guerrerense", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-sierreno-acordeon", name: "Sierreño con acordeón", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-sierreno-tuba", name: "Sierreño con tuba", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-sierreno-tumbado", name: "Sierreño tumbado", aliases: ["Sierreño urbano"], region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Grupero & related
      {
        id: "mx-grupero",
        name: "Grupero",
        aliases: ["Romántica grupera"],
        region: "Mexico",
        curated: true,
        tier: "SECONDARY",
        children: [
          { id: "mx-romantica-grupera", name: "Romántica grupera", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-duranguense", name: "Duranguense", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-tejano", name: "Tejano", aliases: ["Tex-Mex", "Tex mex", "Tejano / Tex-Mex"], region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Son / Regional traditions
      {
        id: "mx-son",
        name: "Son / Tradiciones regionales",
        aliases: ["Son mexicano", "Música regional mexicana"],
        region: "Mexico",
        curated: true,
        tier: "SECONDARY",
        children: [
          { id: "mx-son-mexicano", name: "Son mexicano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-jalisciense", name: "Son jalisciense", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-jarocho", name: "Son jarocho", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-huasteco", name: "Son huasteco", aliases: ["Huapango huasteco"], region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-calentano", name: "Son calentano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-istmeno", name: "Son istmeño", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-son-mariachi", name: "Son de mariachi", region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Other regional traditions
      {
        id: "mx-regional-traditions",
        name: "Otras tradiciones regionales",
        region: "Mexico",
        curated: true,
        tier: "SECONDARY",
        children: [
          { id: "mx-huapango", name: "Huapango", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-tamborazo", name: "Tamborazo zacatecano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-tierra-caliente", name: "Tierra Caliente", aliases: ["Música calentana"], region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-chilena", name: "Chilena", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-marimba-chiapaneca", name: "Marimba chiapaneca", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-tamborileros", name: "Tamborileros tabasqueños", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-jarana-yucateca", name: "Jarana yucateca", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-trova-yucateca", name: "Trova yucateca", region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
      // Mexican dance/popular crossover
      {
        id: "mx-crossover",
        name: "Baile y crossover popular",
        region: "Mexico",
        curated: true,
        tier: "SECONDARY",
        children: [
          { id: "mx-cumbia-mexicana", name: "Cumbia mexicana", region: "Mexico", curated: true, tier: "PRIMARY" },
          { id: "mx-cumbia-sonidera", name: "Cumbia sonidera", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-cumbia-nortena", name: "Cumbia norteña", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-cumbia-rebajada", name: "Cumbia rebajada", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-cumbia-tropical", name: "Cumbia tropical", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-mambo", name: "Mambo", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-danzon", name: "Danzón", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-bolero", name: "Bolero mexicano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-balada-romantica", name: "Balada romántica mexicana", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-rock-espanol", name: "Rock en español mexicano", region: "Mexico", curated: true, tier: "SECONDARY" },
          { id: "mx-pop", name: "Pop mexicano", region: "Mexico", curated: true, tier: "SECONDARY" },
        ],
      },
    ],
  },

  // ── Serbian / Balkan ───────────────────────────────────────────────────
  {
    id: "balkan",
    name: "Serbia / Balcanes",
    aliases: ["Serbian / Balkan", "Balkan", "Serbia", "Balcanes"],
    region: "Serbia/Balkans",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "balkan-serbian-folk", name: "Serbian Folk", aliases: ["Srpska narodna muzika", "Serbian traditional"], region: "Serbia/Balkans", curated: true, tier: "PRIMARY" },
      { id: "balkan-kolo", name: "Kolo", region: "Serbia/Balkans", curated: true, tier: "PRIMARY" },
      { id: "balkan-cocek", name: "Čoček", aliases: ["Cocek", "Cöcek"], region: "Serbia/Balkans", curated: true, tier: "PRIMARY" },
      { id: "balkan-brass", name: "Balkan Brass", aliases: ["Balkan brass band"], region: "Serbia/Balkans", curated: true, tier: "PRIMARY" },
      { id: "balkan-romani", name: "Romani / Balkan Romani", aliases: ["Romani music", "Gypsy music"], region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-exyu-folk", name: "Ex-Yugoslav Folk", aliases: ["Ex-Yu folk"], region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-turbo-folk", name: "Turbo-folk", aliases: ["Turbo folk"], region: "Serbia/Balkans", curated: true, tier: "PRIMARY" },
      { id: "balkan-starogradska", name: "Starogradska muzika", region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-sevdalinka", name: "Sevdalinka", region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-folk", name: "Balkan folk", region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-pop", name: "Balkan pop", region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
      { id: "balkan-exyu-rock", name: "Ex-Yugoslav rock", aliases: ["Ex-Yu rock"], region: "Serbia/Balkans", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Latin / Caribbean ──────────────────────────────────────────────────
  {
    id: "latin",
    name: "Latina / Caribe",
    aliases: ["Latin", "Latino", "Caribbean"],
    region: "Latin",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "lat-cumbia", name: "Cumbia", region: "Latin", curated: true, tier: "PRIMARY" },
      { id: "lat-salsa", name: "Salsa", region: "Latin", curated: true, tier: "PRIMARY" },
      { id: "lat-bachata", name: "Bachata", region: "Latin", curated: true, tier: "PRIMARY" },
      { id: "lat-reggaeton", name: "Reggaetón", aliases: ["Reggaeton"], region: "Latin", curated: true, tier: "PRIMARY" },
      { id: "lat-merengue", name: "Merengue", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-son-cubano", name: "Son cubano", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-salsa-romantica", name: "Salsa romántica", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-timba", name: "Timba", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-cubaton", name: "Cubatón", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-dembow", name: "Dembow", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-vallenato", name: "Vallenato", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-tango", name: "Tango", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-bossa-nova", name: "Bossa nova", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-samba", name: "Samba", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-reggae", name: "Reggae", region: "Latin", curated: true, tier: "SECONDARY" },
      { id: "lat-dancehall", name: "Dancehall", region: "Latin", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Rock / Pop / Indie ─────────────────────────────────────────────────
  {
    id: "rock-pop",
    name: "Rock / Pop / Indie",
    aliases: ["Rock", "Pop", "Indie"],
    region: "International",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "rp-rock", name: "Rock", region: "International", curated: true, tier: "PRIMARY" },
      { id: "rp-pop", name: "Pop", region: "International", curated: true, tier: "PRIMARY" },
      { id: "rp-indie", name: "Indie", aliases: ["Indie rock", "Indie pop"], region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-classic-rock", name: "Classic rock", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-hard-rock", name: "Hard rock", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-metal", name: "Metal", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-punk", name: "Punk", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-grunge", name: "Grunge", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-alternative", name: "Alternative", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-pop-rock", name: "Pop rock", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-synthpop", name: "Synthpop", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-new-wave", name: "New wave", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-folk-rock", name: "Folk rock", region: "International", curated: true, tier: "SECONDARY" },
      { id: "rp-singer-songwriter", name: "Singer-songwriter", region: "International", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Electronic / Dance ─────────────────────────────────────────────────
  {
    id: "electronic",
    name: "Electrónica / Baile",
    aliases: ["Electronic", "Dance", "EDM"],
    region: "International",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "edm-techno", name: "Techno", region: "International", curated: true, tier: "PRIMARY" },
      { id: "edm-house", name: "House", region: "International", curated: true, tier: "PRIMARY" },
      { id: "edm-electronic", name: "Electrónica", aliases: ["Electronic"], region: "International", curated: true, tier: "PRIMARY" },
      { id: "edm-edm", name: "EDM", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-trance", name: "Trance", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-dubstep", name: "Dubstep", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-drum-bass", name: "Drum and bass", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-techno-minimal", name: "Minimal techno", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-disco", name: "Disco", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-funk", name: "Funk", region: "International", curated: true, tier: "SECONDARY" },
      { id: "edm-synthwave", name: "Synthwave", region: "International", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Hip-hop / R&B / Soul ───────────────────────────────────────────────
  {
    id: "hiphop",
    name: "Hip-hop / R&B / Soul",
    aliases: ["Hip hop", "R&B", "Soul"],
    region: "International",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "hh-hiphop", name: "Hip-hop", aliases: ["Hip hop"], region: "International", curated: true, tier: "PRIMARY" },
      { id: "hh-rnb", name: "R&B", region: "International", curated: true, tier: "PRIMARY" },
      { id: "hh-soul", name: "Soul", region: "International", curated: true, tier: "SECONDARY" },
      { id: "hh-funk", name: "Funk", region: "International", curated: true, tier: "SECONDARY" },
      { id: "hh-trap", name: "Trap", region: "International", curated: true, tier: "SECONDARY" },
      { id: "hh-drill", name: "Drill", region: "International", curated: true, tier: "SECONDARY" },
      { id: "hh-afrobeats", name: "Afrobeats", region: "International", curated: true, tier: "SECONDARY" },
      { id: "hh-neo-soul", name: "Neo-soul", region: "International", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Jazz / Blues / World ───────────────────────────────────────────────
  {
    id: "jazz-world",
    name: "Jazz / Blues / World",
    aliases: ["Jazz", "Blues", "World music"],
    region: "International",
    curated: true,
    tier: "SECONDARY",
    children: [
      { id: "jw-jazz", name: "Jazz", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-blues", name: "Blues", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-swing", name: "Swing", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-lounge", name: "Lounge", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-bossa", name: "Bossa nova", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-world", name: "World music", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-folk", name: "Folk", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-celtic", name: "Celtic", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-flamenco", name: "Flamenco", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-fado", name: "Fado", region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-chanson", name: "Chanson française", aliases: ["Música francesa", "French music"], region: "International", curated: true, tier: "SECONDARY" },
      { id: "jw-french-pop", name: "French pop", region: "International", curated: true, tier: "SECONDARY" },
    ],
  },

  // ── Decades / Party ────────────────────────────────────────────────────
  {
    id: "party",
    name: "Décadas / Fiesta",
    aliases: ["Decades", "Party", "Fiesta"],
    region: "International",
    curated: true,
    tier: "PRIMARY",
    children: [
      { id: "pt-80s", name: "Música de los 80", aliases: ["80s", "Eighties"], region: "International", curated: true, tier: "PRIMARY" },
      { id: "pt-90s", name: "Música de los 90", aliases: ["90s", "Nineties"], region: "International", curated: true, tier: "PRIMARY" },
      { id: "pt-2000s", name: "Música de los 2000", aliases: ["2000s"], region: "International", curated: true, tier: "SECONDARY" },
      { id: "pt-70s", name: "Música de los 70", aliases: ["70s", "Seventies"], region: "International", curated: true, tier: "SECONDARY" },
      { id: "pt-60s", name: "Música de los 60", aliases: ["60s", "Sixties"], region: "International", curated: true, tier: "SECONDARY" },
      { id: "pt-baladas", name: "Baladas", region: "International", curated: true, tier: "SECONDARY" },
      { id: "pt-karaoke", name: "Karaoke", region: "International", curated: true, tier: "SECONDARY" },
      { id: "pt-party", name: "Fiesta / Party", region: "International", curated: true, tier: "SECONDARY" },
    ],
  },
];

/**
 * Flatten the nested catalog into a flat list of genres (categories + leaves).
 * Each entry is a plain genre object (no `children`).
 * @returns {Genre[]}
 */
export function flattenGenres() {
  const flat = [];
  const walk = (genres) => {
    for (const g of genres) {
      const { children, ...rest } = g;
      flat.push(rest);
      if (children && children.length) walk(children);
    }
  };
  walk(GENRES);
  return flat;
}

/** @type {Map<string, Genre>} id → genre (flat, no children) */
const byId = new Map(flattenGenres().map((g) => [g.id, g]));

/**
 * Look up a genre by its stable id.
 * @param {string} id
 * @returns {Genre | undefined}
 */
export function getGenre(id) {
  return byId.get(id);
}

/**
 * Build a search index: normalized name + aliases → genre id.
 * @type {Map<string, string>}
 */
const searchIndex = new Map();
for (const g of flattenGenres()) {
  const keys = [g.name, ...(g.aliases || [])];
  for (const key of keys) {
    const norm = normalizeGenre(key);
    if (norm && !searchIndex.has(norm)) searchIndex.set(norm, g.id);
  }
}

/**
 * Search the curated catalog by name/alias. Accent-insensitive and
 * case-insensitive. Returns genres whose name or any alias contains the query.
 *
 * @param {string} query
 * @param {number} [limit]  max results to return
 * @returns {Genre[]}
 */
export function searchCuratedGenres(query, limit = 20) {
  const q = normalizeGenre(query);
  if (!q) return [];
  const results = [];
  for (const g of flattenGenres()) {
    const keys = [g.name, ...(g.aliases || [])];
    const hit = keys.some((k) => normalizeGenre(k).includes(q));
    if (hit) results.push(g);
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * Resolve a user query to a canonical curated genre id, if one exists.
 * Checks exact normalized name/alias first, then substring.
 * @param {string} query
 * @returns {string | undefined} the canonical genre id, or undefined
 */
export function resolveGenreId(query) {
  const q = normalizeGenre(query);
  if (!q) return undefined;
  const exact = searchIndex.get(q);
  if (exact) return exact;
  const matches = searchCuratedGenres(q, 1);
  return matches.length ? matches[0].id : undefined;
}
