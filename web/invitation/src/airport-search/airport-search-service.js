/**
 * AirportSearchService — the app-facing airport-search API.
 *
 * The UI talks to this service, never to a provider directly. It:
 *  - enforces a minimum query length (so we don't search on every keystroke),
 *  - caches recent results per query (so repeat searches are instant),
 *  - delegates the actual lookup to an injectable provider (OurAirports by
 *    default), so the provider can be swapped later without touching the UI.
 *
 * The dataset is bundled locally, so search is synchronous and offline — no
 * network round-trip. The service still returns a Promise to keep the same
 * async contract as the song-search service (and to allow a future live
 * provider without changing the UI).
 */

import { createOurAirportsProvider } from "./ourairports-provider.js";

/** Minimum characters before we bother searching. */
export const MIN_QUERY_LENGTH = 2;

/** Max entries kept in the in-memory cache (simple LRU-ish eviction). */
const CACHE_MAX = 50;

/** In-memory query → results cache. Keyed by normalized query. */
const cache = new Map();

/**
 * Create an airport-search service.
 *
 * @param {Object} [options]
 * @param {Object} [options.provider]  a provider exposing `search(query)`
 * @returns {{ search: (query: string) => Promise<Object[]> }}
 */
export function createAirportSearchService({
  provider = createOurAirportsProvider(),
} = {}) {
  return {
    /**
     * Search for airports matching a query.
     *
     * Returns an empty array for queries shorter than MIN_QUERY_LENGTH. Results
     * are cached per query so repeated lookups are instant.
     *
     * @param {string} query
     * @returns {Promise<Object[]>} normalized `AirportSearchResult[]`
     */
    async search(query) {
      const q = String(query || "").trim();
      if (q.length < MIN_QUERY_LENGTH) return [];

      const cached = cache.get(q);
      if (cached) return cached;

      const results = provider.search(q);
      cache.set(q, results);
      if (cache.size > CACHE_MAX) {
        // Evict the oldest entry to keep the cache bounded.
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
      return results;
    },
  };
}
