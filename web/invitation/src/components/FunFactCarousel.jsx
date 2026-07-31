import React, { useEffect, useRef, useState } from "react";

// One fact per slide so each card stays thin and focused.
const FUN_FACT_PAGE_SIZE = 1;

// How long each slide stays before auto-advancing (ms).
const AUTOPLAY_INTERVAL = 6000;

/**
 * Normalise a fact entry into { title, text, avatar }.
 * Accepts either a plain string or an object { title, text, avatar }.
 */
function normalizeFact(fact) {
  if (typeof fact === "string") return { title: "", text: fact, avatar: null };
  return {
    title: fact?.title || "",
    text: fact?.text || "",
    avatar: fact?.avatar || null,
  };
}


export function FunFactCarousel({ facts, id, label = "" }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  if (!facts || !facts.length) return null;

  const normalized = facts.map(normalizeFact);
  const pages = [];
  for (let i = 0; i < normalized.length; i += FUN_FACT_PAGE_SIZE) {
    pages.push(normalized.slice(i, i + FUN_FACT_PAGE_SIZE));
  }
  const pageCount = pages.length;
  const activePage = pages[pageIndex % pages.length];

  const goTo = (index) => {
    setPageIndex((index + pageCount) % pageCount);
  };

  // Autoplay: advance every AUTOPLAY_INTERVAL ms unless paused. The timer is
  // reset whenever the user navigates manually (pageIndex changes) so it never
  // drifts or double-fires.
  useEffect(() => {
    if (paused || pageCount <= 1) return undefined;
    timerRef.current = window.setTimeout(() => {
      setPageIndex((prev) => (prev + 1) % pageCount);
    }, AUTOPLAY_INTERVAL);
    return () => window.clearTimeout(timerRef.current);
  }, [pageIndex, paused, pageCount]);

  return (
    <div
      className="fun-fact-list"
      data-fun-fact-carousel={id}
      aria-label={label || "Fun facts"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {label && (
        <>
          <div className="fun-fact-list-heading">
            <span className="fun-fact-label" aria-hidden="true">
              {label}
            </span>
          </div>
          <hr className="fun-fact-divider" aria-hidden="true" />
        </>
      )}
      <div className="fun-fact-viewport">
        <div className="fun-fact-track" data-fun-fact-track={id}>
          <ol
            className="fun-fact-rows"
            data-fun-fact-page={id}
            aria-current="true"
          >
            {activePage.map((fact, index) => (
              <li
                className={`fun-fact-row${fact.avatar ? " fun-fact-row--avatar" : ""}`}
                key={index}
              >
                {fact.avatar && (
                  <span className="fun-fact-avatar" aria-hidden="true">
                    <img
                      src={fact.avatar}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                )}
                <div className="fun-fact-row-body">
                  <span className="fun-fact-row-index" aria-hidden="true">
                    {String(pageIndex * FUN_FACT_PAGE_SIZE + index + 1).padStart(2, "0")}
                  </span>
                  {fact.title && <h3 className="fun-fact-row-title">{fact.title}</h3>}
                  <p>{fact.text}</p>
                </div>
              </li>
            ))}

          </ol>
        </div>
      </div>
      {pageCount > 1 && (
        <div className="fun-fact-controls">
          <button
            className="fun-fact-arrow fun-fact-arrow--prev"
            type="button"
            data-fun-fact-prev={id}
            aria-label="Previous"
            onClick={() => goTo(pageIndex - 1)}
          >
            ‹
          </button>
          <div className="fun-fact-dots" data-fun-fact-dots={id}>
            {pages.map((_, index) => (
              <button
                key={index}
                className="fun-fact-dot"
                type="button"
                data-fun-fact-dot={id}
                data-index={index}
                aria-label={`Page ${index + 1}`}
                aria-current={index === pageIndex}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
          <button
            className="fun-fact-arrow fun-fact-arrow--next"
            type="button"
            data-fun-fact-next={id}
            aria-label="Next"
            onClick={() => goTo(pageIndex + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
