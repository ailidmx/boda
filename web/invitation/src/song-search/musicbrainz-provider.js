/**
 * MusicBrainz song-search provider.
 *
 * Searches the MusicBrainz public recording database (no OAuth, no Spotify)
 * and normalizes the results into the app's internal `SongSearchResult` shape
 * so the UI and persistence layer never depend on MusicBrainz's raw schema.
 *
 * The provider is isolated behind the `SongSearchService` so it can later be
 * swapped or complemented by another source without touching the UI or the
 * database model.
 *
 * MusicBrainz usage rules:
 *  - A descriptive `User-Agent` is required (identifies the app).
 *  - The API is rate-limited (~1 request/second); the caller (SongSearchService
 *    + the autocomplete UI) is responsible for debouncing and caching so we
 *    never fire a request on every keystroke.
 *  - We only fetch a small page (limit 10) and never mirror the catalog.
 */

const MUSICBRAINZ_ENDPOINT = "https://musicbrainz.org/ws/2/recording/";

// Identify the app per MusicBrainz policy. Keep it stable and descriptive.
const USER_AGENT = "BodaInvitation/1.0 (https://github.com/ailidmx/boda)";

/** Max recordings to request per search. */
const LIMIT = 10;

/**
 * Normalize a single MusicBrainz recording into the internal song shape.
 *
 * @param {Object} rec  a raw MusicBrainz recording object
 * @returns {Object} a normalized `SongSearchResult`
 */
export function normalizeRecording(rec) {
  const title = String(rec?.title || "").trim();
  const artist = String(rec?.["artist-credit"]?.[0]?.name || "").trim();
  const year = rec?.["first-release-date"]
    ? Number(String(rec["first-release-date"]).slice(0, 4))
    : undefined;
  const isrc = rec?.isrcs?.[0] || undefined;

  return {
    title,
    artist,
    year: Number.isFinite(year) ? year : undefined,
    externalId: String(rec?.id || ""),
    source: "musicbrainz",
    isrc: isrc ? String(isrc) : undefined,
  };
}

/**
 * Deduplicate a list of normalized recordings.
 *
 * MusicBrainz often returns several recordings that are effectively the same
 * song (live versions, re-releases, alternate takes). We collapse them by
 * (title + artist), preferring the entry that has an ISRC and the earliest
 * release year, so the user sees one clean row per song.
 *
 * @param {Array<Object>} results  normalized `SongSearchResult[]`
 * @returns {Array<Object>} deduplicated results
 */
export function dedupeRecordings(results) {
  const byKey = new Map();
  for (const r of results) {
    if (!r.title || !r.artist) continue;
    const key = `${r.title.toLowerCase()}::${r.artist.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, r);
      continue;
    }
    // Prefer the entry with an ISRC.
    if (!existing.isrc && r.isrc) {
      byKey.set(key, r);
      continue;
    }
    // Otherwise prefer the earliest release year.
    if (existing.isrc === r.isrc && r.year && (!existing.year || r.year < existing.year)) {
      byKey.set(key, r);
    }
  }
  return Array.from(byKey.values());
}

/**
 * Create a MusicBrainz-backed song-search provider.
 *
 * @param {Object} [options]
 * @param {Function} [options.fetchImpl]  injectable fetch (for tests)
 * @returns {{ search: (query: string, opts?: { signal?: AbortSignal }) => Promise<Object[]> }}
 */
export function createMusicBrainzProvider({ fetchImpl = fetch } = {}) {
  return {
    /**
     * Search MusicBrainz recordings for a query.
     * @param {string} query
     * @param {{ signal?: AbortSignal }} [opts]
     * @returns {Promise<Object[]>} normalized, deduplicated `SongSearchResult[]`
     */
    async search(query, { signal } = {}) {
      const url = new URL(MUSICBRAINZ_ENDPOINT);
      url.searchParams.set("query", query);
      url.searchParams.set("fmt", "json");
      url.searchParams.set("limit", String(LIMIT));

      const res = await fetchImpl(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
        signal,
      });

      if (!res.ok) {
        throw new Error(`MusicBrainz search failed (${res.status})`);
      }

      const data = await res.json();
      const recordings = Array.isArray(data?.recordings) ? data.recordings : [];
      return dedupeRecordings(recordings.map(normalizeRecording));
    },
  };
}
