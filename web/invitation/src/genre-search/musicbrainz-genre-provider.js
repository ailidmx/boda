/**
 * MusicBrainz genre-search provider.
 *
 * Searches the MusicBrainz public database (no OAuth) and normalizes the
 * results into the app's internal `GenreSearchResult` shape so the UI and
 * persistence layer never depend on MusicBrainz's raw schema.
 *
 * NOTE: MusicBrainz has NO `/ws/2/genre/` endpoint (it returns 501 Not
 * Implemented). Genres are modelled as TAGS, so we search the `/ws/2/tag/`
 * endpoint and treat each returned tag as a genre label. This is the standard
 * way to discover genre-like terms on MusicBrainz.
 *
 * The provider is isolated behind the `GenreSearchService` so it can later be
 * swapped or complemented by another source without touching the UI or the
 * database model.
 *
 * IMPORTANT: The curated catalog (genre-taxonomy.js) is the source of truth for
 * the survey. MusicBrainz is ONLY a fallback/expansion layer for obscure genres
 * the guest searches for that aren't in the curated catalog. We never load the
 * full MusicBrainz genre vocabulary just to render the survey.
 *
 * MusicBrainz usage rules:
 *  - A descriptive `User-Agent` is required (identifies the app).
 *  - The API is rate-limited (~1 request/second); the caller (GenreSearchService
 *    + the autocomplete UI) is responsible for debouncing and caching so we
 *    never fire a request on every keystroke.
 *  - We only fetch a small page (limit 10) and never mirror the catalog.
 */

const MUSICBRAINZ_GENRE_ENDPOINT = "https://musicbrainz.org/ws/2/tag/";

// Identify the app per MusicBrainz policy. Keep it stable and descriptive.
const USER_AGENT = "BodaInvitation/1.0 (https://github.com/ailidmx/boda)";

/** Max genres to request per search. */
const LIMIT = 10;

/**
 * Normalize a single MusicBrainz genre into the internal genre shape.
 *
 * @param {Object} genre  a raw MusicBrainz genre object
 * @returns {Object} a normalized `GenreSearchResult`
 */
export function normalizeGenreResult(genre) {
  const name = String(genre?.name || "").trim();
  return {
    id: String(genre?.id || ""),
    name,
    aliases: [],
    region: "",
    curated: false,
    source: "musicbrainz",
  };
}

/**
 * Deduplicate a list of normalized genre results.
 *
 * MusicBrainz can return the same genre under slightly different spellings or
 * with duplicate entries. We collapse them by normalized name (accent- and
 * case-insensitive), preferring the first occurrence.
 *
 * @param {Array<Object>} results  normalized `GenreSearchResult[]`
 * @returns {Array<Object>} deduplicated results
 */
export function dedupeGenres(results) {
  const byKey = new Map();
  for (const r of results) {
    if (!r.name) continue;
    const key = r.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!byKey.has(key)) byKey.set(key, r);
  }
  return Array.from(byKey.values());
}

/**
 * Create a MusicBrainz-backed genre-search provider.
 *
 * @param {Object} [options]
 * @param {Function} [options.fetchImpl]  injectable fetch (for tests)
 * @returns {{ search: (query: string, opts?: { signal?: AbortSignal }) => Promise<Object[]> }}
 */
export function createMusicBrainzGenreProvider({ fetchImpl = fetch } = {}) {
  return {
    /**
     * Search MusicBrainz genres for a query.
     * @param {string} query
     * @param {{ signal?: AbortSignal }} [opts]
     * @returns {Promise<Object[]>} normalized, deduplicated `GenreSearchResult[]`
     */
    async search(query, { signal } = {}) {
      const url = new URL(MUSICBRAINZ_GENRE_ENDPOINT);
      url.searchParams.set("query", query);
      url.searchParams.set("fmt", "json");
      url.searchParams.set("limit", String(LIMIT));

      const res = await fetchImpl(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
        signal,
      });

      if (!res.ok) {
        throw new Error(`MusicBrainz genre search failed (${res.status})`);
      }

      const data = await res.json();
      // The /ws/2/tag/ endpoint returns tags under `data.tags` (each tag has a
      // `name` and a `count`). We treat each tag as a genre label.
      const genres = Array.isArray(data?.tags) ? data.tags : [];
      return dedupeGenres(genres.map(normalizeGenreResult));
    },
  };
}
