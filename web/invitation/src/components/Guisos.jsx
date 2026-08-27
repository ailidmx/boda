import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { StarVote } from "./StarVote.jsx";
import { SwipeCardCarousel } from "./SwipeCardCarousel.jsx";
import { LightboxCarousel } from "./LightboxCarousel.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { loadGuisoRanking, saveGuisoRanking } from "../guiso-rankings.js";
import { loadGuestCardVotes, loadAllCardVotes } from "../card-votes.js";


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
 *
 * The section is split into two parts:
 *
 *   • Dish cards — the main content, always visible as a normal section
 *     layout (no toggle button, no collapse) so the swipeable carousel keeps
 *     its full swipe gesture.
 *   • Reorder panel — always visible as a normal section layout (no toggle
 *     button, no collapse). Its container carries the `#guisos-order` anchor
 *     so the nav link scrolls straight to it.
 */


export function Guisos() {
  const { t, profile } = useApp();
  const guestId = profile?.guest?.id;
  const guisos = t.guisos || {};
  const dishes = guisos.dishes || [];

  const orderInitializedRef = useRef(false);



  // Reorder panel state.
  const [order, setOrder] = useState([]); // array of dish names, index 0 = favourite
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // The guest's own star ratings, keyed by dish name (used for the pre-order).
  const [myRatings, setMyRatings] = useState({});
  // Whether the guest has manually reordered (drag/arrows) since opening.
  const [manuallyReordered, setManuallyReordered] = useState(false);

  // Drag & drop state.
  const dragIndex = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Full-screen lightbox for the dish photos. `lightbox` holds { startIndex }
  // or null; clicking a dish card's photo opens it at that index.
  const [lightbox, setLightbox] = useState(null);


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

  // Load the general (aggregate) score for every dish across all guests so the
  // reorder panel can show each dish's average star rating and vote count.
  const [generalScores, setGeneralScores] = useState({});
  useEffect(() => {
    let cancelled = false;
    loadAllCardVotes("guiso").then((votes) => {
      if (cancelled) return;
      const scores = {};
      votes.forEach((v) => {
        if (!v || !v.cardKey) return;
        const rating = Number(v.rating) || 0;
        if (!rating) return;
        const entry = scores[v.cardKey] || { total: 0, count: 0 };
        entry.total += rating;
        entry.count += 1;
        scores[v.cardKey] = entry;
      });
      const computed = {};
      Object.keys(scores).forEach((key) => {
        const { total, count } = scores[key];
        computed[key] = {
          average: count ? total / count : 0,
          count,
        };
      });
      setGeneralScores(computed);
    });
    return () => {
      cancelled = true;
    };
  }, []);


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

  // The reorder panel is always visible, so initialise the order to the
  // pre-sorted list once the guest's ratings are known (unless a saved ranking
  // was already loaded).
  useEffect(() => {
    if (!guestId || orderInitializedRef.current) return;
    if (!preSortedOrder.length) return;
    orderInitializedRef.current = true;
    setOrder((prev) => {
      if (prev && prev.length === dishes.length) return prev;
      return preSortedOrder;
    });
    setManuallyReordered(false);
    setSaved(false);
    setError("");
  }, [guestId, preSortedOrder, dishes.length]);


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

  // Touch drag & drop (mobile) — the native HTML5 drag events don't fire on
  // touch devices, so we implement a pointer-based fallback. Dragging starts
  // from the grip handle; the finger position is tracked with elementFromPoint
  // to find which row is under the finger, then handleDrop() does the move.
  const touchDrag = useRef(null);

  const handleTouchStart = (index) => (e) => {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const grip = el && el.closest ? el.closest(".guisos-reorder__grip") : null;
    if (!grip) return; // only drag from the grip handle
    touchDrag.current = { index, currentIndex: index };
    dragIndex.current = index;
    setDraggingIndex(index);
  };

  const handleTouchMove = (e) => {
    if (!touchDrag.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const li = el && el.closest ? el.closest(".guisos-reorder__item") : null;
    if (li) {
      const targetIndex = Number(li.dataset.index);
      if (!Number.isNaN(targetIndex)) {
        setDragOverIndex(targetIndex);
        touchDrag.current.currentIndex = targetIndex;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchDrag.current) return;
    const { currentIndex } = touchDrag.current;
    touchDrag.current = null;
    handleDrop(currentIndex);
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  // When the guest changes a star rating, re-sort the always-visible reorder
  // panel live — but only if they haven't manually reordered anything yet.
  const handleVote = useCallback(
    ({ cardKey, rating }) => {
      setMyRatings((prev) => ({ ...prev, [cardKey]: rating }));
      if (!manuallyReordered) {
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
    [manuallyReordered, dishes.length, myRatings],
  );


  const selected = useMemo(() => order.slice(0, 9), [order]);

  // Lookup dish by name so each reorder row can show its guisado photo as a
  // legibility-overlaid background (mirrors the dish cards' photo treatment).
  const dishByKey = useMemo(() => {
    const map = {};
    dishes.forEach((d) => {
      if (d && d.name) map[d.name] = d;
    });
    return map;
  }, [dishes]);

  // Slides for the full-screen lightbox: one per dish that has a photo, so
  // clicking a dish card's photo opens the shared swipeable LightboxCarousel.
  const guisoSlides = useMemo(
    () =>
      dishes
        .filter((d) => d && d.cloudinaryId)
        .map((d) => ({
          src: cloudinaryImage(`boda/${d.cloudinaryId}`),
          alt: d.name,
        })),
    [dishes],
  );


  // Format a numeric score for display (e.g. 3.4). Whole numbers are shown
  // without a trailing decimal so "Ton vote" reads as a clean integer.
  const formatScore = (value) => {
    const n = Number(value) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  };


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

      {/* Important notice about the chilli — shown inline before the dish cards
          on every screen so guests know most stews are not spicy. */}
      {guisos.spiceNote && (
        <p className="guisos-spice-note reveal" role="note">
          {guisos.spiceNote}
        </p>
      )}

      {/* Dish cards — the main content, always visible as a normal section
          layout (no toggle button, no collapse) so the swipeable carousel
          keeps its full swipe gesture. */}
      <div id="guisos-dishes-body" className="guisos-subsection__body">
        <SwipeCardCarousel className="guisos-grid" label={guisos.flavoursTitle}>
          {dishes.map((dish, index) => (
            <article className="flavour-card guisos-card reveal" key={index}>
              <div className="guisos-card__media">
                {dish.cloudinaryId ? (
                  <button
                    type="button"
                    className="guisos-card__photo"
                    aria-label={`${guisos.openPhoto || "Ver foto"}: ${dish.name}`}
                    onClick={() => setLightbox({ startIndex: index })}
                  >
                    <img
                      src={cloudinaryImage(`boda/${dish.cloudinaryId}`)}
                      alt={dish.name}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ) : (
                  <div
                    className="guisos-card__photo guisos-card__photo--placeholder"
                    aria-hidden="true"
                  />
                )}
                <h3 className="guisos-card__title">{dish.name}</h3>
              </div>
              <div className="guisos-card__body">
                {dish.note && <p>{dish.note}</p>}
                <StarVote cardType="guiso" cardKey={dish.name} onVote={handleVote} />
              </div>
            </article>
          ))}

        </SwipeCardCarousel>

        <p className="experience-note reveal">{guisos.note}</p>
      </div>


      {/* Anchor subsection — a "continue" link that scrolls to the reorder
          panel below. The reorder panel is always visible (no toggle button),
          so this link is the entry point to it. */}
      <nav className="section-nav guisos-section-nav" aria-label={guisos.reorderTitle}>
        <a className="section-nav-link" href="#guisos-order">
          <span>{guisos.reorderTitle}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>


      {/* Subsection 2 — reorder panel. Always visible as a normal section
          layout (no toggle button, no collapse). The `#guisos-order` anchor
          sits on the container so the nav link scrolls here. */}
      {guestId && (
        <div className="guisos-reorder" id="guisos-order">
          <h3 className="guisos-reorder__title">{guisos.reorderTitle}</h3>
          <p className="guisos-reorder__body">{guisos.reorderBody}</p>
          {guisos.reorderDrag && (
            <p className="guisos-reorder__drag">{guisos.reorderDrag}</p>
          )}
          <p className="guisos-reorder__hint">{guisos.reorderHint}</p>

          <ol
            className="guisos-reorder__list"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {order.map((name, index) => {
              const inMenu = index < 9;
              const dish = dishByKey[name];
              const bgImage = dish?.cloudinaryId
                ? `url(${cloudinaryImage(`boda/${dish.cloudinaryId}`)})`
                : undefined;
              return (
                <li
                  key={name}
                  data-index={index}
                  draggable
                  style={bgImage ? { backgroundImage: bgImage } : undefined}

                  onTouchStart={handleTouchStart(index)}
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
                  <span className="guisos-reorder__content">
                    <span className="guisos-reorder__name">{name}</span>
                    <span className="guisos-reorder__scores">
                      <span className="guisos-reorder__score guisos-reorder__score--mine">
                        <span className="guisos-reorder__score-label">
                          {guisos.reorderMyScore}
                        </span>
                        <span className="guisos-reorder__score-value">
                          {formatScore(myRatings[name] || 0)}
                        </span>
                      </span>
                      <span className="guisos-reorder__score guisos-reorder__score--general">
                        <span className="guisos-reorder__score-label">
                          {guisos.reorderGeneralScore}
                        </span>
                        <span className="guisos-reorder__score-value">
                          {formatScore(generalScores[name]?.average || 0)}
                        </span>
                        <span className="guisos-reorder__count">
                          {generalScores[name]?.count
                            ? `(${generalScores[name].count})`
                            : ""}
                        </span>
                      </span>
                    </span>
                    <span className="guisos-reorder__status">
                      {inMenu ? guisos.reorderInMenu : guisos.reorderNotInMenu}
                    </span>
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
              className="guisos-reorder__save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "…" : guisos.reorderSave}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen swipeable lightbox for the dish photos. The start index
          is resolved against the filtered `guisoSlides` array (dishes without
          a photo are skipped), so the opened photo matches the clicked card. */}
      {lightbox && guisoSlides.length > 0 && (
        <LightboxCarousel
          open
          images={guisoSlides}
          startIndex={Math.min(
            lightbox.startIndex,
            guisoSlides.length - 1,
          )}
          label={guisos.flavoursTitle}
          onClose={() => setLightbox(null)}
        />
      )}

    </section>
  );
}
