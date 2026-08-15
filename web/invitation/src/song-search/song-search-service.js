/**
 * SongSearchService — the app-facing song-search API.
 *
 * The UI talks to this service, never to a provider directly. It:
 *  - enforces a minimum query length (so we don't search on every keystroke),
 *  - caches recent results per query (so repeat searches don't hit the network),
 *  - delegates the actual lookup to an injectable provider (MusicBrainz by
 *    default), so the provider can be swapped later without touching the UI.
 *
 * Debouncing (the ~600ms wait before firing a request) is handled by the
 * autocomplete UI, which owns the input lifecycle; this service stays
 * framework-agnostic and testable.
 */

import { createMusicBrainzProvider } from "./musicbrainz-provider.js";

/** Minimum characters before we bother searching. */
export const MIN_QUERY_LENGTH = 2;

/** Max entries kept in the in-memory cache (simple LRU-ish eviction). */
const CACHE_MAX = 50;

/** In-memory query → results cache. Keyed by normalized query. */
const cache = new Map();

/**
 * Create a song-search service.
 *
 * @param {Object} [options]
 * @param {Object} [options.provider]  a provider exposing `search(query, { signal })`
 * @returns {{ search: (query: string, opts?: { signal?: AbortSignal }) => Promise<Object[]> }}
 */
export function createSongSearchService({
  provider = createMusicBrainzProvider(),
} = {}) {
  return {
    /**
     * Search for songs matching a query.
     *
     * Returns an empty array for queries shorter than MIN_QUERY_LENGTH. Results
     * are cached per query so repeated lookups are instant and don't consume
     * MusicBrainz rate budget.
     *
     * @param {string} query
     * @param {{ signal?: AbortSignal }} [opts]
     * @returns {Promise<Object[]>} normalized `SongSearchResult[]`
     */
    async search(query, { signal } = {}) {
      const q = String(query || "").trim();
      if (q.length < MIN_QUERY_LENGTH) return [];

      const cached = cache.get(q);
      if (cached) return cached;

      const results = await provider.search(q, { signal });
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
