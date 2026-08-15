/**
 * GenreSearchService — the app-facing genre-search API for the genre survey.
 *
 * The UI talks to this service, never to a provider directly. It:
 *  - searches the CURATED catalog first (local, instant, no network),
 *  - enforces a minimum query length (so we don't search on every keystroke),
 *  - caches recent results per query (so repeat searches don't hit the network),
 *  - delegates the MusicBrainz fallback to an injectable provider, so the
 *    provider can be swapped later without touching the UI.
 *
 * The curated catalog is the source of truth for the survey. MusicBrainz is
 * only consulted when the guest searches for a genre NOT in the curated
 * catalog (obscure genres, autocomplete, adding new genres). We never make a
 * MusicBrainz call just to load the survey — the curated catalog is bundled.
 *
 * Debouncing (the ~600ms wait before firing a request) is handled by the
 * autocomplete UI, which owns the input lifecycle; this service stays
 * framework-agnostic and testable.
 */

import { createMusicBrainzGenreProvider } from "./musicbrainz-genre-provider.js";
import { searchCuratedGenres, resolveGenreId } from "../genres/genre-taxonomy.js";

/** Minimum characters before we bother searching. */
export const MIN_QUERY_LENGTH = 2;

/** Max entries kept in the in-memory cache (simple LRU-ish eviction). */
const CACHE_MAX = 50;

/** In-memory query → results cache. Keyed by normalized query. */
const cache = new Map();

/**
 * Create a genre-search service.
 *
 * @param {Object} [options]
 * @param {Object} [options.provider]  a provider exposing `search(query, { signal })`
 * @returns {{ search: (query: string, opts?: { signal?: AbortSignal }) => Promise<Object[]> }}
 */
export function createGenreSearchService({
  provider = createMusicBrainzGenreProvider(),
} = {}) {
  return {
    /**
     * Search for genres matching a query.
     *
     * Returns an empty array for queries shorter than MIN_QUERY_LENGTH. The
     * curated catalog is searched first; if it yields results they are
     * returned immediately (no network). Otherwise the provider (MusicBrainz)
     * is consulted for obscure genres. Results are cached per query so
     * repeated lookups are instant and don't consume MusicBrainz rate budget.
     *
     * @param {string} query
     * @param {{ signal?: AbortSignal }} [opts]
     * @returns {Promise<Object[]>} normalized `GenreSearchResult[]`
     */
    async search(query, { signal } = {}) {
      const q = String(query || "").trim();
      if (q.length < MIN_QUERY_LENGTH) return [];

      const cached = cache.get(q);
      if (cached) return cached;

      // 1) Curated catalog first — instant, no network.
      const curated = searchCuratedGenres(q, 10).map((g) => ({
        id: g.id,
        name: g.name,
        aliases: g.aliases || [],
        region: g.region || "",
        curated: true,
        source: "curated",
      }));

      // 2) If the curated catalog already covers the query, stop there.
      //    MusicBrainz is only a fallback for obscure genres.
      if (curated.length > 0) {
        cache.set(q, curated);
        return curated;
      }

      // 3) Fall back to the provider (MusicBrainz) for obscure genres.
      const results = await provider.search(q, { signal });
      cache.set(q, results);
      if (cache.size > CACHE_MAX) {
        // Evict the oldest entry to keep the cache bounded.
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
      return results;
    },

    /**
     * Resolve a query to a canonical curated genre id, if one exists.
     * Useful for deduplicating a user-typed genre against the curated catalog.
     *
     * @param {string} query
     * @returns {string | undefined}
     */
    resolveCuratedId(query) {
      return resolveGenreId(query);
    },
  };
}
