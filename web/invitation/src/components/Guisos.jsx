import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { StarVote } from "./StarVote.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { loadGuisoRanking, saveGuisoRanking } from "../guiso-rankings.js";
import { loadGuestCardVotes } from "../card-votes.js";

/**
 * "¿Qué guisos?" — help the couple choose the wedding menu.
 *
 * Two complementary ways to weigh in:
 *
 *  1. Star ratings — each dish is a card with a 1–5 star widget (reusing the
 *     existing StarVote component and the shared `card_votes` collection with
 *     `cardType="guiso"`). Guests can rate as many dishes as they like.
 *
 *  2. Ranked order — a guest can open the reorder panel and rank all 20 dishes
 *     from 1 (favourite) to 20. The top 9 are highlighted green ("in the
 *     menu"), the rest red ("out of the menu"). The ranking is saved to the
 *     `guiso_rankings/{guestId}` document.
 *
 * The reorder panel is pre-sorted by the guest's own star ratings (5-star
 * dishes first, then 4-star, etc., alphabetical within the same rating) so the
 * ranking starts from their preferences. Dishes can be reordered by dragging
 * (native HTML5 drag & drop) or with the up/down arrows. If the guest has not
 * manually reordered anything, the list re-sorts live whenever they change a
 * star rating.
 *
 * The cards reuse the Food section's swipeable carousel layout
 * (SwipeCardCarousel + flavour-card classes): one card per slide on mobile,
 * and a horizontal scroll-snap carousel showing ~3 cards per view on desktop.
 */
export function Guisos() {
  const { t, profile } = useApp();
  const guestId = profile?.guest?.id;
  const guisos = t.guisos || {};
  const dishes = guisos.dishes || [];

  // Reorder panel state.
  const [reordering, setReordering] = useState(false);
  const [order, setOrder] = useState([]); // array of dish names, index 0 = favourite
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Spice-note modal state (the "À propos du piquant" note opens in a modal
  // triggered by a floating action button instead of inline content).
  const [spiceOpen, setSpiceOpen] = useState(false);


  // The guest's own star ratings, keyed by dish name (used for the pre-order).
  const [myRatings, setMyRatings] = useState({});
  // Whether the guest has manually reordered (drag/arrows) since opening.
  const [manuallyReordered, setManuallyReordered] = useState(false);

  // Drag & drop state.
  const dragIndex = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);


  // Load the guest's existing ranking (if any) once the guest is known.
  useEffect(() => {
    let cancelled = false;
    if (!guestId) return undefined;
    loadGuisoRanking(guestId).then((ranking) => {
      if (cancelled) return;
      if (ranking && Array.isArray(ranking.ranking) && ranking.ranking.length) {
        setOrder(ranking.ranking);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  // Load the guest's own star ratings for the guisos so we can pre-sort.
  useEffect(() => {
    let cancelled = false;
    if (!guestId) return undefined;
    loadGuestCardVotes("guiso", guestId).then((votes) => {
      if (cancelled) return;
      const ratings = {};
      votes.forEach((v) => {
        if (v && v.cardKey) ratings[v.cardKey] = Number(v.rating) || 0;
      });
      setMyRatings(ratings);
    });
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  // Build a pre-sorted order from the guest's star ratings: higher rating
  // first, alphabetical within the same rating, unrated dishes last.
  const preSortedOrder = useMemo(() => {
    return [...dishes]
      .sort((a, b) => {
        const ra = myRatings[a.name] || 0;
        const rb = myRatings[b.name] || 0;
        if (rb !== ra) return rb - ra;
        return a.name.localeCompare(b.name);
      })
      .map((d) => d.name);
  }, [dishes, myRatings]);

  // Initialise the order to the pre-sorted list the first time the panel opens.
  const openReorder = useCallback(() => {
    setOrder((prev) => {
      if (prev && prev.length === dishes.length) return prev;
      return preSortedOrder;
    });
    setManuallyReordered(false);
    setSaved(false);
    setError("");
    setReordering(true);
  }, [dishes.length, preSortedOrder]);

  const closeReorder = useCallback(() => {
    setReordering(false);
    setError("");
  }, []);

  const move = useCallback(
    (index, delta) => {
      setOrder((prev) => {
        const next = [...prev];
        const target = index + delta;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      setManuallyReordered(true);
      setSaved(false);
    },
    [],
  );

  // Reorder by dragging: move the dragged item to the drop target's position.
  const handleDrop = useCallback(
    (targetIndex) => {
      const from = dragIndex.current;
      dragIndex.current = null;
      if (from === null || from === undefined || from === targetIndex) return;
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
      setManuallyReordered(true);
      setSaved(false);
    },
    [],
  );

  // When the guest changes a star rating, re-sort the open panel live — but
  // only if they haven't manually reordered anything yet.
  const handleVote = useCallback(
    ({ cardKey, rating }) => {
      setMyRatings((prev) => ({ ...prev, [cardKey]: rating }));
      if (reordering && !manuallyReordered) {
        setOrder((prev) => {
          if (prev.length !== dishes.length) return prev;
          const next = [...prev];
          next.sort((a, b) => {
            const ra = myRatings[a] || 0;
            const rb = myRatings[b] || 0;
            if (rb !== ra) return rb - ra;
            return a.localeCompare(b);
          });
          return next;
        });
      }
    },
    [reordering, manuallyReordered, dishes.length, myRatings],
  );

  const selected = useMemo(() => order.slice(0, 9), [order]);

  const handleSave = useCallback(async () => {
    if (!guestId) return;
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await saveGuisoRanking({ guestId, ranking: order, selected });
      setSaved(true);
    } catch (err) {
      console.warn("[Guisos] save ranking failed", err);
      setError(guisos.reorderError || "Could not save your ranking");
    } finally {
      setSaving(false);
    }
  }, [guestId, order, selected, saving, guisos.reorderError]);

  return (
    <section className="guisos-section section story-bg" id="guisos">
      <img
        className="guisos-section__portrait"
        src={cloudinaryImage("doña_carmen_cjsnz7", { width: 600 })}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <div className="experience-heading reveal">

        <p className="eyebrow">{guisos.eyebrow}</p>
        <h2>{guisos.title}</h2>
        <p className="accommodation-citation">{guisos.body}</p>
      </div>

      <SwipeCardCarousel className="guisos-grid" label={guisos.flavoursTitle}>
        {dishes.map((dish, index) => (
          <article className="flavour-card reveal" key={index}>
            {dish.cloudinaryId ? (
              <div className="flavour-card__media">
                <img
                  src={cloudinaryImage(`boda/${dish.cloudinaryId}`)}
                  alt={dish.name}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : (

              <div className="flavour-card__illustration" aria-hidden="true">
                <span>{guisos.flavourPlaceholder}</span>
              </div>
            )}
            <div>
              <h3>{dish.name}</h3>
              <p>{dish.note}</p>
            </div>
            <StarVote cardType="guiso" cardKey={dish.name} onVote={handleVote} />
          </article>
        ))}
      </SwipeCardCarousel>

      <p className="experience-note reveal">{guisos.note}</p>

      {/* Floating action button that opens the spice-note modal */}
      {guisos.spiceNote && guisos.spiceButton && (
        <button
          type="button"
          className="guisos-spice-fab"
          onClick={() => setSpiceOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="guisos-spice-fab__icon" aria-hidden="true">🌶️</span>
          <span className="guisos-spice-fab__label">{guisos.spiceButton}</span>
        </button>
      )}

      {/* Spice-note modal */}
      {spiceOpen && (
        <div
          className="guisos-spice-modal"
          role="dialog"
          aria-modal="true"
          aria-label={guisos.spiceButton}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSpiceOpen(false);
          }}
        >
          <div className="guisos-spice-modal__card">
            <button
              type="button"
              className="guisos-spice-modal__close"
              onClick={() => setSpiceOpen(false)}
              aria-label={guisos.spiceClose}
            >
              ×
            </button>
            <p className="guisos-spice-modal__text">{guisos.spiceNote}</p>
          </div>
        </div>
      )}


      {/* Reorder panel */}
      {guestId && (
        <div className="guisos-reorder reveal">
          {!reordering ? (
            <button
              type="button"
              className="guisos-reorder__toggle"
              onClick={openReorder}
            >
              {guisos.reorderButton}
            </button>
          ) : (
            <div className="guisos-reorder__panel">
              <h3 className="guisos-reorder__title">{guisos.reorderTitle}</h3>
              <p className="guisos-reorder__body">{guisos.reorderBody}</p>
              {guisos.reorderDrag && (
                <p className="guisos-reorder__drag">{guisos.reorderDrag}</p>
              )}
              <p className="guisos-reorder__hint">{guisos.reorderHint}</p>

              <ol className="guisos-reorder__list">
                {order.map((name, index) => {
                  const inMenu = index < 9;
                  return (
                    <li
                      key={name}
                      draggable
                      onDragStart={() => {
                        dragIndex.current = index;
                        setDraggingIndex(index);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDragLeave={() => {
                        setDragOverIndex((prev) => (prev === index ? null : prev));
                      }}
                      onDrop={() => {
                        handleDrop(index);
                        setDraggingIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        dragIndex.current = null;
                        setDraggingIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`guisos-reorder__item${inMenu ? " is-in-menu" : " is-out-menu"}${
                        draggingIndex === index ? " is-dragging" : ""
                      }${dragOverIndex === index ? " is-drag-over" : ""}`}
                    >

                      <span className="guisos-reorder__grip" aria-hidden="true">
                        ⠿
                      </span>
                      <span className="guisos-reorder__rank">{index + 1}</span>
                      <span className="guisos-reorder__name">{name}</span>
                      <span className="guisos-reorder__status">
                        {inMenu ? guisos.reorderInMenu : guisos.reorderNotInMenu}
                      </span>
                      <span className="guisos-reorder__controls">
                        <button
                          type="button"
                          aria-label={`${guisos.reorderUp}: ${name}`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`${guisos.reorderDown}: ${name}`}
                          disabled={index === order.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>

              {saved && (
                <p className="guisos-reorder__saved">{guisos.reorderSaved}</p>
              )}
              {error && <p className="guisos-reorder__error">{error}</p>}

              <div className="guisos-reorder__actions">
                <button
                  type="button"
                  className="guisos-reorder__cancel"
                  onClick={closeReorder}
                >
                  {guisos.reorderCancel}
                </button>
                <button
                  type="button"
                  className="guisos-reorder__save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "…" : guisos.reorderSave}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
