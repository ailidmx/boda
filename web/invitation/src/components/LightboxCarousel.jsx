import React, { useEffect, useCallback, useRef, useState } from "react";


/**
 * LightboxCarousel — a reusable, full-screen (or near full-screen) modal
 * carousel for browsing a set of images. It is intentionally generic so it can
 * be reused by any carousel in the invitation (venue gallery, couple photos,
 * cabin galleries, etc.).
 *
 * Props:
 *   - open: boolean — whether the modal is visible
 *   - onClose: () => void — called when the user closes the modal
 *   - images: Array<{ src: string, alt?: string, full?: string }> — the slides
 *   - startIndex: number — which slide to open on (default 0)
 *   - label: string — accessible label for the dialog
 */
export function LightboxCarousel({ open, onClose, images, startIndex = 0, label = "Galería" }) {
  const [index, setIndex] = useState(startIndex);
  // Direction of the last slide change ("next" | "prev") so the image can
  // animate in from the correct side, like swipeable cards.
  const [direction, setDirection] = useState("next");
  const count = images.length;
  // Track the horizontal start of a touch so we can detect a swipe gesture.
  const touchStartX = useRef(null);


  // Keep the active slide in sync when the modal opens with a new startIndex.
  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const goTo = useCallback(
    (next) => {
      setIndex((next + count) % count);
      setDirection(next > index ? "next" : "prev");
    },
    [count, index],
  );


  // Close on Escape, and lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goTo, index]);

  if (!open) return null;

  const current = images[index];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        // Swipe left → next, swipe right → previous. Ignore small movements
        // and vertical scrolls so the gesture feels natural.
        if (Math.abs(deltaX) < 50) return;
        if (deltaX < 0) goTo(index + 1);
        else goTo(index - 1);
      }}
    >
      <button
        className="lightbox-close"
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
      >
        ✕
      </button>

      <button
        className="lightbox-arrow lightbox-arrow--prev"
        type="button"
        aria-label="Anterior"
        onClick={(e) => {
          e.stopPropagation();
          goTo(index - 1);
        }}
      >
        ‹
      </button>

      <figure
        className={`lightbox-stage lightbox-stage--${direction}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.full || current.src}
          alt={current.alt || ""}
          decoding="async"
        />
        <figcaption>
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </figcaption>
      </figure>



      <button
        className="lightbox-arrow lightbox-arrow--next"
        type="button"
        aria-label="Siguiente"
        onClick={(e) => {
          e.stopPropagation();
          goTo(index + 1);
        }}
      >
        ›
      </button>

      <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
        {images.map((_, i) => (
          <button
            key={i}
            className="lightbox-dot"
            type="button"
            aria-label={`Imagen ${i + 1}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
