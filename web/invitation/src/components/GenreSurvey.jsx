import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { GENRES, searchCuratedGenres } from "../genres/genre-taxonomy.js";
import { createGenreSearchService } from "../genre-search/genre-search-service.js";
import { GenreVote } from "./GenreVote.jsx";

/**
 * The music genre survey.
 *
 * Renders the curated genre catalog grouped by category (Música Mexicana,
 * Serbia/Balcanes, Latina/Caribe, etc.). Each category is expandable to reveal
 * its subgenres, and every genre (category + subgenre) is independently
 * rateable with 1–5 stars via `GenreVote`.
 *
 * A search box lets guests find obscure genres NOT in the curated catalog
 * (via the GenreSearchService → MusicBrainz fallback). Search results are
 * rendered as rateable rows too.
 *
 * Props:
 *   onVote  optional callback fired after any successful rating save, with
 *           { genreId, rating }.
 */
export function GenreSurvey({ onVote }) {
  const { t } = useApp();
  const surveyLabel = t?.music?.genreSurvey || {};

  const [expanded, setExpanded] = useState(() => {
    // Expand the two cultural pillars by default so the survey feels alive.
    const initial = new Set();
    GENRES.forEach((cat) => {
      if (cat.region === "Mexico" || cat.region === "Serbia/Balkans") initial.add(cat.id);
    });
    return initial;
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const abortRef = useRef(null);

  const service = useMemo(() => createGenreSearchService(), []);

  const toggle = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Debounced search for obscure genres (curated first, MusicBrainz fallback).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return undefined;
    }

    // If the query matches the curated catalog, show those instantly.
    const curated = searchCuratedGenres(q, 10);
    if (curated.length > 0) {
      setResults(
        curated.map((g) => ({
          id: g.id,
          name: g.name,
          aliases: g.aliases || [],
          region: g.region || "",
          curated: true,
          source: "curated",
        })),
      );
      setSearching(false);
      setSearchError("");
      return undefined;
    }

    setSearching(true);
    setSearchError("");
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const found = await service.search(q, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(found);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.warn("[GenreSurvey] search failed", err);
        setSearchError(surveyLabel.searchError || "Could not search. Try again.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, service, surveyLabel.searchError]);

  const renderGenreRow = (genre) => (
    <li key={genre.id} className="genre-survey__row">
      <div className="genre-survey__row-name">
        <span className="genre-survey__name">{genre.name}</span>
        {genre.region && <span className="genre-survey__region">{genre.region}</span>}
      </div>
      <GenreVote genreId={genre.id} genreName={genre.name} onVote={onVote} />
    </li>
  );

  const renderCategory = (cat) => {
    const isOpen = expanded.has(cat.id);
    const children = cat.children || [];
    return (
      <section key={cat.id} className="genre-survey__category">
        <div className="genre-survey__category-head">
          <button
            type="button"
            className="genre-survey__category-toggle"
            aria-expanded={isOpen}
            onClick={() => toggle(cat.id)}
          >
            <span className="genre-survey__chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
            <span className="genre-survey__category-name">{cat.name}</span>
          </button>
          <GenreVote genreId={cat.id} genreName={cat.name} onVote={onVote} />
        </div>
        {isOpen && children.length > 0 && (
          <ul className="genre-survey__subgenres">
            {children.map((child) => {
              if (child.children && child.children.length) {
                return renderCategory(child);
              }
              return renderGenreRow(child);
            })}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="genre-survey">
      <p className="genre-survey__intro">{surveyLabel.intro || "Rate the music you love so we can plan the perfect playlist."}</p>

      <div className="genre-survey__search">
        <label className="genre-survey__search-label" htmlFor="genre-survey-search">
          {surveyLabel.searchLabel || "Search a genre"}
        </label>
        <input
          id="genre-survey-search"
          type="search"
          className="genre-survey__search-input"
          placeholder={surveyLabel.searchPlaceholder || "e.g. mariachi, kolo, cumbia…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && <span className="genre-survey__searching">{surveyLabel.searching || "Searching…"}</span>}
        {searchError && <p className="genre-survey__search-error">{searchError}</p>}
      </div>

      {results.length > 0 && (
        <div className="genre-survey__results">
          <h3 className="genre-survey__results-title">{surveyLabel.resultsTitle || "Search results"}</h3>
          <ul className="genre-survey__results-list">{results.map(renderGenreRow)}</ul>
        </div>
      )}

      <div className="genre-survey__catalog">
        {GENRES.map(renderCategory)}
      </div>
    </div>
  );
}
