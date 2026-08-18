import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import {
  saveSongRequest,
  loadGuestSongRequests,
  updateSongRequest,
  deleteSongRequest,
} from "../song-requests.js";
import { createSongSearchService } from "../song-search/song-search-service.js";
import { MIN_QUERY_LENGTH } from "../song-search/song-search-service.js";
import { getGroupMembers, resolveGuestName, resolveGuestPhoto } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";



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
  const [assignedGuestId, setAssignedGuestId] = useState("");
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // The guest's group members (including themselves). Lets a guest request a
  // song on behalf of a group member (e.g. their partner or kids).
  const groupMembers = useMemo(
    () => (profile?.guest ? getGroupMembers(profile.guest, getActiveGuests()) : []),
    [profile?.guest]
  );
  // Default the selector to the requesting guest.
  const effectiveAssignedId = assignedGuestId || guestId || "";

  // "My songs" table state: the guest's own requests, loaded on mount.
  const [mySongs, setMySongs] = useState([]);
  const [mySongsLoading, setMySongsLoading] = useState(false);
  const [mySongsError, setMySongsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tableMsg, setTableMsg] = useState("");

  // AbortController for the in-flight search, so a stale response never
  // overwrites a newer one (fast typing / stale-request protection).
  const abortRef = useRef(null);

  // Monotonic request id: only the latest search may update the UI.
  const requestIdRef = useRef(0);
  const inputRef = useRef(null);
  const guestPickerRef = useRef(null);

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

  // Close the dropdowns when clicking outside them.
  useEffect(() => {
    function onDocClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (guestPickerRef.current && !guestPickerRef.current.contains(e.target)) {
        setGuestPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Load the guest's own song requests whenever the guest id is available.
  useEffect(() => {
    if (!guestId) return;
    let cancelled = false;
    setMySongsLoading(true);
    setMySongsError(false);
    loadGuestSongRequests(guestId)
      .then((requests) => {
        if (cancelled) return;
        setMySongs(requests);
      })
      .catch(() => {
        if (cancelled) return;
        setMySongsError(true);
      })
      .finally(() => {
        if (!cancelled) setMySongsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guestId]);


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
      await saveSongRequest({
        guestId,
        song: trimmed,
        intent,
        bandType,
        songMeta,
        assignedGuestId: effectiveAssignedId,
      });
      setQuery("");
      setSongMeta(null);
      setIntent("hear");
      setBandType("");
      setAssignedGuestId("");
      setSaved(true);
      // Refresh the "My songs" list so the newly added song shows up.
      const updated = await loadGuestSongRequests(guestId);
      setMySongs(updated);

    } catch (err) {

      console.warn("[SongRequest] save failed", err);
      setError(sr.error || "Could not save your song.");
    } finally {
      setSaving(false);
    }
  };


  // Populate the form with an existing request so the guest can edit it.
  const handleEdit = (request) => {
    setEditingId(request.id);
    setQuery(request.song || "");
    setSongMeta(request.songMeta || null);
    setIntent(request.intent || "hear");
    setBandType(request.bandType || "");
    setAssignedGuestId(request.assignedGuestId || "");
    setSaved(false);
    setError("");
    setTableMsg("");
    // Scroll the form into view so the guest sees the edit context.
    document
      .querySelector(".song-request-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Cancel editing and reset the form to a fresh state.
  const handleCancelEdit = () => {
    setEditingId(null);
    setQuery("");
    setSongMeta(null);
    setIntent("hear");
    setBandType("");
    setAssignedGuestId("");
    setSaved(false);
    setError("");
    setTableMsg("");
  };


  // Save the edited request back to Firestore.
  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!guestId || !editingId) return;
    if (saving) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setError(sr.required || "Write the song title.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    setTableMsg("");
    try {
      await updateSongRequest({
        requestId: editingId,
        guestId,
        song: trimmed,
        intent,
        bandType,
        songMeta,
        assignedGuestId: effectiveAssignedId,
      });
      // Refresh the table with the updated request.
      const updated = await loadGuestSongRequests(guestId);
      setMySongs(updated);
      setEditingId(null);
      setQuery("");
      setSongMeta(null);
      setIntent("hear");
      setBandType("");
      setAssignedGuestId("");
      setTableMsg(sr.updateSuccess || "Song updated!");

    } catch (err) {
      console.warn("[SongRequest] update failed", err);
      setError(sr.updateError || "Could not update your song.");
    } finally {
      setSaving(false);
    }
  };

  // Delete one of the guest's own requests (with a confirmation).
  const handleDelete = async (request) => {
    if (!window.confirm(sr.deleteConfirm || "Delete this song from the list?")) {
      return;
    }
    setTableMsg("");
    try {
      await deleteSongRequest(request.id);
      setMySongs((prev) => prev.filter((r) => r.id !== request.id));
      if (editingId === request.id) handleCancelEdit();
      setTableMsg(sr.deleteSuccess || "Song deleted.");
    } catch (err) {
      console.warn("[SongRequest] delete failed", err);
      setTableMsg(sr.deleteError || "Could not delete the song.");
    }
  };

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  // Render a group member's avatar (photo or initials fallback).
  const renderMemberAvatar = (member) => {
    const { fullName } = resolveGuestName(member);
    const photo = resolveGuestPhoto(member);
    return (
      <span className="song-request-guestpicker__avatar" aria-hidden="true">
        {photo ? (
          <img src={photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="song-request-guestpicker__avatar-fallback">
            {(fullName || "?").charAt(0).toUpperCase()}
          </span>
        )}
      </span>
    );
  };

  // Render a group member's display label ("Para mí" / "Para {name}").
  const renderMemberLabel = (member) => {
    const { fullName } = resolveGuestName(member);
    const isSelf = member.id === guestId;
    return isSelf
      ? sr.assignedGuestMe || fullName || member.id
      : (sr.assignedGuestFor || "{name}").replace("{name}", fullName || member.id);
  };

  // Resolve the group member a saved request belongs to (by assignedGuestId,
  // falling back to the requesting guest). Used to show the avatar on the
  // "My songs" list items.
  const memberForRequest = (request) => {
    const targetId = request.assignedGuestId || guestId;
    return groupMembers.find((m) => m.id === targetId) || null;
  };


  return (

    <section className="song-request-section section story-bg" id="song-request">
      <div className="experience-heading reveal">
        <p className="eyebrow">{sr.eyebrow}</p>
        <h2>{sr.title}</h2>
        <p className="experience-note">{sr.body}</p>
      </div>

      <form
        className="song-request-form reveal"
        onSubmit={editingId ? handleUpdate : handleSubmit}
      >

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

        {groupMembers.length > 1 && (
          <div className="song-request-field">
            <span className="song-request-field__label">
              {sr.assignedGuestLabel || "Who is this song for?"}
            </span>
            <div className="song-request-guestpicker" ref={guestPickerRef}>
              <button
                type="button"
                className="song-request-guestpicker__trigger"
                onClick={() => setGuestPickerOpen((v) => !v)}
                disabled={saving}
                aria-haspopup="listbox"
                aria-expanded={guestPickerOpen}
              >
                {groupMembers.map((member) => {
                  if (member.id !== effectiveAssignedId) return null;
                  return (
                    <span className="song-request-guestpicker__value" key={member.id}>
                      {renderMemberAvatar(member)}
                      <span className="song-request-guestpicker__name">
                        {renderMemberLabel(member)}
                      </span>
                    </span>
                  );
                })}
                <span className="song-request-guestpicker__caret" aria-hidden="true">▾</span>
              </button>

              {guestPickerOpen && (
                <ul
                  className="song-request-guestpicker__list"
                  role="listbox"
                  aria-label={sr.assignedGuestLabel || "Who is this song for?"}
                >
                  {groupMembers.map((member) => (
                    <li key={member.id} role="option" aria-selected={member.id === effectiveAssignedId}>
                      <button
                        type="button"
                        className={`song-request-guestpicker__option${
                          member.id === effectiveAssignedId ? " is-selected" : ""
                        }`}
                        onClick={() => {
                          setAssignedGuestId(member.id);
                          setGuestPickerOpen(false);
                        }}
                        disabled={saving}
                      >
                        {renderMemberAvatar(member)}
                        <span className="song-request-guestpicker__name">
                          {renderMemberLabel(member)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}


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

        {(intent === "band" || intent === "sing") && (
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

        <div className="song-request-actions">
          <button
            type="submit"
            className="song-request-submit"
            disabled={saving || !guestId}
          >
            {saving ? "…" : editingId ? sr.saveEdit || sr.submit : sr.submit}

          </button>
          {editingId && (
            <button
              type="button"
              className="song-request-cancel"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              {sr.cancelEdit || "Cancel editing"}
            </button>
          )}
        </div>
      </form>

      {guestId && (
        <div className="song-request-mysongs reveal">
          <h3 className="song-request-mysongs__title">
            {sr.mySongsTitle || "My songs"}
          </h3>

          {tableMsg && (
            <p className="song-request-feedback is-success">{tableMsg}</p>
          )}

          {mySongsLoading && (
            <p className="song-request-mysongs__status">
              {sr.mySongsLoading || "Loading your songs…"}
            </p>
          )}

          {!mySongsLoading && mySongsError && (
            <p className="song-request-mysongs__status is-error">
              {sr.mySongsError || "We could not load your songs."}
            </p>
          )}

          {!mySongsLoading && !mySongsError && mySongs.length === 0 && (
            <p className="song-request-mysongs__status">
              {sr.mySongsEmpty || "You haven’t requested any songs yet."}
            </p>
          )}

          {!mySongsLoading && !mySongsError && mySongs.length > 0 && (
            <ul className="song-request-mysongs__list">
              {mySongs.map((request) => {
                const member = memberForRequest(request);
                return (
                  <li
                    className={`song-request-mysongs__item${
                      editingId === request.id ? " is-editing" : ""
                    }`}
                    key={request.id}
                  >
                    {member && (
                      <span
                        className="song-request-mysongs__avatar"
                        aria-hidden="true"
                      >
                        {renderMemberAvatar(member)}
                      </span>
                    )}
                    <div className="song-request-mysongs__info">
                      <span className="song-request-mysongs__song">
                        {request.song}
                      </span>
                      <span className="song-request-mysongs__meta">
                        {sr.intents?.[request.intent] || request.intent}
                        {request.bandType
                          ? ` · ${sr.bandTypes?.[request.bandType] || request.bandType}`
                          : ""}
                      </span>
                    </div>
                    <div className="song-request-mysongs__actions">
                      <button
                        type="button"
                        className="song-request-mysongs__btn"
                        onClick={() => handleEdit(request)}
                        disabled={saving}
                      >
                        {sr.edit || "Edit"}
                      </button>
                      <button
                        type="button"
                        className="song-request-mysongs__btn is-danger"
                        onClick={() => handleDelete(request)}
                        disabled={saving}
                      >
                        {sr.delete || "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

        </div>
      )}

      <nav className="section-nav" aria-label="Continue">
        <a className="section-nav-link" href="#coast">
          <span>{t.nav.coast}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
</section>
  );
}
