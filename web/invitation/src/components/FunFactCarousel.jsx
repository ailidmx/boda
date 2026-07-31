import React, { useState } from "react";

const FUN_FACT_PAGE_SIZE = 5;

export function FunFactCarousel({ facts, id, label = "" }) {
  const [pageIndex, setPageIndex] = useState(0);

  if (!facts || !facts.length) return null;

  const pages = [];
  for (let i = 0; i < facts.length; i += FUN_FACT_PAGE_SIZE) {
    pages.push(facts.slice(i, i + FUN_FACT_PAGE_SIZE));
  }
  const pageCount = pages.length;
  const activePage = pages[pageIndex % pages.length];

  const goTo = (index) => {
    setPageIndex((index + pageCount) % pageCount);
  };

  return (
    <div
      className="fun-fact-list"
      data-fun-fact-carousel={id}
      aria-label={label || "Fun facts"}
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
              <li className="fun-fact-row" key={index}>
                <span className="fun-fact-row-index" aria-hidden="true">
                  {String(pageIndex * FUN_FACT_PAGE_SIZE + index + 1).padStart(2, "0")}
                </span>
                <p>{fact}</p>
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
