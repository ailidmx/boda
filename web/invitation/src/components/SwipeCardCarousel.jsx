import React, { Children, useCallback, useEffect, useRef, useState } from "react";

export function SwipeCardCarousel({ children, className, label }) {
  const items = Children.toArray(children);
  const viewportRef = useRef(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const viewport = viewportRef.current;
    const cards = viewport?.firstElementChild?.children;
    if (!viewport || !cards?.length) return;

    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    [...cards].forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });
    setActive(closest);
  }, []);

  useEffect(() => {
    syncActive();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(syncActive);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [syncActive]);

  const goTo = (index) => {
    const viewport = viewportRef.current;
    const card = viewport?.firstElementChild?.children[index];
    if (!viewport || !card) return;
    const left = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2;
    viewport.scrollTo({ left, behavior: "smooth" });
  };

  return (
    <div className="swipe-card-carousel" aria-label={label} aria-roledescription="carousel">
      <div
        className="swipe-card-carousel__viewport"
        ref={viewportRef}
        onScroll={syncActive}
      >
        <div className={`swipe-card-carousel__track ${className || ""}`}>
          {items}
        </div>
      </div>
      <div className="swipe-card-carousel__dots" aria-label={`${label} navigation`}>
        {items.map((_, index) => (
          <button
            type="button"
            className={`swipe-card-carousel__dot${index === active ? " is-active" : ""}`}
            aria-label={`${label} ${index + 1}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => goTo(index)}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
