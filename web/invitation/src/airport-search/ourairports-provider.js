/**
 * OurAirports airport-search provider.
 *
 * Searches the bundled OurAirports-derived dataset (see
 * scripts/import-ourairports.mjs and src/data/airports.json) and normalizes
 * results into the app's internal `AirportSearchResult` shape so the UI and
 * persistence layer never depend on the raw dataset schema.
 *
 * The provider is isolated behind the `AirportSearchService` so it can later be
 * swapped or complemented by another source (e.g. a live API) without touching
 * the UI or the database model.
 *
 * Search is:
 *  - case-insensitive
 *  - accent/diacritic-insensitive (via a normalization helper)
 *  - ranked so exact IATA matches come first, then city/name matches
 */

import airportsData from "../data/airports.json";

/**
 * Normalize a string for accent-insensitive, case-insensitive matching.
 * Strips combining diacritics and lowercases.
 * @param {string} value
 * @returns {string}
 */
export function normalizeAirportText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normalize a single raw airport record into the internal airport shape.
 * @param {Object} raw  an entry from airports.json
 * @returns {Object} a normalized `AirportSearchResult`
 */
export function normalizeAirport(raw) {
  return {
    iata: String(raw.iata || "").trim(),
    icao: raw.icao ? String(raw.icao).trim() : undefined,
    name: String(raw.name || "").trim(),
    city: raw.city ? String(raw.city).trim() : undefined,
    country: raw.country || raw.countryCode || "",
    countryCode: String(raw.countryCode || "").trim(),
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

/**
 * Create an OurAirports-backed airport-search provider.
 *
 * @param {Object} [options]
 * @param {Array<Object>} [options.airports]  injectable dataset (for tests)
 * @returns {{ search: (query: string) => Object[] }}
 */
export function createOurAirportsProvider({ airports = airportsData } = {}) {
  const normalized = airports.map(normalizeAirport);

  return {
    /**
     * Search the bundled airport dataset for a query.
     * @param {string} query
     * @returns {Object[]} ranked, normalized `AirportSearchResult[]`
     */
    search(query) {
      const q = normalizeAirportText(query);
      if (!q) return [];

      const exactIata = [];
      const iataStarts = [];
      const textMatches = [];

      for (const airport of normalized) {
        const iata = normalizeAirportText(airport.iata);
        const name = normalizeAirportText(airport.name);
        const city = normalizeAirportText(airport.city);
        const country = normalizeAirportText(airport.country);

        // Exact IATA match ranks first (e.g. "CDG" → Charles de Gaulle).
        if (iata === q) {
          exactIata.push(airport);
          continue;
        }
        // IATA prefix match (e.g. "GU" → Guadalajara).
        if (iata.startsWith(q)) {
          iataStarts.push(airport);
          continue;
        }
        // City / name / country substring match.
        if (
          (city && city.includes(q)) ||
          (name && name.includes(q)) ||
          (country && country.includes(q))
        ) {
          textMatches.push(airport);
        }
      }

      return [...exactIata, ...iataStarts, ...textMatches];
    },
  };
}
