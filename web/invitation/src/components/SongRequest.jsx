import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { saveSongRequest } from "../song-requests.js";
import { createSongSearchService } from "../song-search/song-search-service.js";
import { MIN_QUERY_LENGTH } from "../song-search/song-search-service.js";

// Debounce before firing a MusicBrainz request (respects their ~1 req/s rate).
const SEARCH_DEBOUNCE_MS = 600;

// The service is created once per module load. It owns the per-query cache and
// delegates to the MusicBrainz provider, so the UI never talks to MusicBrainz
// directly and the provider can be swapped later without touching this file.
const songSearch = createSongSearchService();

/**
 * "Pide tu canción" — an interactive song-request section next to Music.
 *
 * Guests can search for a song via MusicBrainz (autocomplete) and submit it
 * with an intent. Each request is saved to Firestore under
 * `song_requests/{requestId}` (one doc per request, auto-generated id) so the
 * couple can aggregate the results from the dashboard back office.
 *
 * When the guest picks a song from the autocomplete, the normalized song
 * identity (title, artist, year, MusicBrainz id, isrc) is stored in the
 * `songMeta` field, separate from the event request (`intent`). If the search
 * finds nothing, the guest can still type a free-text title.
 *
 * The section keeps the invitation's atmosphere: it uses the shared `story-bg`
 * background and the standard section layout (eyebrow, title, body).
 */
export function SongRequest() {
  const { t, profile } = useApp();
  const guestId = profile?.guest?.id;
  const sr = t.songRequest || {};

  const [query, setQuery] = useState("");
  const [songMeta, setSongMeta] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState("hear");
  const [bandType, setBandType] = useState("");
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // AbortController for the in-flight search, so a stale response never
  // overwrites a newer one (fast typing / stale-request protection).
  const abortRef = useRef(null);
  // Monotonic request id: only the latest search may update the UI.
  const requestIdRef = useRef(0);
  const inputRef = useRef(null);

  const intents = sr.intents || {};

  // Debounced search. Fires only after the user pauses typing (SEARCH_DEBOUNCE_MS)
  // and only when the query is long enough. Aborts any previous request.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    setSearching(true);
    setSearchError(false);
    setOpen(true);

    const timer = setTimeout(async () => {
      const myId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const found = await songSearch.search(q, { signal: controller.signal });
        // Ignore stale responses (a newer search has started).
        if (myId !== requestIdRef.current) return;
        setResults(found);
        setSearching(false);
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (myId !== requestIdRef.current) return;
        setResults([]);
        setSearching(false);
        setSearchError(true);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown when clicking outside the autocomplete.
  useEffect(() => {
    function onDocClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = useCallback((result) => {
    const label = result.artist
      ? `${result.title} — ${result.artist}`
      : result.title;
    setQuery(label);
    setSongMeta({
      title: result.title,
      artist: result.artist,
      year: result.year,
      externalId: result.externalId,
      source: result.source,
      isrc: result.isrc,
    });
    setResults([]);
    setOpen(false);
    setSearching(false);
    setError("");
  }, []);

  const handleQueryChange = (value) => {
    setQuery(value);
    // Any manual edit clears the previously selected song identity.
    setSongMeta(null);
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!guestId) return;
    if (saving) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setError(sr.required || "Write the song title.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await saveSongRequest({ guestId, song: trimmed, intent, bandType, songMeta });
      setQuery("");
      setSongMeta(null);
      setIntent("hear");
      setBandType("");
      setSaved(true);

    } catch (err) {
      console.warn("[SongRequest] save failed", err);
      setError(sr.error || "Could not save your song.");
    } finally {
      setSaving(false);
    }
  };

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <section className="song-request-section section story-bg" id="song-request">
      <div className="experience-heading reveal">
        <p className="eyebrow">{sr.eyebrow}</p>
        <h2>{sr.title}</h2>
        <p className="experience-note">{sr.body}</p>
      </div>

      <form className="song-request-form reveal" onSubmit={handleSubmit}>
        <label className="song-request-field">
          <span className="song-request-field__label">{sr.songLabel}</span>
          <div className="song-request-autocomplete" ref={inputRef}>
            <input
              type="text"
              className="song-request-field__input"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
              }}
              placeholder={sr.songPlaceholder}
              maxLength={200}
              disabled={saving}
              autoComplete="off"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="song-request-results"
              aria-autocomplete="list"
            />

            {showDropdown && (
              <div
                className="song-request-results"
                id="song-request-results"
                role="listbox"
              >
                {searching && (
                  <div className="song-request-results__status">
                    {sr.searching || "Searching…"}
                  </div>
                )}

                {!searching && searchError && (
                  <div className="song-request-results__status is-error">
                    {sr.searchError || "We could not search."}
                  </div>
                )}

                {!searching && !searchError && results.length === 0 && (
                  <div className="song-request-results__status">
                    {sr.noResults || "No songs found."}
                  </div>
                )}

                {!searching &&
                  !searchError &&
                  results.map((r) => (
                    <button
                      type="button"
                      key={r.externalId || `${r.title}-${r.artist}`}
                      className="song-request-result"
                      role="option"
                      onClick={() => handleSelect(r)}
                    >
                      <span className="song-request-result__title">{r.title}</span>
                      {r.artist && (
                        <span className="song-request-result__artist">
                          {r.artist}
                          {r.year ? ` · ${r.year}` : ""}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <span className="song-request-field__hint">{sr.searchHint}</span>
        </label>

        <fieldset className="song-request-intents">
          <legend className="song-request-intents__label">{sr.intentLabel}</legend>
          <div className="song-request-intents__options">
            {Object.entries(intents).map(([key, label]) => (
              <label className="song-request-intent" key={key}>
                <input
                  type="radio"
                  name="song-intent"
                  value={key}
                  checked={intent === key}
                  onChange={() => setIntent(key)}
                  disabled={saving}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {intent === "band" && (
          <fieldset className="song-request-bandtypes">
            <legend className="song-request-bandtypes__label">
              {sr.bandTypeLabel}
            </legend>
            <div className="song-request-bandtypes__options">
              {Object.entries(sr.bandTypes || {}).map(([key, label]) => (
                <label className="song-request-bandtype" key={key}>
                  <input
                    type="radio"
                    name="song-bandtype"
                    value={key}
                    checked={bandType === key}
                    onChange={() => setBandType(key)}
                    disabled={saving}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {saved && <p className="song-request-feedback is-success">{sr.success}</p>}

        {error && <p className="song-request-feedback is-error">{error}</p>}

        <button
          type="submit"
          className="song-request-submit"
          disabled={saving || !guestId}
        >
          {saving ? "…" : sr.submit}
        </button>
      </form>
    </section>
  );
}
