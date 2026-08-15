import React, { useCallback, useEffect, useRef, useState } from "react";
import { createAirportSearchService, MIN_QUERY_LENGTH } from "../airport-search/airport-search-service.js";

// The service is created once per module load. It owns the per-query cache and
// delegates to the OurAirports provider, so the UI never talks to the dataset
// directly and the provider can be swapped later without touching this file.
const airportSearch = createAirportSearchService();

/**
 * A reusable, accessible airport autocomplete (combobox).
 *
 * Guests can search by city, IATA code, airport name, or partial strings. The
 * search is case- and accent-insensitive, and exact IATA matches rank first.
 * Selecting an airport calls `onSelect(airport)` with the structured airport
 * object (not just the displayed text), so callers can persist the IATA code
 * and other identifiers.
 *
 * Accessibility: proper combobox/listbox semantics with `aria-expanded`,
 * `aria-controls`, `aria-activedescendant`, keyboard navigation (Arrow Up/Down,
 * Enter to select, Escape to close), and focus management.
 *
 * @param {Object} props
 * @param {string} props.label        visible label for the field
 * @param {string} props.placeholder  input placeholder
 * @param {string} props.hint         helper text under the field (optional)
 * @param {Object|null} props.value   the currently selected airport (optional)
 * @param {(airport: Object) => void} props.onSelect  called with the selected airport
 * @param {string} [props.id]         base id for the input + listbox (for a11y)
 * @param {boolean} [props.disabled]  disable the input
 * @param {string} [props.noResultsText]  message shown when a search has no hits
 */
export function AirportAutocomplete({
  label,
  placeholder,
  hint,
  value,
  onSelect,
  id = "airport",
  disabled = false,
  noResultsText = "No airports found.",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  const listboxId = `${id}-listbox`;
  const optionId = (index) => `${id}-option-${index}`;

  // When a `value` is provided externally (e.g. editing an existing flight),
  // reflect it in the input text.
  useEffect(() => {
    if (value) {
      setQuery(formatAirportLabel(value));
    }
  }, [value]);

  // Debounced search. Fires only after the user pauses typing and only when the
  // query is long enough. Uses a monotonic request id so a stale response never
  // overwrites a newer one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    setOpen(true);
    const myId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      const found = await airportSearch.search(q);
      if (myId !== requestIdRef.current) return;
      setResults(found);
      setActiveIndex(-1);
    }, 150);

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

  const handleSelect = useCallback(
    (airport) => {
      setQuery(formatAirportLabel(airport));
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      onSelect(airport);
    },
    [onSelect],
  );

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="airport-autocomplete" ref={inputRef}>
      <label className="airport-autocomplete__label" htmlFor={`${id}-input`}>
        {label}
      </label>
      <input
        id={`${id}-input`}
        type="text"
        className="airport-autocomplete__input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
        }}
        placeholder={placeholder}
        maxLength={120}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
      />

      {showDropdown && (
        <div
          className="airport-autocomplete__results"
          id={listboxId}
          role="listbox"
        >
          {results.length === 0 && (
            <div className="airport-autocomplete__status">{noResultsText}</div>
          )}
          {results.map((airport, index) => (
            <button
              type="button"
              key={airport.iata}
              id={optionId(index)}
              className={`airport-autocomplete__result${
                index === activeIndex ? " is-active" : ""
              }`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(airport)}
            >
              <span className="airport-autocomplete__result-main">
                {formatAirportLabel(airport)}
              </span>
              <span className="airport-autocomplete__result-sub">
                {airport.country}
              </span>
            </button>
          ))}
        </div>
      )}

      {hint && <span className="airport-autocomplete__hint">{hint}</span>}
    </div>
  );
}

/**
 * Format an airport for display, e.g. "Paris — Charles de Gaulle (CDG)".
 * @param {Object} airport
 * @returns {string}
 */
export function formatAirportLabel(airport) {
  if (!airport) return "";
  const parts = [];
  if (airport.city) parts.push(airport.city);
  if (airport.name) parts.push(airport.name);
  const label = parts.join(" — ");
  return airport.iata ? `${label} (${airport.iata})` : label;
}
